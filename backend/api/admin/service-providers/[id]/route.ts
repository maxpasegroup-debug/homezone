import { z } from "zod";
import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

const moderationSchema = z.object({
  note: z.string().max(1000).optional(),
  status: z.enum(["VERIFIED", "REJECTED", "SUSPENDED"])
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const admin = await getOrCreateProfile(session.user);
    if (!isAdminRole(admin.role)) return forbidden();
    const { id } = await context.params;
    const parsed = await parseJson(request, moderationSchema);
    if ("error" in parsed) return parsed.error;
    const provider = await db.serviceProvider.update({
      data: {
        suspended: parsed.data.status === "SUSPENDED",
        verified: parsed.data.status === "VERIFIED"
      },
      where: { id }
    });
    await db.auditLog.create({
      data: {
        action: "service_provider_moderated",
        actorId: admin.id,
        entityId: id,
        entityType: "service_provider",
        metadata: { note: parsed.data.note, status: parsed.data.status }
      }
    });
    return ok({ provider });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/admin/service-providers/[id]" });
  }
}
