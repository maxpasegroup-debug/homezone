import type { AIProvider } from "@prisma/client";
import { env } from "@/lib/env";
import type { AIProviderClient, AIProviderRequest, AIProviderResponse } from "@/lib/ai/core/types";

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function usageFrom(request: AIProviderRequest, output: string, raw?: unknown): AIProviderResponse {
  const promptTokens = estimateTokens(request.messages.map((message) => message.content).join("\n"));
  const completionTokens = estimateTokens(output);
  return {
    completionTokens,
    output,
    promptTokens,
    raw,
    totalTokens: promptTokens + completionTokens
  };
}

class OpenAIProvider implements AIProviderClient {
  provider: AIProvider = "OPENAI";

  async completeText(request: AIProviderRequest) {
    if (!env.OPENAI_API_KEY) throw new Error("OpenAI API key is not configured");

    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: request.messages,
        max_output_tokens: request.maxTokens,
        model: request.model,
        temperature: request.temperature
      }),
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const data = await response.json();
    return usageFrom(request, typeof data.output_text === "string" ? data.output_text : "", data);
  }
}

class GeminiProvider implements AIProviderClient {
  provider: AIProvider = "GEMINI";

  async completeText(request: AIProviderRequest) {
    if (!env.GEMINI_API_KEY) throw new Error("Gemini API key is not configured");
    const text = request.messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            maxOutputTokens: request.maxTokens,
            temperature: request.temperature
          }
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      }
    );

    if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
    return usageFrom(request, output, data);
  }
}

class AnthropicProvider implements AIProviderClient {
  provider: AIProvider = "ANTHROPIC";

  async completeText(request: AIProviderRequest) {
    if (!env.ANTHROPIC_API_KEY) throw new Error("Anthropic API key is not configured");
    const system = request.messages.find((message) => message.role === "system")?.content;
    const messages = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        content: message.content,
        role: message.role === "assistant" ? "assistant" : "user"
      }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      body: JSON.stringify({
        max_tokens: request.maxTokens ?? 700,
        messages,
        model: request.model,
        system,
        temperature: request.temperature
      }),
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY
      },
      method: "POST"
    });

    if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
    const data = await response.json();
    const output = data.content?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
    return usageFrom(request, output, data);
  }
}

const providers: Record<AIProvider, AIProviderClient> = {
  ANTHROPIC: new AnthropicProvider(),
  GEMINI: new GeminiProvider(),
  OPENAI: new OpenAIProvider()
};

export function getAIProvider(provider: AIProvider) {
  return providers[provider];
}
