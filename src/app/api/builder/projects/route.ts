import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderProjectSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const profile = await getOrCreateProfile(session.user);
  const projects = await db.builderProject.findMany({
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
    const project = await db.builderProject.create({
      data: {
        builderId: profile.id,
        name: parsed.data.name,
        city: parsed.data.city,
        locality: parsed.data.locality,
        description: parsed.data.description,
        unitsCount: parsed.data.unitsCount,
        availableUnits: parsed.data.availableUnits,
        campaignStatus: parsed.data.campaignStatus,
        aiReport: {
          summary:
            "AI builder report will be generated after leads, media, and campaign data are available."
        }
      }
    });

    return ok({ project });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/builder/projects"
    });
  }
}
