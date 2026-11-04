import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forbidden, handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { serviceRequestSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { providerRequestWhere, serviceRequestSelect } from "@/lib/services/marketplace";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized("Verified account required");
    const profile = await getOrCreateProfile(session.user);
    if (profile.verificationStatus === "SUSPENDED") return forbidden();
    const provider = profile.role === "SERVICE_PROVIDER" ? await db.serviceProvider.findFirst({
      where: { profileId: profile.id, verified: true, suspended: false },
      select: { id: true, category: true, city: true }
    }) : null;
    const own = await db.serviceRequest.findMany({
      select: serviceRequestSelect(),
      orderBy: { createdAt: "desc" },
      where: { requesterId: profile.id },
      take: 100
    });
    const incoming = provider ? await db.serviceRequest.findMany({
      select: serviceRequestSelect(provider.id),
      orderBy: { createdAt: "desc" },
      where: { AND: [providerRequestWhere(provider), { requesterId: { not: profile.id } }] },
      take: 100
    }) : [];
    const requests = [...own, ...incoming].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
    return ok({ requests }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/service-requests" });
  }
}

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
        providerId: parsed.data.providerId,
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
