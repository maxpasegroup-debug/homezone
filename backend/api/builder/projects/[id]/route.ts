import { auth } from "@/auth";
import { apiError, forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderProjectSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { requireBuilderProjectAccess, requireBuilderWriteAccess } from "@/lib/builder/queries";
import { builderProjectMediaSelect } from "@/lib/builder/project-media";
import { notifyPublicPropertyChange } from "@/lib/properties/realtime";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** Owned native upload readback, without team, bookings or internal documents. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    if (profile.role !== "BUILDER" || profile.verificationStatus === "SUSPENDED") return forbidden();
    const { id } = await context.params;
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) return apiError("Invalid project", 400);
    const project = await db.builderProject.findFirst({
      where: { id, builderId: profile.id }, select: builderProjectMediaSelect
    });
    if (!project) return notFound("Project not found");
    return ok({ project }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return apiError("Project media is unavailable. Refresh before retrying.", 503);
  }
}

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
      const before = await tx.builderProject.findUnique({ where: { id }, select: { status: true } });
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
      await notifyPublicPropertyChange(tx, before, saved);
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
