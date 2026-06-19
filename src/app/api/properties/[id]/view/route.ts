import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, notFound, ok, rateLimited } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    const limit = checkRateLimit({
      key: rateLimitKey(request, "properties:view", session?.user?.id),
      limit: 120,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const property = await db.property.findUnique({
      where: { id },
      select: {
        city: true,
        id: true,
        locality: true,
        ownerId: true,
        title: true
      }
    });

    if (!property) {
      return notFound("Property not found");
    }

    const profile = session?.user ? await getOrCreateProfile(session.user) : null;

    await auditLog({
      action: "PROPERTY_VIEWED",
      actorId: profile?.id,
      entityId: property.id,
      entityType: "property",
      metadata: {
        city: property.city,
        locality: property.locality,
        ownerId: property.ownerId,
        title: property.title
      }
    });

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/properties/[id]/view"
    });
  }
}
