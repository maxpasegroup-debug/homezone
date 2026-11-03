import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, forbidden, handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { propertyCreateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { generateOpenAIText } from "@/lib/ai/homezone-ai";
import { db } from "@/lib/db";
import { createPublication } from "@/lib/properties/publication";
import { propertyPhotoTransitionError } from "@/lib/properties/photos";
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
    if (profile.verificationStatus === "SUSPENDED") return forbidden();
    const data = parsed.data;
    const publication = createPublication(profile.role, data.status, new Date());
    if ("error" in publication) return forbidden(publication.error);
    const photoError = propertyPhotoTransitionError(null, data);
    if (photoError) return apiError(photoError, 400);
    const aiSummary =
      (await generateOpenAIText({
        system:
          "You are HomeZone AI. Write a short buyer-friendly real estate listing summary. Keep it practical and premium. Under 55 words.",
        user: JSON.stringify(data)
      })) ??
      (data.status === "DRAFT" ? "This draft listing is private and has not been published." :
        data.status === "PUBLISHED" ? "This Owner listing is published and available to buyers." :
          "This listing has been created and is waiting for HomeZone admin review.");

    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${profile.id} FOR UPDATE`;
      const current = await tx.profile.findUnique({
        where: { id: profile.id }, select: { role: true, verificationStatus: true }
      });
      if (!current || current.verificationStatus === "SUSPENDED" || current.role !== profile.role) {
        return { error: forbidden("Listing account changed. Refresh before continuing.") } as const;
      }
      const currentPublication = createPublication(current.role, data.status, new Date());
      if ("error" in currentPublication) return { error: forbidden(currentPublication.error) } as const;
      const currentPhotoError = propertyPhotoTransitionError(null, data);
      if (currentPhotoError) return { error: apiError(currentPhotoError, 400) } as const;
      const created = await tx.property.create({
        data: {
          ownerId: profile.id,
          title: data.title,
          description: data.description,
          intent: data.intent,
          category: data.category,
          propertyType: data.propertyType,
          coverImageUrl: data.coverImageUrl,
          country: data.country,
          state: data.state,
          city: data.city,
          locality: data.locality,
          address: data.address,
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
          mediaUrls: data.mediaUrls ?? [],
          videoUrl: data.videoUrl,
          virtualTourUrl: data.virtualTourUrl,
          ...currentPublication.data,
          propertyScore: 70,
          aiSummary
        }
      });

      if (current.role === "USER") {
        await tx.profile.update({
          data: { role: "OWNER" },
          where: { id: profile.id }
        });
      }

      return { property: created } as const;
    });
    if ("error" in result) return result.error;
    const property = result.property;
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
