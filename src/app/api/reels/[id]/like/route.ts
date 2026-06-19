import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, notFound, ok, rateLimited, unauthorized } from "@/lib/api/response";
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
      key: rateLimitKey(request, "reels:like", session.user.id),
      limit: 60,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const profile = await getOrCreateProfile(session.user);
    const reel = await db.propertyReel.findUnique({
      where: {
        id
      },
      select: {
        id: true
      }
    });

    if (!reel) {
      return notFound("Reel not found");
    }

    const existing = await db.reelLike.findUnique({
      where: {
        userId_reelId: {
          reelId: id,
          userId: profile.id
        }
      }
    });

    if (existing) {
      await db.$transaction([
        db.reelLike.delete({
          where: {
            userId_reelId: {
              reelId: id,
              userId: profile.id
            }
          }
        }),
        db.propertyReel.updateMany({
          where: {
            id,
            likesCount: {
              gt: 0
            }
          },
          data: {
            likesCount: {
              decrement: 1
            }
          }
        })
      ]);

      await auditLog({
        action: "REEL_UNLIKED",
        actorId: profile.id,
        entityId: id,
        entityType: "reel"
      });
    } else {
      await db.$transaction([
        db.reelLike.create({
          data: {
            reelId: id,
            userId: profile.id
          }
        }),
        db.propertyReel.update({
          where: {
            id
          },
          data: {
            likesCount: {
              increment: 1
            }
          }
        })
      ]);

      await auditLog({
        action: "REEL_LIKED",
        actorId: profile.id,
        entityId: id,
        entityType: "reel"
      });
    }

    const updated = await db.propertyReel.findUnique({
      where: {
        id
      },
      select: {
        likesCount: true
      }
    });

    return ok({
      liked: !existing,
      likesCount: updated?.likesCount ?? 0
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reels/[id]/like"
    });
  }
}
