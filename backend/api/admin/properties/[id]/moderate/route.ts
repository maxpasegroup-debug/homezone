import { auth } from "@/auth";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, forbidden, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { moderationSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { propertyPhotoTransitionError } from "@/lib/properties/photos";
import { notifyPublicPropertyChange } from "@/lib/properties/realtime";

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

    const profile = await getOrCreateProfile(session.user);

    if (!isAdminRole(profile.role)) {
      return forbidden();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "admin:properties:moderate", session.user.id),
      limit: 60,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const parsed = await parseJson(request, moderationSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${profile.id} FOR UPDATE`;
      const actor = await tx.profile.findUnique({
        where: { id: profile.id }, select: { role: true, verificationStatus: true }
      });
      if (!actor || !isAdminRole(actor.role) || actor.verificationStatus === "SUSPENDED") {
        return { error: forbidden() } as const;
      }
      await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${id} FOR UPDATE`;
      const current = await tx.property.findUnique({
        where: { id }, select: { status: true, coverImageUrl: true, mediaUrls: true }
      });
      if (!current) return { error: notFound("Property not found") } as const;
      const nextStatus = parsed.data.status === "NEEDS_CHANGES" ? "REJECTED" : parsed.data.status;
      const photoError = propertyPhotoTransitionError(current, { ...current, status: nextStatus });
      if (photoError) return { error: apiError(photoError, 400) } as const;
      const property = await tx.property.update({
        where: { id },
        data: {
          status: nextStatus,
          verificationNotes: parsed.data.note,
          verificationStatus:
            parsed.data.status === "PUBLISHED"
              ? "VERIFIED"
              : parsed.data.status === "NEEDS_CHANGES"
                ? "NEEDS_CHANGES"
                : parsed.data.status === "REJECTED"
                  ? "REJECTED"
                  : undefined,
          verified: parsed.data.status === "PUBLISHED",
          publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : undefined
        }
      });
      await notifyPublicPropertyChange(tx, current, property);
      return { property } as const;
    });
    if ("error" in result) return result.error;
    const property = result.property;

    await db.auditLog.create({
      data: {
        actorId: profile.id,
        action: `property_${parsed.data.status.toLowerCase()}`,
        entityType: "property",
        entityId: id,
        metadata: {
          note: parsed.data.note,
          status: parsed.data.status
        }
      }
    });

    return ok({ property });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/properties/[id]/moderate"
    });
  }
}
