import { auth } from "@/auth";
import { apiError, forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderUnitSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { getBuilderPlan, requireBuilderProjectAccess, requireBuilderWriteAccess } from "@/lib/builder/queries";
import { notifyPublicPropertyChange } from "@/lib/properties/realtime";

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
    const parsed = await parseJson(request, builderUnitSchema);
    if ("error" in parsed) return parsed.error;
    const result = await db.$transaction(async (tx) => {
      const admission = await requireBuilderWriteAccess(tx, profile, id);
      if ("error" in admission) return admission;
      // Independent foreign keys do not ensure that a tower belongs to this project.
      if (parsed.data.towerId) {
        const tower = await tx.builderTower.findFirst({
          where: { id: parsed.data.towerId, projectId: id }, select: { id: true }
        });
        if (!tower) return { error: apiError("Tower must belong to this project.", 400) };
      }
      const unitCount = await tx.builderUnit.count({ where: { project: { builderId: profile.id } } });
      if (unitCount >= plan.limits.units) {
        return { error: forbidden(`Your ${plan.plan} plan supports ${plan.limits.units} units.`) };
      }
      const unit = await tx.builderUnit.create({
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
      const project = await tx.builderProject.update({
        data: {
          availableUnits: { increment: unit.status === "AVAILABLE" ? 1 : 0 },
          unitsCount: { increment: 1 }
        },
        where: { id }
      });
      await tx.builderActivityLog.create({
        data: {
          action: "UNIT_CREATED",
          builderId: profile.id,
          message: `Unit added: ${unit.unitNumber}.`,
          projectId: id
        }
      });
      await notifyPublicPropertyChange(tx, project, project);
      return { unit };
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return result.error;
    return ok({ unit: result.unit });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/builder/projects/[id]/units" });
  }
}
