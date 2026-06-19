import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
<<<<<<< HEAD
import { handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
=======
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
import { leadSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

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

<<<<<<< HEAD
    if (parsed.data.propertyId) {
      const property = await db.property.findUnique({
        where: {
          id: parsed.data.propertyId
        },
        select: {
          id: true
        }
      });

      if (!property) {
        return notFound("Property not found");
      }
    }

    const lead = await db.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          contactAction: parsed.data.contactAction,
          propertyId: parsed.data.propertyId,
          reelId: parsed.data.reelId,
          userId: profile.id,
          name: parsed.data.name,
          phone: parsed.data.phone,
          message: parsed.data.message,
          source: parsed.data.source,
          aiScore: 60
        }
      });

      if (parsed.data.propertyId) {
        await tx.property.update({
          where: {
            id: parsed.data.propertyId
          },
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
          }
        });
      }

      return createdLead;
    });

    await auditLog({
      action: "LEAD_CREATED",
=======
    const lead = await db.lead.create({
      data: {
        propertyId: parsed.data.propertyId,
        userId: profile.id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        message: parsed.data.message,
        source: parsed.data.source,
        aiScore: 60
      }
    });

    await auditLog({
      action: "lead_created",
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
      actorId: profile.id,
      entityId: lead.id,
      entityType: "lead",
      metadata: {
<<<<<<< HEAD
        contactAction: parsed.data.contactAction,
        propertyId: parsed.data.propertyId,
        reelId: parsed.data.reelId,
=======
        propertyId: parsed.data.propertyId,
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
        source: parsed.data.source
      }
    });

<<<<<<< HEAD
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

=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/leads"
    });
  }
}
