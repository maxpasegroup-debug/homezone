import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, createLeadNotification, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireLeadAccess(id, profile);

    if ("error" in access) {
      return access.error;
    }

    return ok({ lead: access.lead });
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/leads/[id]"
    });
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
    const access = await requireLeadAccess(id, profile);

    if ("error" in access) {
      return access.error;
    }

    const parsed = await parseJson(request, leadUpdateSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const nextStage = parsed.data.stage;
    const updated = await db.lead.update({
      data: {
        closedAt: nextStage === "WON" || nextStage === "LOST" ? new Date() : undefined,
        dealValue: parsed.data.dealValue,
        firstRespondedAt:
          !access.lead.firstRespondedAt && nextStage && nextStage !== "NEW"
            ? new Date()
            : undefined,
        followUpAt: parsed.data.followUpAt ? new Date(parsed.data.followUpAt) : undefined,
        nextAction: parsed.data.nextAction,
        priority: parsed.data.priority,
        stage: nextStage
      },
      where: {
        id
      }
    });

    if (nextStage) {
      await addLeadTimeline({
        actorId: profile.id,
        eventType: "STATUS_CHANGED",
        leadId: id,
        message: `Lead moved to ${nextStage.replace("_", " ")}.`,
        metadata: {
          stage: nextStage
        }
      });

      await createLeadNotification({
        leadId: id,
        message: `Lead status changed to ${nextStage.replace("_", " ")}.`,
        recipientId: access.lead.property?.ownerId,
        title: "Lead status changed",
        type: "STATUS_CHANGED"
      });
    }

    return ok({ lead: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/leads/[id]"
    });
  }
}
