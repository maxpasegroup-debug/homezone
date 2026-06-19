import { auth } from "@/auth";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forbidden, handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { moderationSchema } from "@/lib/api/validation";
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

    const property = await db.property.update({
      where: { id },
      data: {
        status: parsed.data.status,
        verified: parsed.data.status === "PUBLISHED",
        publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : undefined
      }
    });

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
