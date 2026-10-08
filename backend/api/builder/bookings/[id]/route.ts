import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderBookingActionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addBuilderActivity } from "@/lib/builder/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const booking = await db.builderBooking.findUnique({ include: { project: true, unit: true }, where: { id } });
    if (!booking) return notFound("Booking not found");
    if (booking.project.builderId !== profile.id) return forbidden();
    const parsed = await parseJson(request, builderBookingActionSchema);
    if ("error" in parsed) return parsed.error;
    const status = parsed.data.action === "RELEASE" ? "RELEASED" : parsed.data.action === "CONFIRM" ? "CONFIRMED" : "SOLD";
    const unitStatus = parsed.data.action === "RELEASE" ? "AVAILABLE" : parsed.data.action === "CONFIRM" ? "RESERVED" : "SOLD";
    const updated = await db.$transaction(async (tx) => {
      await tx.builderUnit.update({ data: { status: unitStatus }, where: { id: booking.unitId } });
      return tx.builderBooking.update({
        data: {
          confirmedAt: parsed.data.action === "CONFIRM" ? new Date() : undefined,
          notes: parsed.data.notes,
          releasedAt: parsed.data.action === "RELEASE" ? new Date() : undefined,
          saleValue: parsed.data.saleValue,
          soldAt: parsed.data.action === "SOLD" ? new Date() : undefined,
          status
        },
        where: { id }
      });
    });
    await addBuilderActivity({
      action: `BOOKING_${status}`,
      builderId: profile.id,
      message: `Booking ${status.toLowerCase()} for unit ${booking.unit.unitNumber}.`,
      projectId: booking.projectId
    });
    return ok({ booking: updated });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/builder/bookings/[id]" });
  }
}
