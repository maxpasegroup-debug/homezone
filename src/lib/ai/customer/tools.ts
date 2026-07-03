import type { Prisma } from "@prisma/client";
import { buildAIContext, runAIText } from "@/lib/ai/core";
import { db } from "@/lib/db";
import { parseAIPropertyFilters } from "@/lib/ai/companion";
import { customerPromptIds, ensureCustomerAIPrompts } from "@/lib/ai/customer/prompts";
import {
  getMarketplaceProperties,
  getMarketplacePropertiesByIds,
  getMarketplaceProperty,
  type MarketplaceProperty
} from "@/lib/properties/queries";

type CustomerAIInput = {
  profileId?: string | null;
  query?: string;
  propertyId?: string;
  propertyIds?: string[];
  documentType?: string;
  loan?: {
    downPayment?: number;
    interestRate?: number;
    loanAmount?: number;
    tenureYears?: number;
  };
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function compactProperty(property: MarketplaceProperty) {
  return {
    aiSummary: property.aiSummary,
    amenities: property.highlights,
    area: property.area,
    bathrooms: property.bathrooms,
    bedrooms: property.bedrooms,
    city: property.city,
    currency: property.currency,
    id: property.id,
    locality: property.locality,
    location: property.location,
    ownerName: property.ownerName,
    price: property.priceLabel,
    priceValue: property.priceValue,
    propertyScore: property.score,
    purpose: property.intent,
    rentalYield: property.rentalYield,
    type: property.type,
    verified: property.verified,
    verificationStatus: property.verificationStatus
  };
}

function fallbackScore(property: MarketplaceProperty) {
  const verifiedBoost = property.verified ? 6 : 0;
  const amenityBoost = Math.min(10, property.highlights.length * 2);
  const pricePenalty = property.priceValue ? 0 : -5;
  const base = Math.max(45, Math.min(92, Math.round(property.score * 0.72 + verifiedBoost + amenityBoost + pricePenalty)));

  return {
    overall: base,
    subscores: {
      connectivity: Math.min(92, base + 3),
      education: Math.min(90, base),
      environmentalQuality: Math.max(45, base - 3),
      familySuitability: Math.min(94, base + (property.bedrooms && property.bedrooms >= 3 ? 5 : 0)),
      futureGrowth: Math.min(90, base + 2),
      healthcare: Math.max(45, base - 2),
      investment: Math.min(92, base + (property.intent === "INVEST" ? 5 : 0)),
      lifestyle: Math.min(90, base + 1),
      rentalPotential: Math.min(88, base + (property.intent === "RENT" ? 6 : 0)),
      retirementSuitability: Math.max(45, base - 4),
      safety: Math.min(90, base + verifiedBoost)
    }
  };
}

function emiEstimate(loanAmount = 5000000, annualRate = 8.6, tenureYears = 20) {
  const monthlyRate = annualRate / 12 / 100;
  const months = tenureYears * 12;
  const emi = loanAmount * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
  return Math.round(emi);
}

async function saveCustomerReport({
  input,
  output,
  profileId,
  propertyId,
  reportType
}: {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  profileId?: string | null;
  propertyId?: string | null;
  reportType: string;
}) {
  if (!profileId && !propertyId) return null;

  return db.aiReport.create({
    data: {
      input: json(input),
      output: json(output),
      propertyId,
      reportType,
      userId: profileId
    }
  }).catch(() => null);
}

async function runCustomerAI({
  fallback,
  input,
  profileId,
  promptId,
  property,
  reportType,
  userText
}: {
  fallback: string;
  input: Record<string, unknown>;
  profileId?: string | null;
  promptId: string;
  property?: MarketplaceProperty | null;
  reportType: string;
  userText: string;
}) {
  await ensureCustomerAIPrompts();
  const result = await runAIText({
    context: buildAIContext({
      buyer: {
        input,
        profileId,
        task: reportType
      },
      property: property ? compactProperty(property) : undefined,
    }),
    metadata: {
      customerAI: true,
      reportType
    },
    module: "AI",
    promptId,
    userId: profileId,
    userText
  });
  const summary = result.output ?? fallback;

  await saveCustomerReport({
    input,
    output: {
      source: result.source,
      summary,
      usageLogId: result.usageLogId
    },
    profileId,
    propertyId: property?.id,
    reportType
  });

  return {
    source: result.source,
    summary,
    usageLogId: result.usageLogId
  };
}

export async function propertySearchTool(input: CustomerAIInput) {
  const query = input.query ?? "";
  const filters = parseAIPropertyFilters(query);
  const matches = await getMarketplaceProperties(filters);
  const ai = await runCustomerAI({
    fallback: `HomeZone converted your request into filters and found ${matches.length} matching properties.`,
    input: {
      filters,
      matches: matches.slice(0, 8).map(compactProperty),
      query
    },
    profileId: input.profileId,
    promptId: customerPromptIds.search,
    reportType: "CUSTOMER_AI_SEARCH",
    userText: query
  });

  return {
    ...ai,
    filters,
    matches
  };
}

export async function propertyAdvisorTool(input: CustomerAIInput) {
  const search = await propertySearchTool(input);
  const advisor = await runCustomerAI({
    fallback: "HomeZone can guide your property choice by balancing budget, family needs, commute, maintenance, and future value.",
    input: {
      query: input.query,
      searchFilters: search.filters,
      topMatches: search.matches.slice(0, 5).map(compactProperty)
    },
    profileId: input.profileId,
    promptId: customerPromptIds.advisor,
    reportType: "CUSTOMER_AI_ADVISOR",
    userText: input.query ?? "Guide my property decision"
  });

  return {
    ...advisor,
    matches: search.matches,
    searchExplanation: search.summary
  };
}

export async function propertyComparisonTool(input: CustomerAIInput) {
  const properties = await getMarketplacePropertiesByIds(input.propertyIds ?? []);
  const ai = await runCustomerAI({
    fallback: "This comparison uses available HomeZone property fields. Verify missing details before a site visit.",
    input: {
      properties: properties.map(compactProperty)
    },
    profileId: input.profileId,
    promptId: customerPromptIds.comparison,
    property: properties[0],
    reportType: "CUSTOMER_AI_COMPARISON",
    userText: `Compare these properties: ${properties.map((item) => item.title).join(", ")}`
  });

  return {
    ...ai,
    properties
  };
}

export async function propertyScoreTool(input: CustomerAIInput) {
  const property = input.propertyId ? await getMarketplaceProperty(input.propertyId) : null;
  if (!property) return null;

  const scores = fallbackScore(property);
  const ai = await runCustomerAI({
    fallback: "HomeZone generated a conservative property score from listing quality, verification, price availability, amenities, and marketplace signals.",
    input: {
      property: compactProperty(property),
      scores
    },
    profileId: input.profileId,
    promptId: customerPromptIds.score,
    property,
    reportType: "CUSTOMER_AI_PROPERTY_SCORE",
    userText: `Score ${property.title}`
  });

  return {
    ...ai,
    property,
    scores
  };
}

export async function localityIntelligenceTool(input: CustomerAIInput) {
  const property = input.propertyId ? await getMarketplaceProperty(input.propertyId) : null;
  const city = property?.city ?? input.query;
  const localProperties = await getMarketplaceProperties({ city });
  const ai = await runCustomerAI({
    fallback: "Locality intelligence is based on available HomeZone listings. External maps, traffic, and infrastructure feeds can be connected later.",
    input: {
      locality: property?.locality,
      city,
      nearbyListings: localProperties.slice(0, 8).map(compactProperty)
    },
    profileId: input.profileId,
    promptId: customerPromptIds.locality,
    property,
    reportType: "CUSTOMER_AI_LOCALITY",
    userText: input.query ?? `Explain locality fit for ${property?.location ?? city}`
  });

  return {
    ...ai,
    locality: property?.locality,
    city,
    nearbyListings: localProperties
  };
}

export async function priceInsightTool(input: CustomerAIInput) {
  const property = input.propertyId ? await getMarketplaceProperty(input.propertyId) : null;
  if (!property) return null;

  const comparableListings = (await getMarketplaceProperties({
    category: property.category,
    city: property.city,
    purpose: property.intent
  })).filter((item) => item.id !== property.id).slice(0, 6);
  const value = property.priceValue ?? 0;
  const negotiationLow = value ? Math.round(value * 0.94) : null;
  const negotiationHigh = value ? Math.round(value * 0.985) : null;
  const ai = await runCustomerAI({
    fallback: "HomeZone price insight is an AI-generated estimate using available listing data only. Confirm pricing with local comparable transactions.",
    input: {
      comparableListings: comparableListings.map(compactProperty),
      estimatedFairValue: property.priceLabel,
      negotiationRange: negotiationLow && negotiationHigh ? { high: negotiationHigh, low: negotiationLow } : null,
      property: compactProperty(property)
    },
    profileId: input.profileId,
    promptId: customerPromptIds.price,
    property,
    reportType: "CUSTOMER_AI_PRICE",
    userText: `Generate price insight for ${property.title}`
  });

  return {
    ...ai,
    comparableListings,
    estimatedFairValue: property.priceLabel,
    priceConfidence: comparableListings.length >= 3 ? "Medium" : "Low",
    negotiationRange: negotiationLow && negotiationHigh ? { high: negotiationHigh, low: negotiationLow } : null
  };
}

export async function investmentAdvisorTool(input: CustomerAIInput) {
  const property = input.propertyId ? await getMarketplaceProperty(input.propertyId) : null;
  if (!property) return null;

  const ai = await runCustomerAI({
    fallback: "This investment report is decision support only. Review rental demand, liquidity, documentation, and price with qualified advisors before investing.",
    input: {
      property: compactProperty(property),
      score: fallbackScore(property)
    },
    profileId: input.profileId,
    promptId: customerPromptIds.investment,
    property,
    reportType: "CUSTOMER_AI_INVESTMENT",
    userText: `Create investment report for ${property.title}`
  });

  return {
    ...ai,
    property,
    riskLevel: property.verified ? "Moderate" : "Higher until verification",
    suitableHorizon: property.intent === "INVEST" ? "5-7 years" : "3-5 years"
  };
}

export async function loanGuideTool(input: CustomerAIInput) {
  const property = input.propertyId ? await getMarketplaceProperty(input.propertyId) : null;
  const price = property?.priceValue ?? input.loan?.loanAmount ?? 5000000;
  const downPayment = input.loan?.downPayment ?? Math.round(price * 0.2);
  const loanAmount = input.loan?.loanAmount ?? Math.max(0, price - downPayment);
  const interestRate = input.loan?.interestRate ?? 8.6;
  const tenureYears = input.loan?.tenureYears ?? 20;
  const emi = emiEstimate(loanAmount, interestRate, tenureYears);
  const ai = await runCustomerAI({
    fallback: "EMI and affordability figures are estimates for planning only and are not financial advice.",
    input: {
      downPayment,
      emi,
      interestRate,
      loanAmount,
      property: property ? compactProperty(property) : null,
      tenureYears
    },
    profileId: input.profileId,
    promptId: customerPromptIds.loan,
    property,
    reportType: "CUSTOMER_AI_LOAN",
    userText: `Explain home loan planning for ${property?.title ?? "this budget"}`
  });

  return {
    ...ai,
    downPayment,
    emi,
    interestRate,
    loanAmount,
    tenureYears
  };
}

export async function legalDocumentTool(input: CustomerAIInput) {
  const property = input.propertyId ? await getMarketplaceProperty(input.propertyId) : null;
  const documentType = input.documentType ?? input.query ?? "Sale Deed";
  const ai = await runCustomerAI({
    fallback: "HomeZone can explain common property documents, but this is not legal advice. Verify documents with a qualified legal professional.",
    input: {
      documentType,
      property: property ? compactProperty(property) : null
    },
    profileId: input.profileId,
    promptId: customerPromptIds.legal,
    property,
    reportType: "CUSTOMER_AI_LEGAL",
    userText: `Explain ${documentType}`
  });

  return {
    ...ai,
    documentType,
    disclaimer: "This is not legal advice. Verify documents with a qualified legal professional."
  };
}

export async function descriptionGeneratorTool(input: CustomerAIInput) {
  const property = input.propertyId ? await getMarketplaceProperty(input.propertyId) : null;
  if (!property) return null;

  const ai = await runCustomerAI({
    fallback: "Create a premium listing with a clear title, practical highlights, location value, and verified contact next step.",
    input: {
      property: compactProperty(property)
    },
    profileId: input.profileId,
    promptId: customerPromptIds.description,
    property,
    reportType: "CUSTOMER_AI_DESCRIPTION",
    userText: `Generate listing copy for ${property.title}`
  });

  return {
    ...ai,
    property
  };
}

export async function recommendationTool(input: CustomerAIInput) {
  const search = await propertySearchTool(input);
  return {
    recommendations: search.matches.slice(0, 8),
    summary: search.summary
  };
}

export const customerAITools = {
  advisor: propertyAdvisorTool,
  comparison: propertyComparisonTool,
  description: descriptionGeneratorTool,
  investment: investmentAdvisorTool,
  legal: legalDocumentTool,
  loan: loanGuideTool,
  locality: localityIntelligenceTool,
  price: priceInsightTool,
  recommendation: recommendationTool,
  score: propertyScoreTool,
  search: propertySearchTool
};
