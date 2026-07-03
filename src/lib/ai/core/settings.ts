import type { AIProvider, NotificationModule } from "@prisma/client";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

const defaultModels: Record<AIProvider, string> = {
  ANTHROPIC: env.ANTHROPIC_MODEL,
  GEMINI: env.GEMINI_MODEL,
  OPENAI: env.OPENAI_MODEL
};

export async function getAISettings(module: NotificationModule) {
  const record = await db.aISetting.findUnique({
    where: { module }
  }).catch(() => null);

  const provider = record?.provider ?? "OPENAI";

  return {
    dailyCostLimit: Number(record?.dailyCostLimit ?? 0),
    enabled: record?.enabled ?? true,
    featureFlags: record?.featureFlags ?? {},
    maxTokens: record?.maxTokens ?? 700,
    model: record?.model ?? defaultModels[provider],
    provider,
    rateLimitPerMinute: record?.rateLimitPerMinute ?? 30,
    temperature: Number(record?.temperature ?? 0.4)
  };
}
