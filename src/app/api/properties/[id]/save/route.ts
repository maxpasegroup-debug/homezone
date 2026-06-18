import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, notFound, ok, rateLimited, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(_request, "properties:save", session.user.id),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const profile = await getOrCreateProfile(session.user);
    const property = await db.property.findUnique({
      where: {
        id
      }
    });

    if (!property) {
      return notFound("Property not found");
    }

    await db.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId: profile.id,
          propertyId: id
        }
      },
      update: {},
      create: {
        userId: profile.id,
        propertyId: id
      }
    });

    await auditLog({
      action: "property_saved",
      actorId: profile.id,
      entityId: id,
      entityType: "property"
    });

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/properties/[id]/save"
    });
  }
}
