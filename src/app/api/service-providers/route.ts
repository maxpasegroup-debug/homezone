import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceProviderSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function GET() {
  const providers = await db.serviceProvider.findMany({
    where: {
      verified: true
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
