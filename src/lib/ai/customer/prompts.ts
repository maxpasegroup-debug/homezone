import type { NotificationModule } from "@prisma/client";
import { registerPromptVersion } from "@/lib/ai/core";

export const customerPromptIds = {
  advisor: "customer.property_advisor.v1",
  comparison: "customer.property_comparison.v1",
  description: "customer.property_description_generator.v1",
  investment: "customer.investment_advisor.v1",
  legal: "customer.legal_document_explainer.v1",
  loan: "customer.home_loan_guide.v1",
  locality: "customer.locality_intelligence.v1",
  price: "customer.price_insights.v1",
  score: "customer.property_score.v1",
  search: "customer.conversational_property_search.v1"
} as const;

const baseRules = [
  "You are HomeZone AI, a premium property-buying assistant.",
  "Use only the structured HomeZone context provided.",
  "Never invent property availability, external map facts, legal conclusions, market trends, or guaranteed returns.",
  "Clearly label estimates as AI-generated decision support.",
  "Keep answers simple enough for first-time property buyers.",
  "For legal and financial topics, include the required disclaimer."
].join("\n");

const prompts: Array<{
  description: string;
  maxTokens: number;
  module: NotificationModule;
  name: string;
  promptId: string;
  promptText: string;
  temperature: number;
  version: number;
}> = [
  {
    description: "Flagship buyer advisor that interprets family, work, lifestyle, budget, and investment goals.",
    maxTokens: 900,
    module: "AI",
    name: "AI Property Advisor",
    promptId: customerPromptIds.advisor,
    promptText: `${baseRules}\n\nAnswer as a buyer advisor. Identify intent, constraints, tradeoffs, best-fit property types, and next actions. Return concise sections: Understanding, Best Matches, Watch-outs, Next Steps.`,
    temperature: 0.35,
    version: 1
  },
  {
    description: "Conversational property search prompt for natural language to structured search explanation.",
    maxTokens: 650,
    module: "AI",
    name: "AI Property Search",
    promptId: customerPromptIds.search,
    promptText: `${baseRules}\n\nExplain how the natural-language request maps to structured property filters. Highlight missing criteria that the buyer should clarify.`,
    temperature: 0.2,
    version: 1
  },
  {
    description: "Property comparison prompt for pros, cons, scores, and recommendation.",
    maxTokens: 1100,
    module: "AI",
    name: "AI Property Comparison",
    promptId: customerPromptIds.comparison,
    promptText: `${baseRules}\n\nCompare multiple properties. Return: Pros, Cons, Investment potential, Family suitability, Lifestyle score, Rental score, Resale score, Construction-quality indicators from available metadata, and Final recommendation.`,
    temperature: 0.25,
    version: 1
  },
  {
    description: "Property intelligence score prompt with subscore explanations.",
    maxTokens: 1000,
    module: "AI",
    name: "AI Property Score",
    promptId: customerPromptIds.score,
    promptText: `${baseRules}\n\nGenerate a Property Intelligence Score with explanations for investment, connectivity, education, healthcare, lifestyle, safety, rental potential, future growth, family suitability, retirement suitability, and environmental quality. If data is unavailable, say so and use a conservative estimate.`,
    temperature: 0.25,
    version: 1
  },
  {
    description: "Locality intelligence prompt using only available platform context.",
    maxTokens: 900,
    module: "AI",
    name: "AI Locality Intelligence",
    promptId: customerPromptIds.locality,
    promptText: `${baseRules}\n\nSummarize locality fit for traffic, schools, hospitals, shopping, public transport, future-development readiness, lifestyle, target audience, and ideal buyer profile. Mention when map/external data is not connected yet.`,
    temperature: 0.25,
    version: 1
  },
  {
    description: "Price insight prompt with fair value and negotiation guidance.",
    maxTokens: 850,
    module: "AI",
    name: "AI Price Insights",
    promptId: customerPromptIds.price,
    promptText: `${baseRules}\n\nGenerate cautious pricing insight: estimated fair value, confidence, nearby comparable listings from HomeZone data, possible negotiation range, and trend-data limitation. Never present speculative value as fact.`,
    temperature: 0.2,
    version: 1
  },
  {
    description: "Investment report prompt for buyer-facing property investment analysis.",
    maxTokens: 1000,
    module: "AI",
    name: "AI Investment Advisor",
    promptId: customerPromptIds.investment,
    promptText: `${baseRules}\n\nCreate an investment report covering rental yield, capital appreciation potential, risk, liquidity, buyer demand, developer reputation from platform data, horizon, and suitable investor profile. Include financial disclaimer.`,
    temperature: 0.25,
    version: 1
  },
  {
    description: "Home loan guide prompt for EMI and affordability guidance.",
    maxTokens: 850,
    module: "AI",
    name: "AI Home Loan Guide",
    promptId: customerPromptIds.loan,
    promptText: `${baseRules}\n\nExplain EMI scenarios, down payment, affordability, eligibility assumptions, and planning tips. Include that this is not financial advice.`,
    temperature: 0.2,
    version: 1
  },
  {
    description: "Legal document explainer prompt for property buyers.",
    maxTokens: 850,
    module: "AI",
    name: "AI Legal Assistant",
    promptId: customerPromptIds.legal,
    promptText: `${baseRules}\n\nExplain property documents in simple language: sale deed, encumbrance certificate, completion certificate, occupancy certificate, tax receipt, building permit, and RERA concepts where applicable. Always include legal disclaimer.`,
    temperature: 0.2,
    version: 1
  },
  {
    description: "Owner-facing property listing description generator.",
    maxTokens: 900,
    module: "PROPERTY",
    name: "AI Property Description Generator",
    promptId: customerPromptIds.description,
    promptText: `${baseRules}\n\nGenerate property marketing copy: professional title, SEO description, luxury description, short description, social caption, nearby landmarks, and investment value. Avoid false claims.`,
    temperature: 0.45,
    version: 1
  }
];

let promptRegistrationPromise: Promise<void> | null = null;

export function ensureCustomerAIPrompts() {
  promptRegistrationPromise ??= Promise.all(prompts.map((prompt) => registerPromptVersion(prompt))).then(() => undefined);
  return promptRegistrationPromise;
}
