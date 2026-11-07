import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderProjectSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { builderProjectInclude, getBuilderPlan, requireBuilderActor, requireBuilderWriteAccess } from "@/lib/builder/queries";
import { notifyPublicPropertyChange } from "@/lib/properties/realtime";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const profile = await getOrCreateProfile(session.user);
  const admission = await requireBuilderActor(profile);
  if ("error" in admission) return admission.error;
  const projects = await db.builderProject.findMany({
    include: builderProjectInclude,
    where:
      isAdminRole(profile.role)
        ? {}
        : {
          builderId: profile.id
        },
    orderBy: {
      createdAt: "desc"
    }
  });

  return ok({ projects });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, builderProjectSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const admission = await requireBuilderActor(profile);
    if ("error" in admission) return admission.error;
    const plan = await getBuilderPlan(profile.id);
    const result = await db.$transaction(async (tx) => {
      const access = await requireBuilderWriteAccess(tx, profile);
      if ("error" in access) return access;
      const projectCount = await tx.builderProject.count({
        where: {
          builderId: profile.id
        }
      });
      if (projectCount >= plan.limits.projects) {
        return { error: forbidden(`Your ${plan.plan} plan supports ${plan.limits.projects} projects.`) };
      }
      const project = await tx.builderProject.create({
        data: {
          address: parsed.data.address,
          amenities: parsed.data.amenities,
          brochureUrl: parsed.data.brochureUrl,
          builderId: profile.id,
          city: parsed.data.city,
          completionDate: parsed.data.completionDate ? new Date(parsed.data.completionDate) : undefined,
          constructionStatus: parsed.data.constructionStatus,
          description: parsed.data.description,
          floorPlanUrls: parsed.data.floorPlanUrls ?? [],
          masterPlanUrl: parsed.data.masterPlanUrl,
          mediaUrls: parsed.data.mediaUrls ?? [],
          name: parsed.data.name,
          qrCodeUrl: parsed.data.qrCodeUrl,
          locality: parsed.data.locality,
          status: parsed.data.status,
          campaignStatus: parsed.data.campaignStatus,
          unitsCount: parsed.data.unitsCount ?? 0,
          availableUnits: parsed.data.availableUnits ?? 0,
          aiReport: {
            summary:
              "Builder report will update after inventory, leads, bookings, and campaign data are available."
          }
        }
      });
      await tx.builderActivityLog.create({
        data: {
          action: "PROJECT_CREATED",
          builderId: profile.id,
          message: `Project created: ${project.name}.`,
          projectId: project.id
        }
      });
      await notifyPublicPropertyChange(tx, null, project);
      return { project };
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return result.error;
    return ok({ project: result.project });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/builder/projects"
    });
  }
}
