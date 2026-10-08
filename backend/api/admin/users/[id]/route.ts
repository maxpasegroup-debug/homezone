import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { adminProfileUpdateSchema } from "@/lib/api/validation";
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
    const parsed = await parseJson(request, adminProfileUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.profile.findUnique({ where: { id } });
    if (!existing) return notFound("Profile not found");

    const profile = await db.profile.update({
      data: {
        city: parsed.data.city,
        country: parsed.data.country,
        role: parsed.data.role,
        verificationNotes: parsed.data.note,
        verificationStatus: parsed.data.verificationStatus,
        verifiedAt: parsed.data.verificationStatus === "VERIFIED" ? new Date() : undefined,
        verifiedBy: parsed.data.verificationStatus ? admin.id : undefined
      },
      where: { id }
    });

    await auditLog({
      action: "ADMIN_PROFILE_UPDATED",
      actorId: admin.id,
      entityId: id,
      entityType: "profile",
      metadata: {
        note: parsed.data.note,
        role: parsed.data.role,
        verificationStatus: parsed.data.verificationStatus
      }
    });

    return ok({ profile });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/users/[id]"
    });
  }
}
