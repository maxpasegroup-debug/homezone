import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { adminReportActionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const admin = await getOrCreateProfile(session.user);
    if (!isAdminRole(admin.role)) return forbidden();

    const { id } = await context.params;
    const parsed = await parseJson(request, adminReportActionSchema);
    if ("error" in parsed) return parsed.error;

    const report = await db.auditLog.findUnique({ where: { id } });
    if (!report || report.action !== "user_report") return notFound("Report not found");

    const updated = await db.auditLog.update({
      data: {
        metadata: {
          ...(typeof report.metadata === "object" && report.metadata ? report.metadata : {}),
          adminAction: parsed.data.action,
          adminNote: parsed.data.note,
          resolvedAt: new Date().toISOString(),
          resolvedBy: admin.id
        }
      },
      where: { id }
    });

    await auditLog({
      action: `REPORT_${parsed.data.action}`,
      actorId: admin.id,
      entityId: id,
      entityType: "report",
      metadata: {
        note: parsed.data.note,
        reportEntityId: report.entityId,
        reportEntityType: report.entityType
      }
    });

    return ok({ report: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/reports/[id]"
    });
  }
}
