import type { AIMessageRole, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { getAIProvider } from "@/lib/ai/core/providers";
import { getActivePrompt } from "@/lib/ai/core/registry";
import { redactPII, safetySystemSuffix, validatePromptInput } from "@/lib/ai/core/safety";
import { getAISettings } from "@/lib/ai/core/settings";
import { logAIUsage } from "@/lib/ai/core/usage";
import { getAIMemory } from "@/lib/ai/core/memory";
import { serializeAIContext } from "@/lib/ai/core/context";
import type { AITextMessage, RunAITextInput, RunAITextResult } from "@/lib/ai/core/types";

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function normalizeMessages(messages: { role: AIMessageRole; content: string }[]): AITextMessage[] {
  return messages.map((message) => ({
    content: message.content,
    role: message.role.toLowerCase() as AITextMessage["role"]
  }));
}

async function resolveConversation(input: RunAITextInput) {
  if (input.conversationId) {
    return db.aIConversation.findUnique({
      include: {
        messages: {
          orderBy: {
            createdAt: "asc"
          },
          take: 30
        }
      },
      where: {
        id: input.conversationId
      }
    });
  }

  if (!input.userId && !input.sessionId) return null;

  const existing = input.sessionId
    ? await db.aIConversation.findFirst({
        include: {
          messages: {
            orderBy: {
              createdAt: "asc"
            },
            take: 30
          }
        },
        where: {
          module: input.module,
          sessionId: input.sessionId,
          userId: input.userId ?? undefined
        }
      })
    : null;

  if (existing) return existing;

  return db.aIConversation.create({
    data: {
      metadata: toPrismaJson(input.metadata),
      module: input.module,
      sessionId: input.sessionId,
      title: input.userText.slice(0, 90),
      userId: input.userId ?? undefined
    },
    include: {
      messages: true
    }
  });
}

async function recordMessage(conversationId: string | undefined, userId: string | null | undefined, role: AIMessageRole, content: string, metadata: Prisma.InputJsonValue = {}) {
  if (!conversationId) return null;

  return db.aIMessage.create({
    data: {
      content,
      conversationId,
      metadata,
      role,
      userId: userId ?? undefined
    }
  });
}

export async function runAIText(input: RunAITextInput): Promise<RunAITextResult> {
  const startedAt = Date.now();
  const settings = await getAISettings(input.module);
  const promptRecord = input.promptId ? await getActivePrompt(input.promptId) : null;
  const provider = input.provider ?? promptRecord?.provider ?? settings.provider;
  const model = promptRecord?.model ?? settings.model;
  const temperature = input.temperature ?? Number(promptRecord?.temperature ?? settings.temperature);
  const maxTokens = input.maxTokens ?? promptRecord?.maxTokens ?? settings.maxTokens;
  const promptText = promptRecord?.promptText ?? input.promptText ?? "";
  const validation = validatePromptInput(input.userText);

  if (!settings.enabled) {
    return {
      output: null,
      provider,
      source: "unavailable"
    };
  }

  if (!validation.allowed) {
    const usage = await logAIUsage({
      completionTokens: 0,
      error: validation.reason,
      latencyMs: Date.now() - startedAt,
      metadata: toPrismaJson(input.metadata),
      model,
      module: input.module,
      promptId: promptRecord?.promptId ?? input.promptId,
      promptRecordId: promptRecord?.id,
      promptTokens: 0,
      promptVersion: promptRecord?.version,
      provider,
      status: "BLOCKED",
      userId: input.userId
    });

    return {
      output: null,
      provider,
      source: "blocked",
      usageLogId: usage.id
    };
  }

  const conversation = await resolveConversation(input);
  const conversationHistory = conversation?.messages ? normalizeMessages(conversation.messages) : [];
  const contextText = serializeAIContext(input.context);
  const memories = await getAIMemory({
    conversationId: conversation?.id,
    userId: input.userId
  });
  const memoryText = memories.length
    ? `AI Memory:\n${JSON.stringify(memories.map((memory) => ({ key: memory.key, scope: memory.scope, value: memory.value })), null, 2)}`
    : "";
  const redactedUserText = redactPII(input.userText);
  const system = [
    promptText,
    contextText ? `Structured Context:\n${contextText}` : "",
    memoryText,
    safetySystemSuffix(input.userText)
  ].filter(Boolean).join("\n\n");
  const messages: AITextMessage[] = [
    {
      content: system || "You are HomeZone AI Core. Provide concise, safe, practical responses.",
      role: "system"
    },
    ...conversationHistory.filter((message) => message.role !== "system"),
    {
      content: redactedUserText,
      role: "user"
    }
  ];

  await recordMessage(conversation?.id, input.userId, "USER", redactedUserText, toPrismaJson({ redacted: redactedUserText !== input.userText }));

  try {
    const response = await getAIProvider(provider).completeText({
      maxTokens,
      messages,
      model,
      temperature
    });
    await recordMessage(conversation?.id, input.userId, "ASSISTANT", response.output);

    const usage = await logAIUsage({
      completionTokens: response.completionTokens,
      context: toPrismaJson({
        blocks: input.context ?? [],
        conversationId: conversation?.id,
        memoryCount: memories.length
      }),
      conversationId: conversation?.id,
      latencyMs: Date.now() - startedAt,
      metadata: toPrismaJson(input.metadata),
      model,
      module: input.module,
      promptId: promptRecord?.promptId ?? input.promptId,
      promptRecordId: promptRecord?.id,
      promptTokens: response.promptTokens,
      promptVersion: promptRecord?.version,
      provider,
      result: toPrismaJson({
        preview: response.output.slice(0, 500)
      }),
      status: "SUCCESS",
      userId: input.userId
    });

    return {
      conversationId: conversation?.id,
      output: response.output,
      provider,
      source: "provider",
      usageLogId: usage.id
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI provider error";
    logger.warn("AI Core provider request failed", {
      error: message,
      module: input.module,
      provider
    });

    const usage = await logAIUsage({
      completionTokens: 0,
      context: toPrismaJson({
        blocks: input.context ?? [],
        conversationId: conversation?.id
      }),
      conversationId: conversation?.id,
      error: message,
      latencyMs: Date.now() - startedAt,
      metadata: toPrismaJson(input.metadata),
      model,
      module: input.module,
      promptId: promptRecord?.promptId ?? input.promptId,
      promptRecordId: promptRecord?.id,
      promptTokens: messages.reduce((total, item) => total + Math.ceil(item.content.length / 4), 0),
      promptVersion: promptRecord?.version,
      provider,
      status: "FAILED",
      userId: input.userId
    });

    return {
      conversationId: conversation?.id,
      output: null,
      provider,
      source: "unavailable",
      usageLogId: usage.id
    };
  }
}
