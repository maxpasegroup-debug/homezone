import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

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
    const lead = await db.lead.findUnique({
      where: {
        id
      }
    });

    if (!lead) {
      return notFound("Lead not found");
    }

    if (!isAdminRole(profile.role) && lead.assignedTo !== profile.id && lead.userId !== profile.id) {
      return forbidden();
    }

    const parsed = await parseJson(request, leadUpdateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const updated = await db.lead.update({
      where: {
        id
      },
      data: {
        stage: parsed.data.stage,
        nextAction: parsed.data.nextAction,
        followUpAt: parsed.data.followUpAt ? new Date(parsed.data.followUpAt) : undefined
      }
    });

    return ok({ lead: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/pro/leads/[id]"
    });
  }
}
