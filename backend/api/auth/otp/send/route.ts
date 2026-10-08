import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { otpSendSchema } from "@/lib/api/validation";
import { createOtpCode, hashOtp, normalizePhone, sendOtpMessage, shouldExposeOtpInResponse } from "@/lib/auth/otp";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "otp:send", session.user.id),
      limit: 5,
      windowMs: 15 * 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, otpSendSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const phone = normalizePhone(parsed.data.phone);
    const code = createOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60_000);

    await db.otpChallenge.create({
      data: {
        codeHash: hashOtp(phone, code),
        expiresAt,
        phone,
        userId: session.user.id
      }
    });

    const delivery = await sendOtpMessage(phone, code);

    await auditLog({
      action: "otp_requested",
      actorId: profile.id,
      entityId: profile.id,
      entityType: "profile",
      metadata: {
        delivered: delivery.delivered,
        phone,
        provider: delivery.provider
      }
    });

    return ok({
      delivery,
      devCode: shouldExposeOtpInResponse() ? code : undefined,
      expiresAt,
      ok: true
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/auth/otp/send"
    });
  }
}
