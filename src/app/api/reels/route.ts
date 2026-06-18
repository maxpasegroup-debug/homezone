import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forbidden, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { reelCreateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export async function GET() {
  const reels = await db.propertyReel.findMany({
    where: {
      status: "PUBLISHED"
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });

  return ok({ reels });
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
