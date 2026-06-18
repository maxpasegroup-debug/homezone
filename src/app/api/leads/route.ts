import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
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
      actorId: profile.id,
      entityId: lead.id,
      entityType: "lead",
      metadata: {
        propertyId: parsed.data.propertyId,
        source: parsed.data.source
      }
    });

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/leads"
    });
  }
}
