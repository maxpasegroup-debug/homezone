import type { AIProvider, NotificationModule, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type PromptConfig = {
  description?: string;
  maxTokens?: number;
  metadata?: Prisma.InputJsonValue;
  model?: string;
  module: NotificationModule;
  name: string;
  promptId: string;
  promptText: string;
  provider?: AIProvider;
  temperature?: number;
  version?: number;
};

export async function getActivePrompt(promptId: string) {
  return db.aIPrompt.findFirst({
    orderBy: {
      version: "desc"
    },
    where: {
      active: true,
      promptId
    }
  });
}

export async function registerPromptVersion({
  description,
  maxTokens,
  metadata = {},
  model,
  module,
  name,
  promptId,
  promptText,
  provider,
  temperature = 0.4,
  version = 1
}: PromptConfig) {
  await db.aIPrompt.updateMany({
    data: {
      active: false
    },
    where: {
      promptId
    }
  });

  return db.aIPrompt.upsert({
    create: {
      description,
      maxTokens,
      metadata,
      model,
      module,
      name,
      promptId,
      promptText,
      provider,
      temperature,
      version
    },
    update: {
      active: true,
      description,
      maxTokens,
      metadata,
      model,
      module,
      name,
      promptText,
      provider,
      temperature
    },
    where: {
      promptId_version: {
        promptId,
        version
      }
    }
  });
}
