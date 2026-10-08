import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceProviderSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function GET() {
  const providers = await db.serviceProvider.findMany({
    where: {
      verified: true,
      suspended: false
    },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 3
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 40
  });

  return ok({ providers });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, serviceProviderSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const provider = await db.serviceProvider.create({
      data: {
        profileId: profile.id,
        businessName: parsed.data.businessName,
        category: parsed.data.category,
        city: parsed.data.city,
        certifications: parsed.data.certifications ?? [],
        description: parsed.data.description,
        experienceYears: parsed.data.experienceYears,
        availability: parsed.data.availability,
        businessHours: (parsed.data.businessHours ?? {}) as Prisma.InputJsonValue,
        portfolioUrls: parsed.data.portfolioUrls ?? [],
        photoUrls: parsed.data.photoUrls ?? [],
        serviceAreas: parsed.data.serviceAreas ?? [],
        priceLabel: parsed.data.priceLabel,
        verified: false
      }
    });

    return ok({ provider });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/service-providers"
    });
  }
}
