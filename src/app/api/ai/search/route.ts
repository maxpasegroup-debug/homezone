import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited } from "@/lib/api/response";
import { aiSearchSchema } from "@/lib/api/validation";
import { runAIPropertySearch } from "@/lib/ai/companion";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { getOrCreateProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit({
      key: rateLimitKey(request, "ai:search"),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, aiSearchSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const session = await auth();
    const profile = session?.user ? await getOrCreateProfile(session.user) : null;
    const result = await runAIPropertySearch({
      language: parsed.data.language === "Malayalam" ? "MALAYALAM" : "AUTO",
      profileId: profile?.id,
      query: parsed.data.query
    });

    return ok(result);
  } catch (error) {
    await auditLog({
      action: "AI_USED",
      entityType: "ai",
      metadata: {
        action: "AI_SEARCH",
        route: "POST /api/ai/search",
        status: "failed"
      }
    });
    return handleApiError(error, {
      route: "POST /api/ai/search"
    });
  }
}
