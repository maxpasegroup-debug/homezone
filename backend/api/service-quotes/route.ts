import { auth } from "@/auth";
import { apiError, forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
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

    if (!provider || provider.suspended || !provider.verified || profile.role !== "SERVICE_PROVIDER") {
      return forbidden("Provider profile required before sending quotes");
    }

    const quote = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceRequest" WHERE id = ${parsed.data.requestId} FOR UPDATE`;
      const target = await tx.serviceRequest.findUnique({where:{id:parsed.data.requestId}});
      if (!target || !["requested","quoted"].includes(target.status) || target.requesterId === profile.id ||
        (target.providerId ? target.providerId !== provider.id : target.category !== provider.category || !provider.city || target.city !== provider.city)) return null;
      if (parsed.data.validUntil && new Date(parsed.data.validUntil).getTime() <= Date.now()) return null;
      const created = await tx.serviceQuote.create({data:{requestId:target.id,providerId:provider.id,
        amount:parsed.data.amount,currency:parsed.data.currency,message:parsed.data.message,revision:1,
        validUntil:parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined}});
      await tx.serviceRequest.update({where:{id:target.id},data:{status:"quoted"}});
      return created;
    });
    if (!quote) return apiError("Request is unavailable for quoting. Refresh before continuing.",409);

    return ok({ quote });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/service-quotes"
    });
  }
}
