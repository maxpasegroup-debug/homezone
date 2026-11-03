import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
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
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { propertyVerificationSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { propertyVerificationEvent } from "@/lib/trust/verification";
import { propertyPhotoTransitionError } from "@/lib/properties/photos";

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

    const admin = await getOrCreateProfile(session.user);

    if (!isAdminRole(admin.role)) {
      return forbidden();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "admin:properties:verify", session.user.id),
      limit: 60,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const parsed = await parseJson(request, propertyVerificationSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const now = new Date();
    const status = parsed.data.status;
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${admin.id} FOR UPDATE`;
      const actor = await tx.profile.findUnique({
        where: { id: admin.id }, select: { role: true, verificationStatus: true }
      });
      if (!actor || !isAdminRole(actor.role) || actor.verificationStatus === "SUSPENDED") {
        return { error: forbidden() } as const;
      }
      await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${id} FOR UPDATE`;
      const current = await tx.property.findUnique({
        where: { id }, select: { status: true, coverImageUrl: true, mediaUrls: true }
      });
      if (!current) return { error: notFound("Property not found") } as const;
      const nextStatus = status === "VERIFIED" ? "PUBLISHED" : status === "EXPIRED"
        ? "ARCHIVED" : status === "UNDER_REVIEW" ? "PENDING_REVIEW" : "REJECTED";
      const photoError = propertyPhotoTransitionError(current, { ...current, status: nextStatus });
      if (photoError) return { error: apiError(photoError, 400) } as const;
      const property = await tx.property.update({
        where: { id },
        data: {
          status: nextStatus,
          verificationNotes: parsed.data.note,
          verificationStatus: status,
          verified: status === "VERIFIED",
          verifiedAt: now,
          verifiedBy: admin.id
        }
      });
      return { property } as const;
    });
    if ("error" in result) return result.error;
    const property = result.property;

    await auditLog({
      action: propertyVerificationEvent(status),
      actorId: admin.id,
      entityId: property.id,
      entityType: "property",
      metadata: {
        note: parsed.data.note,
        status
      }
    });

    return ok({ property });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/properties/[id]/verify"
    });
  }
}
