import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { otpVerifySchema } from "@/lib/api/validation";
import { hashOtp, normalizePhone } from "@/lib/auth/otp";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "otp:verify", session.user.id),
      limit: 10,
      windowMs: 15 * 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, otpVerifySchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const phone = normalizePhone(parsed.data.phone);
    const profile = await getOrCreateProfile(session.user);
    const challenge = await db.otpChallenge.findFirst({
      where: {
        codeHash: hashOtp(phone, parsed.data.code),
        consumedAt: null,
        expiresAt: {
          gt: new Date()
        },
        phone,
        userId: session.user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!challenge) {
      await auditLog({
        action: "otp_verify_failed",
        actorId: profile.id,
        entityId: profile.id,
        entityType: "profile",
        metadata: {
          phone
        }
      });

      return apiError("Invalid or expired OTP code", 400);
    }

    await db.$transaction([
      db.otpChallenge.update({
        where: {
          id: challenge.id
        },
        data: {
          attempts: {
            increment: 1
          },
          consumedAt: new Date()
        }
      }),
      db.profile.update({
        where: {
          id: profile.id
        },
        data: {
          phone,
          whatsappVerified: true
        }
      })
    ]);

    await auditLog({
      action: "phone_verified",
      actorId: profile.id,
      entityId: profile.id,
      entityType: "profile",
      metadata: {
        phone
      }
    });

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/auth/otp/verify"
    });
  }
}
