export type AILanguage = "AUTO" | "ENGLISH" | "MALAYALAM";

export type AIParsedMarketplaceFilters = {
  bedrooms?: number;
  category?: "COMMERCIAL";
  city?: string;
  country?: string;
  keyword?: string;
  locality?: string;
  maxPrice?: number;
  purpose?: "BUY" | "RENT" | "LEASE" | "INVEST";
};

const cityWords = ["kochi", "calicut", "dubai", "thrissur", "trivandrum", "kakkanad", "edappally"];
const typeWords = ["villa", "house", "apartment", "flat", "land", "commercial"];

export function detectAILanguage(text: string, preferred: AILanguage = "AUTO") {
  if (preferred === "MALAYALAM") return "Malayalam";
  if (preferred === "ENGLISH") return "English";
  return /[\u0D00-\u0D7F]/.test(text) ? "Malayalam" : "English";
}

function parseBudget(text: string) {
  const normalized = text.toLowerCase().replace(/₹|â‚¹|Ã¢â€šÂ¹/g, "rs ");
  const aedMatch = normalized.match(/(?:aed|\u062F\.\u0625)\s*(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/);
  if (aedMatch) {
    const value = Number(aedMatch[1]);
    const unit = aedMatch[2];
    if (unit === "m" || unit === "million") return value * 1_000_000;
    if (unit === "k" || unit === "thousand") return value * 1_000;
    return value;
  }

  const inrMatch = normalized.match(/(?:rs|inr)?\s*(\d+(?:\.\d+)?)\s*(cr|crore|lakh|lakhs|l)?/);
  if (!inrMatch) return undefined;

  const value = Number(inrMatch[1]);
  const unit = inrMatch[2];
  if (unit === "cr" || unit === "crore") return value * 10_000_000;
  if (unit === "l" || unit === "lakh" || unit === "lakhs") return value * 100_000;
  return undefined;
}

function parsePurpose(text: string): AIParsedMarketplaceFilters["purpose"] {
  if (/(lease|long-term lease)/i.test(text)) return "LEASE";
  if (/(rent|\u0D35\u0D3E\u0D1F\u0D15|kiraya)/i.test(text)) return "RENT";
  if (/(invest|investment|yield|\u0D28\u0D3F\u0D15\u0D4D\u0D37\u0D47\u0D2A|nivesh)/i.test(text)) {
    return "INVEST";
  }
  return "BUY";
}

export function parseAIPropertyFilters(query: string): AIParsedMarketplaceFilters {
  const text = query.toLowerCase();
  const budget = parseBudget(query);
  const bedrooms = Number(text.match(/(\d+)\s*(bhk|bed|bedroom)/)?.[1] ?? "") || undefined;
  const city = cityWords.find((word) => text.includes(word));
  const propertyType = typeWords.find((word) => text.includes(word));
  const keywordParts = [propertyType].filter(Boolean);

  if (text.includes("commercial") && !keywordParts.includes("commercial")) keywordParts.push("commercial");
  if (text.includes("villa") && !keywordParts.includes("villa")) keywordParts.push("villa");
  if ((text.includes("apartment") || text.includes("flat")) && !keywordParts.includes("apartment")) {
    keywordParts.push("apartment");
  }
  if (text.includes("land") && !keywordParts.includes("land")) keywordParts.push("land");

  return {
    bedrooms,
    category: text.includes("commercial") ? "COMMERCIAL" : undefined,
    city,
    country: text.includes("dubai") || text.includes("uae") ? "United Arab Emirates" : undefined,
    keyword: keywordParts.join(" ") || undefined,
    locality: city,
    maxPrice: budget,
    purpose: parsePurpose(query)
  };
}
