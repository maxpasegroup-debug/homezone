import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
<<<<<<< HEAD
import { apiError, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
=======
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
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
<<<<<<< HEAD

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

=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
    const report = await db.auditLog.create({
      data: {
        actorId: profile.id,
        action: "user_report",
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        metadata: {
<<<<<<< HEAD
          ownerId: reelOwnerId,
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
          reason: parsed.data.reason,
          status: "open"
        }
      }
    });

    await auditLog({
<<<<<<< HEAD
      action: parsed.data.entityType === "reel" ? "REEL_REPORTED" : "report_submitted",
      actorId: profile.id,
      entityId: parsed.data.entityId,
      entityType: parsed.data.entityType,
      metadata: {
        reason: parsed.data.reason
      }
=======
      action: "report_submitted",
      actorId: profile.id,
      entityId: parsed.data.entityId,
      entityType: parsed.data.entityType
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
    });

    return ok({ report });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/reports"
    });
  }
}
