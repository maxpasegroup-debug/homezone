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

    const updated = await db.property.update({
      where: {
        id
      },
      data:
        parsed.data.mediaType === "video"
          ? {
              videoUrl: parsed.data.mediaUrl
            }
          : {
              mediaUrls: {
                push: parsed.data.mediaUrl
              }
            }
    });

    await auditLog({
      action: "property_media_attached",
      actorId: profile.id,
      entityId: id,
      entityType: "property",
      metadata: {
        mediaType: parsed.data.mediaType
      }
    });

    return ok({ property: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/properties/[id]/media"
    });
  }
}
