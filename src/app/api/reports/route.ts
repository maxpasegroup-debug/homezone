import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { reportSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "reports:create", session.user.id),
      limit: 5,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, reportSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const report = await db.auditLog.create({
      data: {
        actorId: profile.id,
        action: "user_report",
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        metadata: {
          reason: parsed.data.reason,
          status: "open"
        }
      }
    });

    await auditLog({
      action: "report_submitted",
      actorId: profile.id,
      entityId: parsed.data.entityId,
      entityType: parsed.data.entityType
    });

    return ok({ report });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reports"
    });
  }
}
