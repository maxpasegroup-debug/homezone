import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderTowerSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { requireBuilderProjectAccess, requireBuilderWriteAccess } from "@/lib/builder/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireBuilderProjectAccess(id, profile);
    if ("error" in access) return access.error;
    const parsed = await parseJson(request, builderTowerSchema);
    if ("error" in parsed) return parsed.error;
    const result = await db.$transaction(async (tx) => {
      const admission = await requireBuilderWriteAccess(tx, profile, id);
      if ("error" in admission) return admission;
      const created = await tx.builderTower.create({
        data: {
          floors: parsed.data.floors,
          name: parsed.data.name,
          projectId: id,
          status: parsed.data.status
        }
      });
      await tx.builderActivityLog.create({
        data: {
          action: "TOWER_CREATED",
          builderId: profile.id,
          message: `Tower created: ${created.name}.`,
          projectId: id
        }
      });
      return { tower: created };
    });
    if ("error" in result) return result.error;
    return ok({ tower: result.tower });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/builder/projects/[id]/towers" });
  }
}
