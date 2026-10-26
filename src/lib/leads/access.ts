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

// Mutation admission needs only ownership/status facts, not conversation arrays.
export async function requireLeadPermission(leadId: string, profile: {
  id: string;
  role: string;
}) {
  const current = await db.profile.findUnique({ where: { id: profile.id }, select: { role: true, verificationStatus: true } });
  if (!current || current.verificationStatus === "SUSPENDED" || current.role !== profile.role) {
    return { error: forbidden() } as const;
  }
  const lead = await db.lead.findUnique({where:{id:leadId},select:{id:true,propertyId:true,assignedTo:true,firstRespondedAt:true,property:{select:{ownerId:true}}}});
  if(!lead)return {error:notFound("Lead not found")} as const;
  if(!canAccessLeadCrm(lead,profile))return {error:forbidden()} as const;
  return {lead} as const;
}

export async function requireLeadAccess(leadId: string, profile: { id: string; role: string }) {
  const admission=await requireLeadPermission(leadId,profile);
  if("error" in admission&&admission.error)return {error:admission.error} as const;
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

  const allowed = canAccessLeadCrm(lead, profile);

  if (!allowed) {
    return {
      error: forbidden()
    } as const;
  }

  return {
    lead
  } as const;
}

// Enquiry creation grants read-only tracking, never internal CRM access.
export const buyerEnquirySelect = {
  id: true, name: true, phone: true, message: true, stage: true,
  contactAction: true, createdAt: true,
  property: { select: { id: true, title: true } }
} satisfies Prisma.LeadSelect;

export function buyerEnquiryData(lead: {
  id: string; name: string; phone: string | null; message: string | null;
  stage: LeadStage; contactAction: string | null; createdAt: Date;
  property?: { id: string; title: string } | null;
}) {
  return {
    id: lead.id, name: lead.name, phone: lead.phone, message: lead.message,
    stage: lead.stage, contactAction: lead.contactAction, createdAt: lead.createdAt,
    property: lead.property ? { id: lead.property.id, title: lead.property.title } : null
  };
}

export function canAccessLeadCrm(
  lead: { assignedTo: string | null; property?: { ownerId: string | null } | null },
  profile: { id: string; role: string }
) {
  return isAdminRole(profile.role) || lead.assignedTo === profile.id || lead.property?.ownerId === profile.id;
}

export async function getBuyerEnquiry(leadId: string, profileId: string) {
  return db.lead.findFirst({ where: { id: leadId, userId: profileId }, select: buyerEnquirySelect });
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
