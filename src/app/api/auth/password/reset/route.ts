import { handleApiError, ok, parseJson, rateLimited, validationError } from "@/lib/api/response";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { resetPasswordSchema } from "@/lib/api/validation";
import { hashPassword, hashResetToken } from "@/lib/auth/password";
import { db } from "@/lib/db";

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
    await db.$transaction([
      db.passwordCredential.upsert({
        create: {
          passwordHash,
          userId: resetToken.userId
        },
        update: {
          passwordHash
        },
        where: {
          userId: resetToken.userId
        }
      }),
      db.passwordResetToken.update({
        data: {
          usedAt: new Date()
        },
        where: {
          id: resetToken.id
        }
      })
    ]);

    return ok({
      message: "Password reset successfully."
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/auth/password/reset"
    });
  }
}
