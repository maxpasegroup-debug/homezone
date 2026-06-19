import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forbidden, handleApiError, notFound, ok, rateLimited, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "profiles:follow", session.user.id),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const profile = await getOrCreateProfile(session.user);

    if (profile.id === id) {
      return forbidden("You cannot follow your own profile");
    }

    const target = await db.profile.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!target) {
      return notFound("Profile not found");
    }

    if (target.role !== "BROKER" && target.role !== "BUILDER") {
      return forbidden("Only broker and builder profiles can be followed");
    }

    const existing = await db.profileFollow.findUnique({
      where: {
        followerId_targetId: {
          followerId: profile.id,
          targetId: target.id
        }
      }
    });

    if (existing) {
      await db.profileFollow.delete({
        where: {
          followerId_targetId: {
            followerId: profile.id,
            targetId: target.id
          }
        }
      });
    } else {
      await db.profileFollow.create({
        data: {
          followerId: profile.id,
          targetId: target.id
        }
      });
    }

    await auditLog({
      action: existing
        ? target.role === "BROKER"
          ? "UNFOLLOWED_BROKER"
          : "UNFOLLOWED_BUILDER"
        : target.role === "BROKER"
          ? "FOLLOWED_BROKER"
          : "FOLLOWED_BUILDER",
      actorId: profile.id,
      entityId: target.id,
      entityType: "profile",
      metadata: {
        role: target.role
      }
    });

    const followersCount = await db.profileFollow.count({
      where: {
        targetId: target.id
      }
    });

    return ok({
      followersCount,
      following: !existing
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/profiles/[id]/follow"
    });
  }
}
