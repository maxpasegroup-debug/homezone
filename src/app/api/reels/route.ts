import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
<<<<<<< HEAD
import { forbidden, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized, validationError } from "@/lib/api/response";
import { reelCreateSchema, reelFeedSchema } from "@/lib/api/validation";
=======
import { forbidden, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { reelCreateSchema } from "@/lib/api/validation";
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = reelFeedSchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    take: url.searchParams.get("take") ?? undefined
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const reels = await db.propertyReel.findMany({
    where: {
      status: "PUBLISHED"
    },
    include: {
      property: {
        select: {
          city: true,
          id: true,
          locality: true,
          owner: {
            select: {
              fullName: true,
              id: true,
              role: true,
              verificationStatus: true
            }
          },
          title: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    ...(parsed.data.cursor
      ? {
          cursor: {
            id: parsed.data.cursor
          },
          skip: 1
        }
      : {}),
    take: parsed.data.take + 1
  });

<<<<<<< HEAD
  const hasMore = reels.length > parsed.data.take;
  const visibleReels = hasMore ? reels.slice(0, parsed.data.take) : reels;
  const nextCursor = hasMore ? visibleReels.at(-1)?.id ?? null : null;

  return ok({
    nextCursor,
    reels: visibleReels
  });
=======
  return ok({ reels });
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "reels:create", session.user.id),
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, reelCreateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);

    if (parsed.data.propertyId) {
      const property = await db.property.findUnique({
        where: {
          id: parsed.data.propertyId
        }
      });

      if (!property) {
        return notFound("Property not found");
      }

      if (property.ownerId !== profile.id && !isAdminRole(profile.role)) {
        return forbidden();
      }
    }

    const reel = await db.propertyReel.create({
      data: {
        propertyId: parsed.data.propertyId,
        ownerId: profile.id,
        title: parsed.data.title,
        videoUrl: parsed.data.videoUrl,
        thumbnailUrl: parsed.data.thumbnailUrl,
        status: "PENDING_REVIEW"
      }
    });

    await auditLog({
      action: "reel_created",
      actorId: profile.id,
      entityId: reel.id,
      entityType: "reel",
      metadata: {
        propertyId: parsed.data.propertyId
      }
    });

    return ok({ reel });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reels"
    });
  }
}
