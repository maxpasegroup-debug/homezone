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
      const unit = await tx.builderUnit.findUnique({ where: { id: parsed.data.unitId } });
      if (!unit || unit.projectId !== id || unit.status !== "AVAILABLE") return null;
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
      await tx.builderUnit.update({ data: { status: "RESERVED" }, where: { id: unit.id } });
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
