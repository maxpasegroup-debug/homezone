import { handleApiError, ok, parseJson, rateLimited } from "@/lib/api/response";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { forgotPasswordSchema } from "@/lib/api/validation";
import { createResetToken, hashResetToken } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { authOrigin } from "@/lib/auth/redirect";
import { logger } from "@/lib/logging/logger";

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit({
      key: rateLimitKey(request, "auth:forgot-password"),
      limit: 5,
      windowMs: 60_000
    });

    if (!limit.allowed) return rateLimited(limit.resetAt);

    const parsed = await parseJson(request, forgotPasswordSchema);
    if ("error" in parsed) return parsed.error;

    const email = parsed.data.email.trim().toLowerCase();
    const user = await db.user.findUnique({
      where: {
        email
      }
    });

    if (user) {
      const token = createResetToken();
      const tokenHash = hashResetToken(token);
      await db.passwordResetToken.create({
        data: {
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          tokenHash,
          userId: user.id
        }
      });

      const origin = authOrigin();
      try {
        const delivery = await sendPasswordResetEmail({
          email,
          resetUrl: `${origin}/auth?flow=reset&token=${token}`
        });
        if (!delivery.sent) logger.error("Password recovery delivery unavailable");
      } catch {
        logger.error("Password recovery delivery unavailable");
      }
    }

    return ok({
      message: "If an account exists and delivery is available, you will receive password reset instructions."
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/auth/password/forgot"
    });
  }
}
