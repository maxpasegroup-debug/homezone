import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceQuoteSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, serviceQuoteSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const provider = await db.serviceProvider.findFirst({
      where: {
        profileId: profile.id
      }
    });

    if (!provider) {
      return forbidden("Provider profile required before sending quotes");
    }

    const quote = await db.serviceQuote.create({
      data: {
        requestId: parsed.data.requestId,
        providerId: provider.id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        message: parsed.data.message
      }
    });

    return ok({ quote });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/service-quotes"
    });
  }
}
