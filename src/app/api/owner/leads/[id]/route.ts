import { auth } from "@/auth";
import { handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
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

    const { id } = await context.params;
    const profile = await getOrCreateProfile(session.user);
    const lead = await db.lead.findFirst({
      where: {
        id,
        property: {
          ownerId: profile.id
        }
      }
    });

    if (!lead) {
      return notFound("Lead not found");
    }

    const parsed = await parseJson(request, leadUpdateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const updated = await db.lead.update({
      data: {
        ...parsed.data,
        followUpAt: parsed.data.followUpAt ? new Date(parsed.data.followUpAt) : undefined
      },
      where: {
        id
      }
    });

    return ok({ lead: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/owner/leads/[id]"
    });
  }
}
