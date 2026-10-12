import { handleApiError, ok, parseJson, rateLimited, validationError } from "@/lib/api/response";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { resetPasswordSchema } from "@/lib/api/validation";
import { hashPassword, hashResetToken } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { changePassword } from "@/lib/auth/session-registry";

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit({
      key: rateLimitKey(request, "auth:reset-password"),
      limit: 8,
      windowMs: 60_000
    });

    if (!limit.allowed) return rateLimited(limit.resetAt);

    const parsed = await parseJson(request, resetPasswordSchema);
    if ("error" in parsed) return parsed.error;

    const tokenHash = hashResetToken(parsed.data.token);
    const resetToken = await db.passwordResetToken.findUnique({
      where: {
        tokenHash
      }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return validationError(null, "This reset link is invalid or expired.");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const changed = await db.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() }
      });
      if (claimed.count !== 1) return false;
      await changePassword(tx, resetToken.userId, passwordHash);
      return true;
    });
    if (!changed) return validationError(null, "This reset link is invalid or expired.");

    return ok({
      message: "Password reset successfully."
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/auth/password/reset"
    });
  }
}
