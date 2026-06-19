import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import {
  forbidden,
  handleApiError,
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
    const property = await db.property.update({
      where: {
        id
      },
      data: {
        status:
          status === "VERIFIED"
            ? "PUBLISHED"
            : status === "EXPIRED"
              ? "ARCHIVED"
              : "REJECTED",
        verificationNotes: parsed.data.note,
        verificationStatus: status,
        verified: status === "VERIFIED",
        verifiedAt: now,
        verifiedBy: admin.id
      }
    });

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
