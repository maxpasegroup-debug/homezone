import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited } from "@/lib/api/response";
import { aiAreaSchema } from "@/lib/api/validation";
import { getAIAreaRecommendations } from "@/lib/ai/companion";
import { getOrCreateProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const limit = checkRateLimit({
      key: rateLimitKey(request, "ai:areas", session?.user?.id),
      limit: 20,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, aiAreaSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = session?.user ? await getOrCreateProfile(session.user) : null;
    const result = await getAIAreaRecommendations({
      language: parsed.data.language,
      profileId: profile?.id,
      query: parsed.data.query
    });

    return ok(result);
  } catch (error) {
    await auditLog({
      action: "AI_USED",
      entityType: "ai",
      metadata: {
        action: "AI_AREA_QUERY",
        route: "POST /api/ai/areas",
        status: "failed"
      }
    });
    return handleApiError(error, {
      route: "POST /api/ai/areas"
    });
  }
}
