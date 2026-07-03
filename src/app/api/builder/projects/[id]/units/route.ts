import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderUnitSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addBuilderActivity, getBuilderPlan, requireBuilderProjectAccess } from "@/lib/builder/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireBuilderProjectAccess(id, profile);
    if ("error" in access) return access.error;
    const plan = await getBuilderPlan(profile.id);
    const unitCount = await db.builderUnit.count({ where: { project: { builderId: profile.id } } });
    if (unitCount >= plan.limits.units) return forbidden(`Your ${plan.plan} plan supports ${plan.limits.units} units.`);
    const parsed = await parseJson(request, builderUnitSchema);
    if ("error" in parsed) return parsed.error;
    const unit = await db.builderUnit.create({
      data: {
        areaUnit: parsed.data.areaUnit,
        areaValue: parsed.data.areaValue,
        bathrooms: parsed.data.bathrooms,
        bedrooms: parsed.data.bedrooms,
        facing: parsed.data.facing,
        floor: parsed.data.floor,
        floorPlanUrl: parsed.data.floorPlanUrl,
        imageUrls: parsed.data.imageUrls ?? [],
        price: parsed.data.price,
        projectId: id,
        status: parsed.data.status,
        towerId: parsed.data.towerId,
        unitNumber: parsed.data.unitNumber,
        unitType: parsed.data.unitType
      }
    });
    await db.builderProject.update({
      data: {
        availableUnits: { increment: unit.status === "AVAILABLE" ? 1 : 0 },
        unitsCount: { increment: 1 }
      },
      where: { id }
    });
    await addBuilderActivity({
      action: "UNIT_CREATED",
      builderId: profile.id,
      message: `Unit added: ${unit.unitNumber}.`,
      projectId: id
    });
    return ok({ unit });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/builder/projects/[id]/units" });
  }
}
