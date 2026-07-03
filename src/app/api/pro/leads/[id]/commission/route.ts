import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { brokerCommissionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, brokerCommissionSchema);
    if ("error" in parsed) return parsed.error;

    const commissionAmount = Math.round((parsed.data.dealValue * parsed.data.commissionPercent) / 100);
    const commission = await db.brokerCommission.create({
      data: {
        agentId: parsed.data.agentId,
        brokerId: profile.id,
        commissionAmount,
        commissionPercent: parsed.data.commissionPercent,
        dealValue: parsed.data.dealValue,
        leadId: id,
        notes: parsed.data.notes,
        paidAt: parsed.data.status === "PAID" ? new Date() : undefined,
        status: parsed.data.status
      }
    });

    await db.lead.update({
      data: {
        closedAt: parsed.data.status === "PAID" ? new Date() : undefined,
        dealValue: parsed.data.dealValue,
        stage: parsed.data.status === "PAID" ? "WON" : undefined
      },
      where: {
        id
      }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "COMMISSION_RECORDED",
      leadId: id,
      message: `Commission recorded at ${parsed.data.commissionPercent}% on deal value ${parsed.data.dealValue}.`
    });

    return ok({ commission });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/pro/leads/[id]/commission" });
  }
}
