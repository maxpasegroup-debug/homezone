import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import {
  handleApiError,
  notFound,
  ok,
  parseJson,
  rateLimited,
  unauthorized
} from "@/lib/api/response";
import { leadInboxFilterSchema, leadSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, createLeadNotification, leadAccessWhere } from "@/lib/leads/access";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);
    const { searchParams } = new URL(request.url);
    const parsed = leadInboxFilterSchema.safeParse(Object.fromEntries(searchParams));
    const filters = parsed.success ? parsed.data : { q: undefined, stage: "ALL" as const };

    const leads = await db.lead.findMany({
      include: {
        _count: {
          select: {
            notes: true,
            tasks: true,
            timeline: true
          }
        },
        assigned: true,
        property: {
          include: {
            owner: true
          }
        },
        siteVisits: true,
        tasks: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100,
      where: {
        AND: [
          leadAccessWhere(profile.id),
          filters.stage !== "ALL"
            ? {
                stage: filters.stage
              }
            : {},
          filters.q
            ? {
                OR: [
                  { name: { contains: filters.q, mode: "insensitive" } },
                  { phone: { contains: filters.q, mode: "insensitive" } },
                  { email: { contains: filters.q, mode: "insensitive" } },
                  { property: { title: { contains: filters.q, mode: "insensitive" } } }
                ]
              }
            : {}
        ]
      }
    });

    return ok({ leads });
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/leads"
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized("Verified account required");
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "leads:create", session.user.id),
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, leadSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    let ownerId: string | null | undefined;

    if (parsed.data.propertyId) {
      const property = await db.property.findUnique({
        where: {
          id: parsed.data.propertyId
        }
      });

      if (!property) {
        return notFound("Property not found");
      }

      ownerId = property.ownerId;
    }

    const lead = await db.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          aiScore: 60,
          contactAction: parsed.data.contactAction,
          message: parsed.data.message,
          name: parsed.data.name,
          phone: parsed.data.phone,
          propertyId: parsed.data.propertyId,
          reelId: parsed.data.reelId,
          source: parsed.data.source,
          userId: profile.id
        }
      });

      await tx.leadTimelineEvent.create({
        data: {
          actorId: profile.id,
          eventType: "LEAD_CREATED",
          leadId: createdLead.id,
          message: "Buyer inquiry created.",
          metadata: {
            contactAction: parsed.data.contactAction,
            source: parsed.data.source
          }
        }
      });

      if (parsed.data.propertyId) {
        await tx.property.update({
          data: {
            callClicks:
              parsed.data.contactAction === "CALL"
                ? {
                    increment: 1
                  }
                : undefined,
            inquirySubmissions:
              parsed.data.contactAction === "INQUIRY"
                ? {
                    increment: 1
                  }
                : undefined,
            whatsappClicks:
              parsed.data.contactAction === "WHATSAPP"
                ? {
                    increment: 1
                  }
                : undefined
          },
          where: {
            id: parsed.data.propertyId
          }
        });
      }

      return createdLead;
    });

    await createLeadNotification({
      leadId: lead.id,
      message: `${parsed.data.name} contacted you about your property.`,
      recipientId: ownerId,
      title: "New property lead",
      type: "NEW_LEAD"
    });

    await addLeadTimeline({
      actorId: ownerId,
      eventType: "OWNER_NOTIFIED",
      leadId: lead.id,
      message: "Owner notification created."
    });

    await auditLog({
      action: "LEAD_CREATED",
      actorId: profile.id,
      entityId: lead.id,
      entityType: "lead",
      metadata: {
        contactAction: parsed.data.contactAction,
        propertyId: parsed.data.propertyId,
        reelId: parsed.data.reelId,
        source: parsed.data.source
      }
    });

    if (parsed.data.contactAction === "CALL") {
      await auditLog({
        action: "CALL_CLICKED",
        actorId: profile.id,
        entityId: parsed.data.propertyId,
        entityType: "property",
        metadata: {
          leadId: lead.id,
          source: parsed.data.source
        }
      });
    }

    if (parsed.data.contactAction === "WHATSAPP") {
      await auditLog({
        action: "WHATSAPP_CLICKED",
        actorId: profile.id,
        entityId: parsed.data.propertyId,
        entityType: "property",
        metadata: {
          leadId: lead.id,
          source: parsed.data.source
        }
      });
    }

    return ok({ lead, ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/leads"
    });
  }
}
