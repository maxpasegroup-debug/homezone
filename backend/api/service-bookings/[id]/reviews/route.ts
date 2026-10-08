import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceReviewSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { recalculateProviderRating, requireServiceBookingAccess } from "@/lib/services/marketplace";

type RouteContext = { params: Promise<{ id: string }> };

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
    const review = await db.serviceReview.create({
      data: {
        bookingId: id,
        comment: parsed.data.comment,
        photoUrls: parsed.data.photoUrls ?? [],
        providerId: access.booking.providerId,
        rating: parsed.data.rating,
        reviewerId: profile.id
      }
    });
    await recalculateProviderRating(access.booking.providerId);
    return ok({ review });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/service-bookings/[id]/reviews" });
  }
}
