import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { adminReportActionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { updateReportStatus } from "@/lib/platform/reports";

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

    const report = await db.report.findUnique({ where: { id } });
    if (!report) return notFound("Report not found");

    const updated = await updateReportStatus({
      adminId: admin.id,
      note: parsed.data.note,
      reportId: id,
      status: parsed.data.action
    });

    return ok({ report: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/reports/[id]"
    });
  }
}
