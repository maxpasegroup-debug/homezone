import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { profileUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { toPrismaRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const profile = await getOrCreateProfile(session.user);

  return ok({ profile });
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "profile:update", session.user.id),
      limit: 20,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, profileUpdateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const phoneChanged = Boolean(parsed.data.phone && parsed.data.phone !== profile.phone);
    const updated = await db.profile.update({
      where: {
        id: profile.id
      },
      data: {
        city: parsed.data.city,
        phone: parsed.data.phone || undefined,
        role: toPrismaRole(parsed.data.role),
        whatsappVerified: phoneChanged ? false : profile.whatsappVerified
      }
    });

    await auditLog({
      action: "profile_updated",
      actorId: profile.id,
      entityId: profile.id,
      entityType: "profile",
      metadata: {
        phoneChanged,
        role: updated.role
      }
    });

    return ok({ profile: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/profile"
    });
  }
}
