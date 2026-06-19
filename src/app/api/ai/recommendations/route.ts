import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited } from "@/lib/api/response";
import { aiRecommendationSchema } from "@/lib/api/validation";
import { getAIRecommendations } from "@/lib/ai/companion";
import { getOrCreateProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const limit = checkRateLimit({
      key: rateLimitKey(request, "ai:recommendations", session?.user?.id),
      limit: 20,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, aiRecommendationSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = session?.user ? await getOrCreateProfile(session.user) : null;
    const result = await getAIRecommendations({
      language: parsed.data.language,
      locationPreference: parsed.data.locationPreference,
      profileId: profile?.id
    });

    return ok(result);
  } catch (error) {
    await auditLog({
      action: "AI_USED",
      entityType: "ai",
      metadata: {
        action: "AI_RECOMMENDATION",
        route: "POST /api/ai/recommendations",
        status: "failed"
      }
    });
    return handleApiError(error, {
      route: "POST /api/ai/recommendations"
    });
  }
}
