import { auth } from "@/auth";
import type { Prisma } from "@prisma/client";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { aiPromptSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { registerPromptVersion } from "@/lib/ai/core";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if (!isAdminRole(profile.role)) return forbidden();

    const prompts = await db.aIPrompt.findMany({
      orderBy: [
        {
          promptId: "asc"
        },
        {
          version: "desc"
        }
      ],
      take: 200
    });

    return ok({ prompts });
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/admin/ai/prompts"
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if (!isAdminRole(profile.role)) return forbidden();

    const parsed = await parseJson(request, aiPromptSchema);
    if ("error" in parsed) return parsed.error;

    const prompt = await registerPromptVersion({
      ...parsed.data,
      metadata: (parsed.data.metadata ?? {}) as Prisma.InputJsonValue
    });
    return ok({ prompt }, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/admin/ai/prompts"
    });
  }
}
