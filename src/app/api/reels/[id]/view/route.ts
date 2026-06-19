import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, notFound, ok, rateLimited } from "@/lib/api/response";
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
    const limit = checkRateLimit({
      key: rateLimitKey(request, "reels:view", session?.user?.id),
      limit: 120,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const reel = await db.propertyReel.update({
      where: {
        id
      },
      data: {
        viewsCount: {
          increment: 1
        }
      },
      select: {
        id: true,
        viewsCount: true
      }
    }).catch(() => null);

    if (!reel) {
      return notFound("Reel not found");
    }

    const profile = session?.user ? await getOrCreateProfile(session.user) : null;

    await auditLog({
      action: "REEL_VIEWED",
      actorId: profile?.id,
      entityId: id,
      entityType: "reel"
    });

    return ok({
      viewsCount: reel.viewsCount
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reels/[id]/view"
    });
  }
}
