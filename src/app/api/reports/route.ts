import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
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

    let reelOwnerId: string | null = null;

    if (parsed.data.entityType === "reel") {
      const reel = await db.propertyReel.findUnique({
        where: {
          id: parsed.data.entityId
        },
        select: {
          id: true,
          ownerId: true
        }
      });

      if (!reel) {
        return notFound("Reel not found");
      }

      const existingOpenReport = await db.auditLog.findFirst({
        where: {
          action: "user_report",
          actorId: profile.id,
          entityId: parsed.data.entityId,
          entityType: "reel",
          metadata: {
            path: ["status"],
            equals: "open"
          }
        },
        select: {
          id: true
        }
      });

      if (existingOpenReport) {
        return apiError("You have already reported this reel.", 409);
      }

      reelOwnerId = reel.ownerId;
    }

    const report = await db.auditLog.create({
      data: {
        actorId: profile.id,
        action: "user_report",
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        metadata: {
          ownerId: reelOwnerId,
          reason: parsed.data.reason,
          status: "open"
        }
      }
    });

    await auditLog({
      action: parsed.data.entityType === "reel" ? "REEL_REPORTED" : "report_submitted",
      actorId: profile.id,
      entityId: parsed.data.entityId,
      entityType: parsed.data.entityType,
      metadata: {
        reason: parsed.data.reason
      }
    });

    return ok({ report });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reports"
    });
  }
}
