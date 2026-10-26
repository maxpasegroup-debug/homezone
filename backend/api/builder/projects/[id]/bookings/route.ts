import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderBookingSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addBuilderActivity, requireBuilderProjectAccess } from "@/lib/builder/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireBuilderProjectAccess(id, profile);
    if ("error" in access) return access.error;
    const parsed = await parseJson(request, builderBookingSchema);
    if ("error" in parsed) return parsed.error;
    const result = await db.$transaction(async (tx) => {
      // Acquire the unit row before creating a booking. Competing admissions
      // recheck AVAILABLE after waiting for this transaction to finish.
      const claim = await tx.builderUnit.updateMany({
        where: { id: parsed.data.unitId, projectId: id, status: "AVAILABLE" },
        data: { status: "RESERVED" }
      });
      if (claim.count !== 1) return null;
      if (parsed.data.buyerId || parsed.data.leadId) {
        const lead = parsed.data.leadId ? await tx.lead.findFirst({
          where: { id: parsed.data.leadId, assignedTo: profile.id }
        }) : null;
        if (!lead || (parsed.data.buyerId && lead.userId !== parsed.data.buyerId)) {
          throw new Error("Reservation relationship rejected");
        }
      }
      const booking = await tx.builderBooking.create({
        data: {
          bookingAmount: parsed.data.bookingAmount,
          buyerId: parsed.data.buyerId,
          leadId: parsed.data.leadId,
          notes: parsed.data.notes,
          projectId: id,
          saleValue: parsed.data.saleValue,
          status: "RESERVED",
          unitId: parsed.data.unitId
        }
      });
      await tx.builderProject.updateMany({where:{id,availableUnits:{gt:0}},data:{availableUnits:{decrement:1}}});
      return booking;
    });
    if (!result) return forbidden("Unit is not available for reservation");
    await addBuilderActivity({
      action: "UNIT_RESERVED",
      builderId: profile.id,
      message: "Unit reserved.",
      metadata: { unitId: parsed.data.unitId },
      projectId: id
    });
    return ok({ booking: result });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/builder/projects/[id]/bookings" });
  }
}
