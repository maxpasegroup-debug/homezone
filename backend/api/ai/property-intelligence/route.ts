import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited } from "@/lib/api/response";
import { aiPropertyIntelligenceSchema } from "@/lib/api/validation";
import { customerAITools } from "@/lib/ai/customer/tools";
import { getOrCreateProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const limit = checkRateLimit({
      key: rateLimitKey(request, "ai:property-intelligence", session?.user?.id),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) return rateLimited(limit.resetAt);

    const parsed = await parseJson(request, aiPropertyIntelligenceSchema);
    if ("error" in parsed) return parsed.error;

    const profile = session?.user ? await getOrCreateProfile(session.user) : null;
    const tool = customerAITools[parsed.data.action];
    const result = await tool({
      documentType: parsed.data.documentType,
      loan: parsed.data.loan,
      profileId: profile?.id,
      propertyId: parsed.data.propertyId,
      propertyIds: parsed.data.propertyIds,
      query: parsed.data.query
    });

    await auditLog({
      action: "AI_USED",
      actorId: profile?.id,
      entityType: "ai",
      metadata: {
        action: `CUSTOMER_AI_${parsed.data.action.toUpperCase()}`,
        propertyId: parsed.data.propertyId,
        status: result ? "success" : "not_found"
      }
    });

    return ok({
      action: parsed.data.action,
      result
    });
  } catch (error) {
    await auditLog({
      action: "AI_USED",
      entityType: "ai",
      metadata: {
        action: "CUSTOMER_AI_PROPERTY_INTELLIGENCE",
        route: "POST /api/ai/property-intelligence",
        status: "failed"
      }
    });
    return handleApiError(error, {
      route: "POST /api/ai/property-intelligence"
    });
  }
}
