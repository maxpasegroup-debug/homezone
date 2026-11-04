import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderProjectSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { requireBuilderProjectAccess, requireBuilderWriteAccess } from "@/lib/builder/queries";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireBuilderProjectAccess(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, builderProjectSchema.partial());

    if ("error" in parsed) {
      return parsed.error;
    }

    const result = await db.$transaction(async (tx) => {
      const admission = await requireBuilderWriteAccess(tx, profile, id);
      if ("error" in admission) return admission;
      const saved = await tx.builderProject.update({
        where: {
          id
        },
        data: {
          ...parsed.data,
          completionDate: parsed.data.completionDate ? new Date(parsed.data.completionDate) : undefined
        }
      });
      await tx.builderActivityLog.create({
        data: {
          action: "PROJECT_UPDATED",
          builderId: profile.id,
          message: `Project updated: ${saved.name}.`,
          projectId: saved.id
        }
      });
      return { project: saved };
    });
    if ("error" in result) return result.error;
    return ok({ project: result.project });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/builder/projects/[id]"
    });
  }
}
