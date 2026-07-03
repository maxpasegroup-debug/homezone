import type { AIProvider, AIRequestStatus, NotificationModule, Prisma } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";

const costPerMillionTokens: Record<AIProvider, number> = {
  ANTHROPIC: 1.25,
  GEMINI: 0.35,
  OPENAI: 0.6
};

export function estimateAICost(provider: AIProvider, totalTokens: number) {
  return (costPerMillionTokens[provider] * totalTokens) / 1_000_000;
}

export async function logAIUsage({
  completionTokens,
  context,
  conversationId,
  error,
  latencyMs,
  metadata = {},
  model,
  module,
  promptId,
  promptRecordId,
  promptTokens,
  promptVersion,
  provider,
  result,
  status,
  userId
}: {
  completionTokens: number;
  context?: Prisma.InputJsonValue;
  conversationId?: string;
  error?: string;
  latencyMs: number;
  metadata?: Prisma.InputJsonValue;
  model: string;
  module: NotificationModule;
  promptId?: string;
  promptRecordId?: string;
  promptTokens: number;
  promptVersion?: number;
  provider: AIProvider;
  result?: Prisma.InputJsonValue;
  status: AIRequestStatus;
  userId?: string | null;
}) {
  const totalTokens = promptTokens + completionTokens;
  const usage = await db.aIUsageLog.create({
    data: {
      completionTokens,
      context: context ?? {},
      conversationId,
      error,
      estimatedCost: estimateAICost(provider, totalTokens),
      latencyMs,
      metadata,
      model,
      module,
      promptId,
      promptRecordId,
      promptTokens,
      promptVersion,
      provider,
      result: result ?? {},
      status,
      totalTokens,
      userId
    }
  });

  await auditLog({
    action: "AI_CORE_REQUEST",
    actorId: userId,
    entityId: usage.id,
    entityType: "ai_usage",
    metadata: {
      model,
      module,
      promptId,
      promptVersion,
      provider,
      status,
      totalTokens
    }
  });

  return usage;
}

export async function getAIAnalytics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [requests, tokens, costs, errors, prompts, modules, providers] = await Promise.all([
    db.aIUsageLog.count({ where: { createdAt: { gte: since } } }),
    db.aIUsageLog.aggregate({ _sum: { totalTokens: true }, where: { createdAt: { gte: since } } }),
    db.aIUsageLog.aggregate({ _sum: { estimatedCost: true }, _avg: { latencyMs: true }, where: { createdAt: { gte: since } } }),
    db.aIUsageLog.count({ where: { createdAt: { gte: since }, status: { in: ["FAILED", "BLOCKED"] } } }),
    db.aIUsageLog.groupBy({ by: ["promptId"], _count: { _all: true }, orderBy: { _count: { promptId: "desc" } }, where: { createdAt: { gte: since }, promptId: { not: null } }, take: 10 }),
    db.aIUsageLog.groupBy({ by: ["module"], _count: { _all: true }, where: { createdAt: { gte: since } } }),
    db.aIUsageLog.groupBy({ by: ["provider"], _count: { _all: true }, where: { createdAt: { gte: since } } })
  ]);

  return {
    avgLatencyMs: Math.round(costs._avg.latencyMs ?? 0),
    costs: Number(costs._sum.estimatedCost ?? 0),
    errors,
    modules,
    popularPrompts: prompts,
    providers,
    requests,
    tokens: tokens._sum.totalTokens ?? 0
  };
}
