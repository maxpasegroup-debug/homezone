import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { serviceRequestSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized("Verified account required");
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "service-requests:create", session.user.id),
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, serviceRequestSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);

    const serviceRequest = await db.serviceRequest.create({
      data: {
        requesterId: profile.id,
        category: parsed.data.category,
        city: parsed.data.city,
        budget: parsed.data.budget,
        message: parsed.data.message
      }
    });

    await auditLog({
      action: "service_request_created",
      actorId: profile.id,
      entityId: serviceRequest.id,
      entityType: "service_request",
      metadata: {
        category: parsed.data.category,
        city: parsed.data.city
      }
    });

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/service-requests"
    });
  }
}
