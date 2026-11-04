import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import {
  apiError,
  forbidden,
  handleApiError,
  notFound,
  ok,
  parseJson,
  rateLimited,
  unauthorized
} from "@/lib/api/response";
import { propertyUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { updatePublication } from "@/lib/properties/publication";
import { notifyPublicPropertyChange } from "@/lib/properties/realtime";
import { propertyPhotoTransitionError } from "@/lib/properties/photos";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function requireOwnedProperty(id: string, user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const profile = await getOrCreateProfile(user);
  if(profile.verificationStatus==="SUSPENDED")return {error:forbidden()} as const;
  const property = await db.property.findUnique({
    where: {
      id
    }
  });

  if (!property) {
    return {
      error: notFound("Property not found")
    } as const;
  }

  if (property.ownerId !== profile.id && !isAdminRole(profile.role)) {
    return {
      error: forbidden()
    } as const;
  }

  return {
    profile,
    property
  } as const;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "properties:update", session.user.id),
      limit: 40,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const parsed = await parseJson(request, propertyUpdateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const ownership = await requireOwnedProperty(id, session.user);

    if ("error" in ownership) {
      return ownership.error;
    }

    const data = parsed.data;
    const result = await db.$transaction(async tx => {
      // Match media mutation lock order and decide against the current rows,
      // rather than a stale ownership/moderation snapshot from before the write.
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${ownership.profile.id} FOR UPDATE`;
      const currentProfile = await tx.profile.findUnique({
        where: { id: ownership.profile.id }, select: { role: true, verificationStatus: true }
      });
      if (!currentProfile || currentProfile.verificationStatus === "SUSPENDED" ||
          currentProfile.role !== ownership.profile.role) {
        return { error: forbidden("Listing account changed. Refresh before continuing.") } as const;
      }
      await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${id} FOR UPDATE`;
      const currentProperty = await tx.property.findUnique({
        where: { id },
        select: { id: true, ownerId: true, status: true, verificationStatus: true, publishedAt: true,
          coverImageUrl: true, mediaUrls: true }
      });
      if (!currentProperty) return { error: notFound("Property not found") } as const;
      const admin = isAdminRole(currentProfile.role);
      if (!admin && currentProperty.ownerId !== ownership.profile.id) {
        return { error: forbidden() } as const;
      }
      const publication = updatePublication(currentProfile.role, currentProperty, data.status, new Date());
      if ("error" in publication) return { error: forbidden(publication.error) } as const;
      const photoError = propertyPhotoTransitionError(currentProperty, {
        status: data.status ?? currentProperty.status,
        coverImageUrl: data.coverImageUrl ?? currentProperty.coverImageUrl,
        mediaUrls: data.mediaUrls ?? currentProperty.mediaUrls
      });
      if (photoError) return { error: apiError(photoError, 400) } as const;

      const property = await tx.property.update({
        data: { ...data, ...publication.data },
        where: { id, ...(!admin ? { ownerId: ownership.profile.id } : {}) }
      });
      await notifyPublicPropertyChange(tx, currentProperty, property);
      return { property } as const;
    });
    if ("error" in result) return result.error;
    const updated = result.property;

    await auditLog({
      action: "property_updated",
      actorId: ownership.profile.id,
      entityId: id,
      entityType: "property",
      metadata: {
        status: updated.status
      }
    });

    return ok({ property: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/properties/[id]"
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await context.params;
    const ownership = await requireOwnedProperty(id, session.user);

    if ("error" in ownership) {
      return ownership.error;
    }

    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${ownership.profile.id} FOR UPDATE`;
      const actor = await tx.profile.findUnique({
        where: { id: ownership.profile.id }, select: { role: true, verificationStatus: true }
      });
      if (!actor || actor.verificationStatus === "SUSPENDED" || actor.role !== ownership.profile.role) {
        return { error: forbidden("Listing account changed. Refresh before continuing.") } as const;
      }
      await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${id} FOR UPDATE`;
      const property = await tx.property.findUnique({
        where: { id }, select: { id: true, ownerId: true, status: true }
      });
      if (!property) return { error: notFound("Property not found") } as const;
      const admin = isAdminRole(actor.role);
      if (!admin && property.ownerId !== ownership.profile.id) return { error: forbidden() } as const;
      await tx.property.delete({ where: { id, ...(!admin ? { ownerId: ownership.profile.id } : {}) } });
      await notifyPublicPropertyChange(tx, property, null);
      return { deleted: true } as const;
    });
    if ("error" in result) return result.error;

    await auditLog({
      action: "property_deleted",
      actorId: ownership.profile.id,
      entityId: id,
      entityType: "property"
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, {
      route: "DELETE /api/properties/[id]"
    });
  }
}
