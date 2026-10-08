import { auth } from "@/auth";
import type { Prisma } from "@prisma/client";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { aiSettingSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { getAISettings } from "@/lib/ai/core";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if (!isAdminRole(profile.role)) return forbidden();

    const settings = await db.aISetting.findMany({
      orderBy: {
        module: "asc"
      }
    });

    return ok({ settings });
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/admin/ai/settings"
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if (!isAdminRole(profile.role)) return forbidden();

    const parsed = await parseJson(request, aiSettingSchema);
    if ("error" in parsed) return parsed.error;

    const defaults = await getAISettings(parsed.data.module);
    const data = {
      dailyCostLimit: parsed.data.dailyCostLimit ?? defaults.dailyCostLimit,
      enabled: parsed.data.enabled ?? defaults.enabled,
      featureFlags: (parsed.data.featureFlags ?? defaults.featureFlags ?? {}) as Prisma.InputJsonValue,
      maxTokens: parsed.data.maxTokens ?? defaults.maxTokens,
      model: parsed.data.model ?? defaults.model,
      module: parsed.data.module,
      provider: parsed.data.provider ?? defaults.provider,
      rateLimitPerMinute: parsed.data.rateLimitPerMinute ?? defaults.rateLimitPerMinute,
      temperature: parsed.data.temperature ?? defaults.temperature
    };

    const setting = await db.aISetting.upsert({
      create: data,
      update: data,
      where: {
        module: parsed.data.module
      }
    });

    return ok({ setting });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/admin/ai/settings"
    });
  }
}
