import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const recentWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export function formatAdminStatus(value?: string | null) {
  if (!value) return "Not set";
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export async function getAdminOperationsData() {
  const [
    totalUsers,
    buyers,
    owners,
    brokers,
    builders,
    providers,
    activeListings,
    pendingListings,
    verifiedListings,
    newLeads,
    siteVisits,
    revenue,
    studioRequests,
    pendingDocuments,
    reports,
    recentActivity,
    pendingOwners,
    pendingProperties
  ] = await Promise.all([
    db.profile.count(),
    db.profile.count({ where: { role: "USER" } }),
    db.profile.count({ where: { role: "OWNER" } }),
    db.profile.count({ where: { role: "BROKER" } }),
    db.profile.count({ where: { role: "BUILDER" } }),
    db.profile.count({ where: { role: "SERVICE_PROVIDER" } }),
    db.property.count({ where: { status: "PUBLISHED" } }),
    db.property.count({ where: { OR: [{ status: "PENDING_REVIEW" }, { verificationStatus: "UNDER_REVIEW" }] } }),
    db.property.count({ where: { verificationStatus: "VERIFIED" } }),
    db.lead.count({ where: { createdAt: { gte: recentWindow } } }),
    db.leadSiteVisit.count(),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { status: "PAID" }
    }),
    db.studioRequest.count(),
    db.propertyDocument.count({
      where: {
        property: {
          OR: [{ status: "PENDING_REVIEW" }, { verificationStatus: "UNDER_REVIEW" }]
        }
      }
    }),
    db.auditLog.count({ where: { action: "user_report" } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    db.profile.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
      where: { role: "OWNER", verificationStatus: "PENDING" }
    }),
    db.property.findMany({
      include: {
        documents: true,
        owner: { include: { user: { select: { email: true } } } },
        _count: { select: { leads: true, savedBy: true, viewedBy: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      where: { OR: [{ status: "PENDING_REVIEW" }, { verificationStatus: "UNDER_REVIEW" }] }
    })
  ]);

  return {
    notifications: [
      { count: pendingListings, label: "New listing submitted" },
      { count: pendingOwners, label: "Owner verification pending" },
      { count: reports, label: "Report received" },
      { count: recentActivity.filter((item) => item.action.includes("FAILED")).length, label: "Failed moderation" }
    ],
    pendingOwners,
    pendingProperties,
    recentActivity,
    stats: {
      activeListings,
      brokers,
      builders,
      buyers,
      newLeads,
      owners,
      pendingDocuments,
      pendingListings,
      providers,
      reports,
      revenue: revenue._sum.amount ?? 0,
      siteVisits,
      studioRequests,
      totalUsers,
      verifiedListings
    }
  };
}

export async function getAdminListingQueue() {
  return db.property.findMany({
    include: {
      documents: true,
      owner: { include: { user: { select: { email: true } } } },
      _count: { select: { leads: true, savedBy: true, shortlistItems: true, viewedBy: true } }
    },
    orderBy: { updatedAt: "desc" },
    where: {
      OR: [
        { status: "PENDING_REVIEW" },
        { verificationStatus: "UNDER_REVIEW" },
        { verificationStatus: "NEEDS_CHANGES" },
        { status: "REJECTED" }
      ]
    }
  });
}

export async function getAdminListingDetail(id: string) {
  return db.property.findUnique({
    include: {
      documents: true,
      leads: { orderBy: { createdAt: "desc" }, take: 10 },
      owner: { include: { user: { select: { email: true } } } },
      _count: { select: { leads: true, savedBy: true, shortlistItems: true, viewedBy: true } }
    },
    where: { id }
  });
}

export async function getAdminUsers({
  q,
  role,
  status
}: {
  q?: string;
  role?: string;
  status?: string;
}) {
  const where: Prisma.ProfileWhereInput = {
    AND: [
      role && role !== "ALL" ? { role: role as never } : {},
      status && status !== "ALL" ? { verificationStatus: status as never } : {},
      q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {}
    ]
  };

  return db.profile.findMany({
    include: {
      user: { select: { email: true } },
      _count: { select: { properties: true, assignedLeads: true, userLeads: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    where
  });
}

export async function getAdminLeadOversight() {
  const [leads, stages, visits, stuck] = await Promise.all([
    db.lead.findMany({
      include: {
        assigned: true,
        property: { include: { owner: true } },
        tasks: true,
        siteVisits: true
      },
      orderBy: { createdAt: "desc" },
      take: 80
    }),
    db.lead.groupBy({ by: ["stage"], _count: { _all: true } }),
    db.leadSiteVisit.findMany({
      include: { lead: true, property: true },
      orderBy: { scheduledAt: "desc" },
      take: 25
    }),
    db.lead.findMany({
      include: { property: true },
      orderBy: { updatedAt: "asc" },
      take: 20,
      where: {
        stage: { in: ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION"] },
        updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  const responseTimes = leads
    .filter((lead) => lead.firstRespondedAt)
    .map((lead) => lead.firstRespondedAt!.getTime() - lead.createdAt.getTime());

  return {
    avgResponseHours: responseTimes.length
      ? Math.round(responseTimes.reduce((sum, item) => sum + item, 0) / responseTimes.length / 36_000) / 100
      : 0,
    leads,
    stages,
    stuck,
    visits
  };
}

export async function getAdminReports() {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    where: { action: "user_report" }
  });
}

export async function getAdminMarketplaceAnalytics() {
  const [newListings, approvals, activeUsers, topProperties, leadStages, dailyActivity] =
    await Promise.all([
      db.property.count({ where: { createdAt: { gte: recentWindow } } }),
      db.property.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
      db.auditLog.groupBy({
        by: ["actorId"],
        _count: { _all: true },
        where: { createdAt: { gte: recentWindow }, actorId: { not: null } }
      }),
      db.property.findMany({
        orderBy: [{ inquirySubmissions: "desc" }, { callClicks: "desc" }, { whatsappClicks: "desc" }],
        select: {
          callClicks: true,
          city: true,
          id: true,
          inquirySubmissions: true,
          title: true,
          whatsappClicks: true
        },
        take: 10
      }),
      db.lead.groupBy({ by: ["stage"], _count: { _all: true } }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        select: { action: true, createdAt: true, entityType: true },
        take: 40
      })
    ]);

  return { activeUsers: activeUsers.length, approvals, dailyActivity, leadStages, newListings, topProperties };
}
