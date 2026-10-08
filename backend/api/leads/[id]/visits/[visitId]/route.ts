import { auth } from "@/auth";
import { handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadVisitUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = {
  params: Promise<{
    id: string;
    visitId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id, visitId } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const visit = await db.leadSiteVisit.findUnique({ where: { id: visitId } });
    if (!visit || visit.leadId !== id) return notFound("Site visit not found");

    const parsed = await parseJson(request, leadVisitUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const updated = await db.leadSiteVisit.update({
      data: {
        notes: parsed.data.notes,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        status: parsed.data.status
      },
      where: { id: visitId }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "SITE_VISIT_UPDATED",
      leadId: id,
      message: `Site visit marked ${updated.status}.`
    });

    return ok({ visit: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/leads/[id]/visits/[visitId]"
    });
  }
}
