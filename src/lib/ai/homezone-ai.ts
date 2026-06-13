import { explainSearch, getPropertyMatches, parsePropertySearch } from "@/lib/ai-search";

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
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

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
  });

  if (!response.ok) {
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

  return {
    answer:
      "HomeZone AI demo response: I can help you search, compare, analyze, and understand property. For a serious decision, verify price, documents, location, rental demand, and visit the property before payment.",
    source: "fallback"
  };
}

export async function runAISearch(query: string) {
  const structured = parsePropertySearch(query);
  const matches = getPropertyMatches(structured);
  const localExplanation = explainSearch(structured);

  const aiSummary = await generateOpenAIText({
    system:
      "You are HomeZone AI. Convert property search intent into a simple explanation for a first-time real-estate user. Keep it under 70 words.",
    user: `User query: ${query}\nParsed search: ${JSON.stringify(structured)}`
  });

  return {
    structured,
    explanation: aiSummary ?? localExplanation,
    matches,
    source: aiSummary ? "openai" : "fallback"
  };
}
