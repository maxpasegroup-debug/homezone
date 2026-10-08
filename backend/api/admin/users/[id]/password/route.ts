import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { adminPasswordResetSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { hashPassword } from "@/lib/auth/password";
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
    const parsed = await parseJson(request, adminPasswordResetSchema);
    if ("error" in parsed) return parsed.error;

    const profile = await db.profile.findUnique({
      include: {
        user: true
      },
      where: {
        id
      }
    });
    if (!profile) return notFound("Profile not found");

    const passwordHash = await hashPassword(parsed.data.password);
    await db.passwordCredential.upsert({
      create: {
        passwordHash,
        userId: profile.userId
      },
      update: {
        passwordHash
      },
      where: {
        userId: profile.userId
      }
    });

    await auditLog({
      action: "ADMIN_PASSWORD_RESET",
      actorId: admin.id,
      entityId: profile.id,
      entityType: "profile",
      metadata: {
        email: profile.user.email,
        reason: parsed.data.reason
      }
    });

    return ok({
      message: "Password reset successfully."
    });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/users/[id]/password"
    });
  }
}
