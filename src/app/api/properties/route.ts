import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { propertyCreateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { generateOpenAIText } from "@/lib/ai/homezone-ai";
import { db } from "@/lib/db";
import { getMarketplaceProperties, parseMarketplaceFilters } from "@/lib/properties/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseMarketplaceFilters(Object.fromEntries(searchParams));
  const properties = await getMarketplaceProperties(filters);

  return ok({ properties });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "properties:create", session.user.id),
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, propertyCreateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const data = parsed.data;
    const aiSummary =
      (await generateOpenAIText({
        system:
          "You are HomeZone AI. Write a short buyer-friendly real estate listing summary. Keep it practical and premium. Under 55 words.",
        user: JSON.stringify(data)
      })) ??
      "This listing has been created and is waiting for HomeZone admin review.";

    const property = await db.property.create({
      data: {
        ownerId: profile.id,
        title: data.title,
        description: data.description,
        intent: data.intent,
        category: data.category,
        propertyType: data.propertyType,
        country: data.country,
        state: data.state,
        city: data.city,
        locality: data.locality,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        price: data.price,
        currency: data.currency,
        areaValue: data.areaValue,
        areaUnit: data.areaUnit,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        amenities: data.amenities,
        status: "PENDING_REVIEW",
        propertyScore: 70,
        aiSummary
      }
    });

    await auditLog({
      action: "property_created",
      actorId: profile.id,
      entityId: property.id,
      entityType: "property",
      metadata: {
        intent: property.intent,
        status: property.status
      }
    });

    return ok({ property });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/properties"
    });
  }
}
