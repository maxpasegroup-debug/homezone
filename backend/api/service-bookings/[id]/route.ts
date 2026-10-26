import { auth } from "@/auth";
import { apiError, forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
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
    const actorIsProvider=access.booking.provider.profileId===profile.id || ["ADMIN","SUPER_ADMIN"].includes(profile.role);
    if(["START","COMPLETE"].includes(parsed.data.action) && (!actorIsProvider || access.booking.provider.suspended))return forbidden();
    const expected=parsed.data.action==="COMPLETE"?"IN_PROGRESS":"UPCOMING";
    if(access.booking.status!==expected)return apiError("Booking changed. Refresh before continuing.",409);
    if(parsed.data.action==="CANCEL" && access.booking.payments.some(p=>p.status==="PAID"))return apiError("Paid booking cancellation requires the approved refund workflow.",409);
    if(parsed.data.action==="RESCHEDULE" && (!parsed.data.scheduledAt || new Date(parsed.data.scheduledAt).getTime()<=Date.now()))return apiError("Choose a future appointment.",400);
    const status = parsed.data.action === "START" ? "IN_PROGRESS" : parsed.data.action === "COMPLETE" ? "COMPLETED" : parsed.data.action === "CANCEL" ? "CANCELLED" : access.booking.status;
    const changed = await db.serviceBooking.updateMany({
      data: {
        cancelledAt: parsed.data.action === "CANCEL" ? new Date() : undefined,
        completedAt: parsed.data.action === "COMPLETE" ? new Date() : undefined,
        notes: parsed.data.notes,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        status
      },
      where: { id, status: expected }
    });
    if(changed.count!==1)return apiError("Booking changed. Refresh before continuing.",409);
    const booking=await db.serviceBooking.findUnique({where:{id}});
    return ok({ booking });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/service-bookings/[id]" });
  }
}
