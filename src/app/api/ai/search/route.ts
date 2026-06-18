import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited } from "@/lib/api/response";
import { aiSearchSchema } from "@/lib/api/validation";
import { runAISearch } from "@/lib/ai/homezone-ai";

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

    const result = await runAISearch(parsed.data.query);

    return ok(result);
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/ai/search"
    });
  }
}
