import { auth } from "@/auth";
import type { ReportEntityType } from "@prisma/client";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { reportSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { createReport } from "@/lib/platform/reports";

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

    const existingOpenReport = await db.report.findFirst({
      select: {
        id: true
      },
      where: {
        entityId: parsed.data.entityId,
        entityType: parsed.data.entityType as ReportEntityType,
        reporterId: profile.id,
        status: {
          in: ["PENDING", "UNDER_REVIEW", "ESCALATED"]
        }
      }
    });

    if (existingOpenReport) {
      return apiError("You have already reported this item.", 409);
    }

    const report = await createReport({
      entityId: parsed.data.entityId,
      entityType: parsed.data.entityType as ReportEntityType,
      reason: parsed.data.reason,
      reporterId: profile.id
    });

    return ok({ report });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reports"
    });
  }
}
