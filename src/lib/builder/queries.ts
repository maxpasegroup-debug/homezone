import type { PaymentProduct, Prisma } from "@prisma/client";
import { forbidden, notFound } from "@/lib/api/response";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export type BuilderPlan = "BASIC" | "PRO" | "ENTERPRISE";

export const builderProjectInclude = {
  activities: {
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  },
  bookings: {
    include: {
      lead: true,
      unit: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  },
  campaigns: true,
  team: true,
  towers: {
    include: {
      units: true
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  units: {
    orderBy: [
      {
        floor: "asc"
      },
      {
        unitNumber: "asc"
      }
    ]
  }
} satisfies Prisma.BuilderProjectInclude;

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (!value) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

export function builderPlanFromProducts(products: PaymentProduct[]): BuilderPlan {
  if (products.includes("BUILDER_ENTERPRISE")) return "ENTERPRISE";
  if (products.includes("BUILDER_YEARLY")) return "PRO";
  return "BASIC";
}

export function builderPlanLimits(plan: BuilderPlan) {
  if (plan === "ENTERPRISE") return { projects: 100, teamMembers: 100, units: 10000 };
  if (plan === "PRO") return { projects: 25, teamMembers: 30, units: 2500 };
  return { projects: 5, teamMembers: 8, units: 500 };
}

export async function getBuilderPlan(profileId: string) {
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
  const plan = builderPlanFromProducts(subscriptions.map((item) => item.product));
  return {
    limits: builderPlanLimits(plan),
    plan
  };
}

export async function requireBuilderProjectAccess(projectId: string, profile: { id: string; role: string }) {
  const project = await db.builderProject.findUnique({
    include: builderProjectInclude,
    where: {
      id: projectId
    }
  });

  if (!project) return { error: notFound("Builder project not found") } as const;
  if (project.builderId !== profile.id && !isAdminRole(profile.role)) {
    return { error: forbidden() } as const;
  }

  return { project } as const;
}

export async function addBuilderActivity({
  builderId,
  action,
  message,
  metadata = {},
  projectId,
  teamMemberId
}: {
  action: string;
  builderId: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  projectId?: string | null;
  teamMemberId?: string | null;
}) {
  return db.builderActivityLog.create({
    data: {
      action,
      builderId,
      message,
      metadata,
      projectId,
      teamMemberId
    }
  });
}

export async function getBuilderEnterpriseData(profileId: string) {
  const where = { builderId: profileId };
  const [plan, projects, team, leads, visits, campaigns, bookings] = await Promise.all([
    getBuilderPlan(profileId),
    db.builderProject.findMany({
      include: builderProjectInclude,
      orderBy: {
        updatedAt: "desc"
      },
      where
    }),
    db.builderTeamMember.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        builderId: profileId
      }
    }),
    db.lead.findMany({
      include: {
        property: true,
        tasks: true,
        siteVisits: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      where: {
        OR: [
          {
            assignedTo: profileId
          },
          {
            property: {
              ownerId: profileId
            }
          }
        ]
      }
    }),
    db.leadSiteVisit.count({
      where: {
        lead: {
          OR: [
            {
              assignedTo: profileId
            },
            {
              property: {
                ownerId: profileId
              }
            }
          ]
        }
      }
    }),
    db.builderCampaign.findMany({
      include: {
        project: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      where: {
        project: where
      }
    }),
    db.builderBooking.findMany({
      include: {
        lead: true,
        project: true,
        unit: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      where: {
        project: where
      }
    })
  ]);

  const units = projects.flatMap((project) => project.units);
  const soldRevenue = bookings
    .filter((booking) => booking.status === "SOLD")
    .reduce((sum, booking) => sum + decimalToNumber(booking.saleValue ?? booking.unit.price), 0);
  const revenuePipeline = bookings
    .filter((booking) => booking.status === "RESERVED" || booking.status === "CONFIRMED")
    .reduce((sum, booking) => sum + decimalToNumber(booking.saleValue ?? booking.unit.price), 0);

  return {
    analytics: {
      activeProjects: projects.filter((project) => project.status === "PUBLISHED").length,
      availableUnits: units.filter((unit) => unit.status === "AVAILABLE").length,
      campaignPerformance: campaigns.reduce((sum, campaign) => sum + campaign.leadsCount, 0),
      newLeads: leads.filter((lead) => lead.stage === "NEW").length,
      reservedUnits: units.filter((unit) => unit.status === "RESERVED").length,
      revenuePipeline,
      soldRevenue,
      soldUnits: units.filter((unit) => unit.status === "SOLD").length,
      teamActivity: team.filter((member) => member.active).length,
      totalUnits: units.length || projects.reduce((sum, project) => sum + (project.unitsCount ?? 0), 0),
      visits
    },
    bookings,
    campaigns,
    leads,
    plan,
    projects,
    team,
    units
  };
}
