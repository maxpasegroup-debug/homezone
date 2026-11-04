import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { brokerCommissionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { canAccessLeadCrm, requireLeadPermission } from "@/lib/leads/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if (!["BROKER", "ADMIN", "SUPER_ADMIN"].includes(profile.role)) return forbidden();
    const { id } = await context.params;
    const access = await requireLeadPermission(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, brokerCommissionSchema);
    if ("error" in parsed) return parsed.error;

    const commissionAmount = Math.round((parsed.data.dealValue * parsed.data.commissionPercent) / 100);
    const result = await db.$transaction(async (tx) => {
      // Keep account admission and CRM ownership stable through all ledger writes.
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${profile.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${id} FOR UPDATE`;
      const currentProfile = await tx.profile.findUnique({
        where: { id: profile.id }, select: { role: true, verificationStatus: true }
      });
      const lead = await tx.lead.findUnique({
        where: { id }, select: { assignedTo: true, property: { select: { ownerId: true } } }
      });
      if (!currentProfile || currentProfile.role !== profile.role ||
        currentProfile.verificationStatus === "SUSPENDED" || !lead || !canAccessLeadCrm(lead, profile)) {
        return { error: forbidden() };
      }
      if (profile.role === "BROKER" && parsed.data.agentId && parsed.data.agentId !== profile.id) {
        await tx.$queryRaw`SELECT id FROM "BrokerTeamMember" WHERE "brokerId"=${profile.id} AND "profileId"=${parsed.data.agentId} AND active=true FOR UPDATE`;
        const member = await tx.brokerTeamMember.findFirst({
          where: { brokerId: profile.id, profileId: parsed.data.agentId, active: true },
          select: { id: true }
        });
        if (!member) return { error: forbidden("Agent must be an active linked member of your brokerage.") };
      }
      const commission = await tx.brokerCommission.create({
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

      await tx.lead.update({
        data: {
          closedAt: parsed.data.status === "PAID" ? new Date() : undefined,
          dealValue: parsed.data.dealValue,
          stage: parsed.data.status === "PAID" ? "WON" : undefined
        },
        where: {
          id
        }
      });

      await tx.leadTimelineEvent.create({
        data: {
          actorId: profile.id,
          eventType: "COMMISSION_RECORDED",
          leadId: id,
          message: `Commission recorded at ${parsed.data.commissionPercent}% on deal value ${parsed.data.dealValue}.`
        }
      });
      return { commission };
    });
    if ("error" in result) return result.error;
    return ok({ commission: result.commission });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/pro/leads/[id]/commission" });
  }
}
