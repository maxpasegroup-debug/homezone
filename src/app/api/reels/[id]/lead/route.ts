import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { reelLeadSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "reels:lead", session.user.id),
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, reelLeadSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const { id } = await context.params;
    const profile = await getOrCreateProfile(session.user);
    const reel = await db.propertyReel.findUnique({
      where: {
        id
      },
      select: {
        ownerId: true,
        propertyId: true,
        title: true
      }
    });

    if (!reel) {
      return notFound("Reel not found");
    }

    const lead = await db.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          assignedTo: reel.ownerId,
          contactAction: parsed.data.contactAction,
          message: parsed.data.message,
          name: parsed.data.name,
          phone: parsed.data.phone,
          propertyId: reel.propertyId,
          reelId: id,
          source: "REEL",
          userId: profile.id,
          aiScore: 65
        }
      });

      await tx.propertyReel.update({
        where: {
          id
        },
        data: {
          leadsCount: {
            increment: 1
          }
        }
      });

      if (reel.propertyId) {
        await tx.property.update({
          where: {
            id: reel.propertyId
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
      actorId: profile.id,
      entityId: lead.id,
      entityType: "lead",
      metadata: {
        contactAction: parsed.data.contactAction,
        propertyId: reel.propertyId,
        reelId: id,
        source: "REEL"
      }
    });

    if (parsed.data.contactAction === "CALL") {
      await auditLog({
        action: "CALL_CLICKED",
        actorId: profile.id,
        entityId: id,
        entityType: "reel",
        metadata: {
          leadId: lead.id,
          propertyId: reel.propertyId
        }
      });
    }

    if (parsed.data.contactAction === "WHATSAPP") {
      await auditLog({
        action: "WHATSAPP_CLICKED",
        actorId: profile.id,
        entityId: id,
        entityType: "reel",
        metadata: {
          leadId: lead.id,
          propertyId: reel.propertyId
        }
      });
    }

    return ok({
      leadId: lead.id,
      ok: true
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reels/[id]/lead"
    });
  }
}
