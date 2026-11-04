import { auth } from "@/auth";
import { apiError, forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceReviewSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { requireServiceBookingAccess } from "@/lib/services/marketplace";

type RouteContext = { params: Promise<{ id: string }> };

function duplicateBookingReview(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002" || !("meta" in error)) return false;
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) ? target.includes("bookingId") : target === "ServiceReview_bookingId_key";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireServiceBookingAccess(id, profile);
    if ("error" in access) return access.error;
    if (access.booking.customerId !== profile.id || access.booking.status !== "COMPLETED") {
      return forbidden("Only completed bookings can be reviewed by the customer");
    }
    const parsed = await parseJson(request, serviceReviewSchema);
    if ("error" in parsed) return parsed.error;
    const result = await db.$transaction(async tx => {
      // SHARE blocks role/status updates while allowing foreign-key KEY SHARE
      // checks from payment/audit writes that may already hold the booking row.
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${profile.id} FOR SHARE`;
      const actor = await tx.profile.findUnique({ where: { id: profile.id }, select: { verificationStatus: true } });
      if (!actor || actor.verificationStatus === "SUSPENDED") return { error: forbidden() } as const;

      // Serialize rating recalculations for this provider, including reviews of
      // different bookings, so a later commit cannot replace a newer aggregate.
      await tx.$queryRaw`SELECT id FROM "ServiceProvider" WHERE id=${access.booking.providerId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "ServiceBooking" WHERE id=${id} FOR UPDATE`;
      const booking = await tx.serviceBooking.findUnique({
        where: { id }, select: { customerId: true, status: true, providerId: true }
      });
      if (!booking) return { error: notFound("Service booking not found") } as const;
      if (booking.customerId !== profile.id || booking.status !== "COMPLETED") {
        return { error: forbidden("Only completed bookings can be reviewed by the customer") } as const;
      }
      if (booking.providerId !== access.booking.providerId) {
        return { error: apiError("Booking changed. Refresh before continuing.", 409) } as const;
      }
      const existing = await tx.serviceReview.findUnique({ where: { bookingId: id }, select: { id: true } });
      if (existing) return { error: apiError("This booking has already been reviewed.", 409) } as const;

      const review = await tx.serviceReview.create({
        data: {
          bookingId: id,
          comment: parsed.data.comment,
          photoUrls: parsed.data.photoUrls ?? [],
          providerId: booking.providerId,
          rating: parsed.data.rating,
          reviewerId: profile.id
        }
      });
      const aggregate = await tx.serviceReview.aggregate({
        _avg: { rating: true }, _count: { _all: true },
        where: { providerId: booking.providerId, status: "PUBLISHED" }
      });
      await tx.serviceProvider.update({
        where: { id: booking.providerId },
        data: { rating: aggregate._avg.rating ?? 0, reviewCount: aggregate._count._all }
      });
      return { review } as const;
    });
    if ("error" in result) return result.error;
    return ok({ review: result.review });
  } catch (error) {
    if (duplicateBookingReview(error)) return apiError("This booking has already been reviewed.", 409);
    return handleApiError(error, { route: "POST /api/service-bookings/[id]/reviews" });
  }
}
