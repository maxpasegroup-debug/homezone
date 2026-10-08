import { Prisma } from "@prisma/client";
import { handleApiError, ok, parseJson, rateLimited, validationError } from "@/lib/api/response";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { passwordSignUpSchema } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit({
      key: rateLimitKey(request, "auth:password-signup"),
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) return rateLimited(limit.resetAt);

    const parsed = await parseJson(request, passwordSignUpSchema);
    if ("error" in parsed) return parsed.error;

    const email = parsed.data.email.trim().toLowerCase();
    const passwordHash = await hashPassword(parsed.data.password);

    const user = await db.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordCredential: {
          create: {
            passwordHash
          }
        },
        profile: {
          create: {
            fullName: parsed.data.name,
            role: "USER"
          }
        }
      },
      select: {
        email: true,
        id: true,
        name: true
      }
    });

    return ok({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return validationError(error, "An account with this email already exists.");
    }

    return handleApiError(error, {
      route: "POST /api/auth/password/signup"
    });
  }
}
