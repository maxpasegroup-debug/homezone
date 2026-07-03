import type { AIProvider, NotificationModule } from "@prisma/client";

export type AITextMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type AIProviderRequest = {
  maxTokens?: number;
  messages: AITextMessage[];
  model: string;
  temperature: number;
};

export type AIProviderResponse = {
  completionTokens: number;
  output: string;
  promptTokens: number;
  raw?: unknown;
  totalTokens: number;
};

export type AIProviderClient = {
  completeText: (request: AIProviderRequest) => Promise<AIProviderResponse>;
  provider: AIProvider;
};

export type AIContextBlock = {
  key: string;
  module: NotificationModule;
  priority?: number;
  value: unknown;
};

export type RunAITextInput = {
  context?: AIContextBlock[];
  conversationId?: string;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
  module: NotificationModule;
  promptId?: string;
  promptText?: string;
  provider?: AIProvider;
  sessionId?: string;
  temperature?: number;
  userId?: string | null;
  userText: string;
};

export type RunAITextResult = {
  conversationId?: string;
  output: string | null;
  provider: AIProvider;
  source: "provider" | "fallback" | "blocked" | "unavailable";
  usageLogId?: string;
};
