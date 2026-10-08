import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forbidden, handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { businessAISchema } from "@/lib/api/validation";
import { runBusinessAITool } from "@/lib/ai/business/tools";
import { getOrCreateProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const limit = checkRateLimit({
      key: rateLimitKey(request, "ai:business", session.user.id),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) return rateLimited(limit.resetAt);

    const parsed = await parseJson(request, businessAISchema);
    if ("error" in parsed) return parsed.error;

    const profile = await getOrCreateProfile(session.user);
    const result = await runBusinessAITool({
      action: parsed.data.action,
      context: parsed.data.context,
      leadId: parsed.data.leadId,
      profileId: profile.id,
      role: profile.role
    });

    if (!result.allowed) return forbidden(result.summary);

    await auditLog({
      action: "AI_USED",
      actorId: profile.id,
      entityType: "ai",
      metadata: {
        action: `BUSINESS_AI_${parsed.data.action.toUpperCase()}`,
        leadId: parsed.data.leadId,
        role: profile.role,
        status: "success"
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
        action: "BUSINESS_AI",
        route: "POST /api/ai/business",
        status: "failed"
      }
    });
    return handleApiError(error, {
      route: "POST /api/ai/business"
    });
  }
}
