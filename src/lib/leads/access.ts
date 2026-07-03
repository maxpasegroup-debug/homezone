import type { LeadStage, Prisma } from "@prisma/client";
import { forbidden, notFound } from "@/lib/api/response";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/platform/notifications";

export const leadStages: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "NEGOTIATION",
  "WON",
  "LOST"
];

export const leadInboxStages = ["ALL", ...leadStages, "ARCHIVED", "NURTURE"] as const;

export function leadAccessWhere(profileId: string): Prisma.LeadWhereInput {
  return {
    OR: [
      {
        userId: profileId
      },
      {
        assignedTo: profileId
      },
      {
        property: {
          ownerId: profileId
        }
      }
    ]
  };
}

export async function requireLeadAccess(leadId: string, profile: {
  id: string;
  role: string;
}) {
  const lead = await db.lead.findUnique({
    include: {
      assigned: true,
      notes: {
        include: {
          author: true
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      notifications: {
        orderBy: {
          createdAt: "desc"
        }
      },
      property: {
        include: {
          owner: true
        }
      },
      siteVisits: {
        orderBy: {
          scheduledAt: "desc"
        }
      },
      tasks: {
        orderBy: {
          createdAt: "desc"
        }
      },
      timeline: {
        orderBy: {
          createdAt: "desc"
        }
      },
      user: true
    },
    where: {
      id: leadId
    }
  });

  if (!lead) {
    return {
      error: notFound("Lead not found")
    } as const;
  }

  const allowed =
    isAdminRole(profile.role) ||
    lead.userId === profile.id ||
    lead.assignedTo === profile.id ||
    lead.property?.ownerId === profile.id;

  if (!allowed) {
    return {
      error: forbidden()
    } as const;
  }

  return {
    lead
  } as const;
}

export async function addLeadTimeline({
  actorId,
  eventType,
  leadId,
  message,
  metadata = {}
}: {
  actorId?: string | null;
  eventType: string;
  leadId: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.leadTimelineEvent.create({
    data: {
      actorId,
      eventType,
      leadId,
      message,
      metadata
    }
  });
}

export async function createLeadNotification({
  leadId,
  message,
  recipientId,
  title,
  type
}: {
  leadId: string;
  message: string;
  recipientId?: string | null;
  title: string;
  type: string;
}) {
  if (!recipientId) return null;

  await createNotification({
    actionUrl: `/dashboard/leads/${leadId}`,
    message,
    metadata: {
      leadId
    },
    module: "LEAD",
    priority: type.includes("DUE") ? "HIGH" : "NORMAL",
    recipientId,
    title,
    type
  });

  return db.leadNotification.create({
    data: {
      leadId,
      message,
      recipientId,
      title,
      type
    }
  });
}
