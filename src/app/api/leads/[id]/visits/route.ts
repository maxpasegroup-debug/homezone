import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadVisitSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, createLeadNotification, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, leadVisitSchema);
    if ("error" in parsed) return parsed.error;

    const visit = await db.leadSiteVisit.create({
      data: {
        leadId: id,
        notes: parsed.data.notes,
        propertyId: access.lead.propertyId,
        scheduledAt: new Date(parsed.data.scheduledAt),
        scheduledBy: profile.id,
        status: parsed.data.status
      }
    });

    await db.lead.update({
      data: {
        followUpAt: visit.scheduledAt,
        stage: "SITE_VISIT"
      },
      where: {
        id
      }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "SITE_VISIT_SCHEDULED",
      leadId: id,
      message: "Site visit scheduled.",
      metadata: {
        scheduledAt: visit.scheduledAt.toISOString()
      }
    });

    await createLeadNotification({
      leadId: id,
      message: `Site visit scheduled for ${visit.scheduledAt.toLocaleString("en-IN")}.`,
      recipientId: access.lead.property?.ownerId,
      title: "Site visit scheduled",
      type: "SITE_VISIT_SCHEDULED"
    });

    return ok({ visit });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/leads/[id]/visits"
    });
  }
}
