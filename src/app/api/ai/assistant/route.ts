<<<<<<< HEAD
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited } from "@/lib/api/response";
import { assistantSchema } from "@/lib/api/validation";
import { answerPropertyQuestion } from "@/lib/ai/homezone-ai";
<<<<<<< HEAD
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit({
      key: rateLimitKey(request, "ai:assistant"),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, assistantSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

<<<<<<< HEAD
    const session = await auth();
    const profile = session?.user ? await getOrCreateProfile(session.user) : null;
    const result = await answerPropertyQuestion(parsed.data.message);

    if (profile) {
      await db.aiReport.create({
        data: {
          input: {
            language: parsed.data.language,
            prompt: parsed.data.message
          },
          output: result,
          reportType: "AI_CHAT",
          userId: profile.id
        }
      }).catch(() => null);
    }

    await auditLog({
      action: "AI_USED",
      actorId: profile?.id,
      entityType: "ai",
      metadata: {
        action: "AI_CHAT",
        status: "success"
      }
    });

    return ok(result);
  } catch (error) {
    await auditLog({
      action: "AI_USED",
      entityType: "ai",
      metadata: {
        action: "AI_CHAT",
        route: "POST /api/ai/assistant",
        status: "failed"
      }
    });
=======
    const result = await answerPropertyQuestion(parsed.data.message);

    return ok(result);
  } catch (error) {
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
    return handleApiError(error, {
      route: "POST /api/ai/assistant"
    });
  }
}
