import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import {
  forbidden,
  handleApiError,
  ok,
  parseJson,
  rateLimited,
  unauthorized
} from "@/lib/api/response";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { profileVerificationSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { profileVerificationEvent } from "@/lib/trust/verification";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const admin = await getOrCreateProfile(session.user);

    if (!isAdminRole(admin.role)) {
      return forbidden();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "admin:profiles:verify", session.user.id),
      limit: 60,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    const parsed = await parseJson(request, profileVerificationSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const existing = await db.profile.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!existing || (existing.role !== "BROKER" && existing.role !== "BUILDER")) {
      return forbidden("Only broker and builder profiles can be verified here");
    }

    const now = new Date();
    const profile = await db.profile.update({
      where: {
        id
      },
      data: {
        verificationNotes: parsed.data.note,
        verificationStatus: parsed.data.status,
        verifiedAt: now,
        verifiedBy: admin.id
      }
    });

    await auditLog({
      action: profileVerificationEvent({
        role: existing.role,
        status: parsed.data.status
      }),
      actorId: admin.id,
      entityId: profile.id,
      entityType: existing.role.toLowerCase(),
      metadata: {
        note: parsed.data.note,
        role: existing.role,
        status: parsed.data.status
      }
    });

    return ok({ profile });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/profiles/[id]/verify"
    });
  }
}
