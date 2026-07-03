import type { LeadStage, PaymentProduct, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { leadAccessWhere } from "@/lib/leads/access";

export type BrokerPlan = "FREE" | "PRO" | "ENTERPRISE";

const activeDealStages: LeadStage[] = ["CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "NURTURE"];

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (!value) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

export function brokerPlanFromProducts(products: PaymentProduct[]): BrokerPlan {
  if (products.includes("BROKER_ENTERPRISE")) return "ENTERPRISE";
  if (products.includes("BROKER_YEARLY") || products.includes("BROKER_MONTHLY")) return "PRO";
  return "FREE";
}

export function brokerPlanLimits(plan: BrokerPlan) {
  if (plan === "ENTERPRISE") return { automations: 25, teamMembers: 50 };
  if (plan === "PRO") return { automations: 8, teamMembers: 10 };
  return { automations: 1, teamMembers: 2 };
}

export async function getBrokerPlan(profileId: string) {
  const subscriptions = await db.subscription.findMany({
    select: {
      product: true
    },
    where: {
      endsAt: {
        gt: new Date()
      },
      profileId,
      status: "ACTIVE"
    }
  });
  const plan = brokerPlanFromProducts(subscriptions.map((item) => item.product));
  return {
    limits: brokerPlanLimits(plan),
    plan
  };
}

export async function getBrokerProDashboardData(profileId: string) {
  const where = leadAccessWhere(profileId);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    plan,
    leads,
    stageGroups,
    team,
    commissions,
    automations,
    visitsToday,
    followUpsDue,
    monthlyClosings,
    recentAssignments,
    documents
  ] = await Promise.all([
    getBrokerPlan(profileId),
    db.lead.findMany({
      include: {
        assigned: true,
        brokerAssignments: {
          include: {
            assignee: true
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 3
        },
        clientDocuments: true,
        commissions: true,
        notes: {
          orderBy: {
            createdAt: "desc"
          },
          take: 3
        },
        property: true,
        siteVisits: {
          orderBy: {
            scheduledAt: "desc"
          }
        },
        tasks: {
          orderBy: {
            dueAt: "asc"
          }
        },
        timeline: {
          orderBy: {
            createdAt: "desc"
          },
          take: 8
        },
        user: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      where
    }),
    db.lead.groupBy({
      by: ["stage"],
      where,
      _count: {
        _all: true
      }
    }),
    db.brokerTeamMember.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        brokerId: profileId
      }
    }),
    db.brokerCommission.findMany({
      include: {
        agent: true,
        lead: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      where: {
        brokerId: profileId
      }
    }),
    db.brokerAutomationRule.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        brokerId: profileId
      }
    }),
    db.leadSiteVisit.findMany({
      include: {
        lead: true,
        property: true
      },
      orderBy: {
        scheduledAt: "asc"
      },
      where: {
        lead: where,
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    }),
    db.leadTask.findMany({
      include: {
        lead: true
      },
      orderBy: {
        dueAt: "asc"
      },
      where: {
        completedAt: null,
        dueAt: {
          lte: todayEnd
        },
        lead: where
      }
    }),
    db.lead.count({
      where: {
        ...where,
        closedAt: {
          gte: monthStart
        },
        stage: "WON"
      }
    }),
    db.brokerLeadAssignment.findMany({
      include: {
        assignee: true,
        lead: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20,
      where: {
        brokerId: profileId
      }
    }),
    db.brokerClientDocument.findMany({
      include: {
        lead: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 30,
      where: {
        brokerId: profileId
      }
    })
  ]);

  const won = leads.filter((lead) => lead.stage === "WON").length;
  const lost = leads.filter((lead) => lead.stage === "LOST").length;
  const activeDeals = leads.filter((lead) => activeDealStages.includes(lead.stage)).length;
  const pipelineValue = leads.reduce((sum, lead) => sum + decimalToNumber(lead.dealValue), 0);
  const commissionTotals = commissions.reduce(
    (totals, commission) => {
      const amount = decimalToNumber(commission.commissionAmount);
      if (commission.status === "PAID") totals.paid += amount;
      if (commission.status === "OUTSTANDING") totals.outstanding += amount;
      if (commission.status === "PENDING") totals.pending += amount;
      return totals;
    },
    { outstanding: 0, paid: 0, pending: 0 }
  );

  return {
    analytics: {
      activeDeals,
      averageClosingDays: 0,
      conversionRate: leads.length ? Math.round((won / leads.length) * 100) : 0,
      followUpsDue: followUpsDue.length,
      monthlyClosings,
      newLeads: leads.filter((lead) => lead.stage === "NEW").length,
      pipelineValue,
      revenueEstimate: commissionTotals.pending + commissionTotals.outstanding,
      siteVisitsToday: visitsToday.length,
      winLossRatio: lost ? Math.round((won / lost) * 100) / 100 : won
    },
    automations,
    calendar: {
      followUpsDue,
      visitsToday
    },
    commissions,
    commissionTotals,
    documents,
    leads,
    plan,
    recentAssignments,
    stageGroups,
    team
  };
}
