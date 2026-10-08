import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceQuoteActionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const quote = await db.serviceQuote.findUnique({
      include: { provider: true, request: true },
      where: { id }
    });
    if (!quote) return notFound("Quote not found");
    const parsed = await parseJson(request, serviceQuoteActionSchema);
    if ("error" in parsed) return parsed.error;

    if (parsed.data.action === "REVISE") {
      if (quote.provider?.profileId !== profile.id) return forbidden();
      const revised = await db.serviceQuote.create({
        data: {
          amount: parsed.data.amount ?? quote.amount ?? undefined,
          currency: quote.currency,
          message: parsed.data.message ?? quote.message,
          providerId: quote.providerId,
          requestId: quote.requestId,
          revision: quote.revision + 1,
          status: "sent"
        }
      });
      await db.serviceQuote.update({ data: { status: "revised" }, where: { id } });
      return ok({ quote: revised });
    }

    if (quote.request.requesterId !== profile.id) return forbidden();
    if (parsed.data.action === "REJECT") {
      const rejected = await db.serviceQuote.update({ data: { rejectedAt: new Date(), status: "rejected" }, where: { id } });
      return ok({ quote: rejected });
    }

    const amount = Number(quote.amount ?? 0);
    const commissionAmount = Math.round(amount * 0.1);
    const booking = await db.$transaction(async (tx) => {
      await tx.serviceQuote.update({ data: { acceptedAt: new Date(), status: "accepted" }, where: { id } });
      await tx.serviceRequest.update({ data: { providerId: quote.providerId, status: "booked" }, where: { id: quote.requestId } });
      return tx.serviceBooking.create({
        data: {
          amount,
          commissionAmount,
          customerId: profile.id,
          depositAmount: Math.min(amount, 999),
          providerId: quote.providerId ?? "",
          providerPayout: amount - commissionAmount,
          quoteId: id,
          requestId: quote.requestId,
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
          status: "UPCOMING"
        }
      });
    });

    return ok({ booking });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/service-quotes/[id]" });
  }
}
