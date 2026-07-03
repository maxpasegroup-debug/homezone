import { explainSearch, getPropertyMatches, parsePropertySearch } from "@/lib/ai-search";
import { runAIText } from "@/lib/ai/core";
import { isProduction } from "@/lib/env";
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
  const result = await runAIText({
    metadata: {
      legacyFunction: "generateOpenAIText"
    },
    module: "AI",
    promptText: system,
    temperature,
    userText: user
  });

  return result.output;
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
        "HomeZone AI local response: I can help you search, compare, analyze, and understand property. For a serious decision, verify price, documents, location, rental demand, and visit the property before payment.",
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
