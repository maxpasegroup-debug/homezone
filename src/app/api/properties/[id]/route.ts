import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import {
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
    const nextStatus = data.status;

    if (
      nextStatus === "PUBLISHED" &&
      ownership.property.verificationStatus !== "VERIFIED" &&
      !isAdminRole(ownership.profile.role)
    ) {
      return forbidden("Listing must be verified before publishing.");
    }

    const updated = await db.property.update({
      data: {
        ...data,
        publishedAt: nextStatus === "PUBLISHED" ? new Date() : undefined,
        verificationStatus:
          nextStatus === "PENDING_REVIEW"
            ? "UNDER_REVIEW"
            : nextStatus === "DRAFT"
              ? "PENDING"
              : undefined
      },
      where: {
        id
      }
    });

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

    await db.property.delete({
      where: {
        id
      }
    });

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
