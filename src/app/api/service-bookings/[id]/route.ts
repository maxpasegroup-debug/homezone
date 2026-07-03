import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceBookingActionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { requireServiceBookingAccess } from "@/lib/services/marketplace";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireServiceBookingAccess(id, profile);
    if ("error" in access) return access.error;
    const parsed = await parseJson(request, serviceBookingActionSchema);
    if ("error" in parsed) return parsed.error;
    const status = parsed.data.action === "START" ? "IN_PROGRESS" : parsed.data.action === "COMPLETE" ? "COMPLETED" : parsed.data.action === "CANCEL" ? "CANCELLED" : access.booking.status;
    const booking = await db.serviceBooking.update({
      data: {
        cancelledAt: parsed.data.action === "CANCEL" ? new Date() : undefined,
        completedAt: parsed.data.action === "COMPLETE" ? new Date() : undefined,
        notes: parsed.data.notes,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        status
      },
      where: { id }
    });
    return ok({ booking });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/service-bookings/[id]" });
  }
}
