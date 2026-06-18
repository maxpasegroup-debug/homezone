import { auth } from "@/auth";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forbidden, handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { moderationSchema } from "@/lib/api/validation";
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

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);

    if (!isAdminRole(profile.role)) {
      return forbidden();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "admin:reels:moderate", session.user.id),
      limit: 60,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const parsed = await parseJson(request, moderationSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const reel = await db.propertyReel.update({
      where: { id },
      data: {
        status: parsed.data.status
      }
    });

    await db.auditLog.create({
      data: {
        actorId: profile.id,
        action: `reel_${parsed.data.status.toLowerCase()}`,
        entityType: "reel",
        entityId: id,
        metadata: {
          note: parsed.data.note,
          status: parsed.data.status
        }
      }
    });

    return ok({ reel });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/reels/[id]/moderate"
    });
  }
}
