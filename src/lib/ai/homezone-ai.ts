import { explainSearch, getPropertyMatches, parsePropertySearch } from "@/lib/ai-search";
import { env, isProduction } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { getMarketplaceProperties } from "@/lib/properties/queries";

type OpenAITextOptions = {
  system: string;
  user: string;
  temperature?: number;
};

export async function generateOpenAIText({
  system,
  user,
  temperature = 0.4
}: OpenAITextOptions) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: system
        },
        {
          role: "user",
          content: user
        }
      ],
      temperature
    })
  }).catch((error) => {
    logger.warn("OpenAI request threw", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return null;
  });

  if (!response) {
    return null;
  }

  if (!response.ok) {
    logger.warn("OpenAI request failed", {
      status: response.status
    });
    return null;
  }

  const data = await response.json();
  const output = data.output_text;

  return typeof output === "string" ? output : null;
}

export async function answerPropertyQuestion(question: string) {
  const aiAnswer = await generateOpenAIText({
    system:
      "You are HomeZone AI, a premium but simple property companion for Indian and international real-estate users. Give practical, clear guidance. Avoid legal/financial guarantees. Suggest verification steps.",
    user: question
  });

  if (aiAnswer) {
    return {
      answer: aiAnswer,
      source: "openai"
    };
  }

  if (isProduction()) {
    return {
      answer:
        "HomeZone AI is temporarily unavailable. Please try again later or continue with standard property search.",
      source: "unavailable"
    };
  }

  return {
    answer:
      "HomeZone AI demo response: I can help you search, compare, analyze, and understand property. For a serious decision, verify price, documents, location, rental demand, and visit the property before payment.",
    source: "fallback"
  };
}

export async function runAISearch(query: string) {
  const structured = parsePropertySearch(query);
  const matches = await getMarketplaceProperties({
    city: structured.location,
    keyword: structured.propertyType ?? structured.raw,
    maxPrice: structured.budgetLakhs ? structured.budgetLakhs * 100000 : undefined,
    purpose: structured.intent
  });
  const localExplanation = explainSearch(structured);

  const aiSummary = await generateOpenAIText({
    system:
      "You are HomeZone AI. Convert property search intent into a simple explanation for a first-time real-estate user. Keep it under 70 words.",
    user: `User query: ${query}\nParsed search: ${JSON.stringify(structured)}`
  });

  return {
    structured,
    explanation: aiSummary ?? localExplanation,
    matches: matches.length ? matches : getPropertyMatches(structured),
    source: aiSummary ? "openai" : "database"
  };
}
