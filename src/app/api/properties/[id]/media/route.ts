import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forbidden, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { propertyMediaSchema } from "@/lib/api/validation";
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

    const limit = checkRateLimit({
      key: rateLimitKey(request, "properties:media", session.user.id),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const parsed = await parseJson(request, propertyMediaSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const property = await db.property.findUnique({
      where: {
        id
      }
    });

    if (!property) {
      return notFound("Property not found");
    }

    if (property.ownerId !== profile.id && !isAdminRole(profile.role)) {
      return forbidden();
    }

    const action = parsed.data;
    const nextData =
      action.action === "add"
        ? action.mediaType === "video"
          ? {
              videoUrl: action.mediaUrl
            }
          : action.mediaType === "cover"
            ? {
                coverImageUrl: action.mediaUrl,
                mediaUrls: property.mediaUrls.includes(action.mediaUrl)
                  ? property.mediaUrls
                  : [action.mediaUrl, ...property.mediaUrls]
              }
            : {
                mediaUrls: property.mediaUrls.includes(action.mediaUrl)
                  ? property.mediaUrls
                  : [...property.mediaUrls, action.mediaUrl]
              }
        : action.action === "remove"
          ? {
              coverImageUrl:
                property.coverImageUrl === action.mediaUrl ? null : property.coverImageUrl,
              mediaUrls: property.mediaUrls.filter((url) => url !== action.mediaUrl)
            }
          : action.action === "reorder"
            ? {
                mediaUrls: action.mediaUrls.filter((url) => property.mediaUrls.includes(url))
              }
            : action.action === "replace-video"
              ? {
                  videoUrl: action.videoUrl ?? null
                }
              : {
                  virtualTourUrl: action.virtualTourUrl ?? null
                };

    const updated = await db.property.update({
      where: {
        id
      },
      data: nextData
    });

    await auditLog({
      action: "property_media_attached",
      actorId: profile.id,
      entityId: id,
      entityType: "property",
      metadata: {
        action: action.action
      }
    });

    return ok({ property: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/properties/[id]/media"
    });
  }
}
