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
      key: rateLimitKey(request, "reels:save", session.user.id),
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

    const existing = await db.savedReel.findUnique({
      where: {
        userId_reelId: {
          reelId: id,
          userId: profile.id
        }
      }
    });

    if (existing) {
      await db.$transaction([
        db.savedReel.delete({
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
            savesCount: {
              gt: 0
            }
          },
          data: {
            savesCount: {
              decrement: 1
            }
          }
        })
      ]);

      await auditLog({
        action: "REEL_UNSAVED",
        actorId: profile.id,
        entityId: id,
        entityType: "reel"
      });
    } else {
      await db.$transaction([
        db.savedReel.create({
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
            savesCount: {
              increment: 1
            }
          }
        })
      ]);

      await auditLog({
        action: "REEL_SAVED",
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
        savesCount: true
      }
    });

    return ok({
      saved: !existing,
      savesCount: updated?.savesCount ?? 0
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reels/[id]/save"
    });
  }
}
