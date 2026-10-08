import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderProjectSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { addBuilderActivity, builderProjectInclude, getBuilderPlan } from "@/lib/builder/queries";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const profile = await getOrCreateProfile(session.user);
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
    const plan = await getBuilderPlan(profile.id);
    const projectCount = await db.builderProject.count({
      where: {
        builderId: profile.id
      }
    });
    if (projectCount >= plan.limits.projects) {
      return forbidden(`Your ${plan.plan} plan supports ${plan.limits.projects} projects.`);
    }
    const project = await db.builderProject.create({
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
        unitsCount: parsed.data.unitsCount,
        availableUnits: parsed.data.availableUnits,
        aiReport: {
          summary:
            "Builder report will update after inventory, leads, bookings, and campaign data are available."
        }
      }
    });
    await addBuilderActivity({
      action: "PROJECT_CREATED",
      builderId: profile.id,
      message: `Project created: ${project.name}.`,
      projectId: project.id
    });

    return ok({ project });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/builder/projects"
    });
  }
}
