import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderProjectSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { addBuilderActivity } from "@/lib/builder/queries";

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
    const project = await db.builderProject.findUnique({
      where: {
        id
      }
    });

    if (!project) {
      return notFound("Project not found");
    }

    if (!isAdminRole(profile.role) && project.builderId !== profile.id) {
      return forbidden();
    }

    const parsed = await parseJson(request, builderProjectSchema.partial());

    if ("error" in parsed) {
      return parsed.error;
    }

    const updated = await db.builderProject.update({
      where: {
        id
      },
      data: {
        ...parsed.data,
        completionDate: parsed.data.completionDate ? new Date(parsed.data.completionDate) : undefined
      }
    });
    await addBuilderActivity({
      action: "PROJECT_UPDATED",
      builderId: profile.id,
      message: `Project updated: ${updated.name}.`,
      projectId: updated.id
    });

    return ok({ project: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/builder/projects/[id]"
    });
  }
}
