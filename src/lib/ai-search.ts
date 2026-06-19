import { propertyListings, type PropertyIntent, type PropertyListing } from "@/lib/property-data";

export type StructuredSearch = {
  raw: string;
  intent: PropertyIntent;
  location?: string;
  propertyType?: string;
  budgetLakhs?: number;
  bedrooms?: number;
  language: "English" | "Malayalam" | "Hindi";
};

const typeWords = ["villa", "house", "apartment", "flat", "land", "commercial"];
const locations = ["kochi", "kakkanad", "edappally", "thrissur", "trivandrum", "calicut", "dubai"];

export function parsePropertySearch(input: string): StructuredSearch {
  const text = input.toLowerCase();
  const budgetMatch = text.match(/(\d+)\s*(lakh|lakhs|l|cr|crore|k|thousand)/);
  const bedroomMatch = text.match(/(\d+)\s*(bhk|bed|bedroom)/);
  const foundType = typeWords.find((word) => text.includes(word));
  const foundLocation = locations.find((place) => text.includes(place));

  let intent: PropertyIntent = "BUY";
  if (/(lease|long-term lease)/i.test(input)) intent = "LEASE";
  if (/(rent|വാടക|kiraya)/i.test(input)) intent = "RENT";
  if (/(invest|investment|yield|നിക്ഷേപ|nivesh)/i.test(input)) intent = "INVEST";

  let budgetLakhs: number | undefined;
  if (budgetMatch) {
    const value = Number(budgetMatch[1]);
    const unit = budgetMatch[2];
    budgetLakhs = unit.startsWith("cr") || unit.startsWith("crore") ? value * 100 : value;
    if (unit === "k" || unit === "thousand") budgetLakhs = value / 100;
  }

  let language: StructuredSearch["language"] = "English";
  if (/[\u0D00-\u0D7F]/.test(input)) language = "Malayalam";
  if (/[\u0900-\u097F]/.test(input)) language = "Hindi";

  return {
    raw: input,
    intent,
    location: foundLocation,
    propertyType: foundType,
    budgetLakhs,
    bedrooms: bedroomMatch ? Number(bedroomMatch[1]) : undefined,
    language
  };
}

export function getPropertyMatches(search: StructuredSearch): PropertyListing[] {
  return propertyListings
    .map((listing) => {
      let points = listing.score;
      if (listing.intent === search.intent) points += 16;
      if (search.location && listing.location.toLowerCase().includes(search.location)) points += 18;
      if (search.propertyType && listing.type.toLowerCase().includes(search.propertyType)) points += 14;
      if (search.budgetLakhs && listing.priceLakhs <= search.budgetLakhs) points += 12;
      if (search.bedrooms && listing.bedrooms === search.bedrooms) points += 8;
      return { listing, points };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 4)
    .map(({ listing }) => listing);
}

export function explainSearch(search: StructuredSearch) {
  const pieces = [
    search.intent === "RENT"
      ? "rental homes"
      : search.intent === "LEASE"
        ? "lease-ready properties"
        : search.intent === "INVEST"
          ? "investment options"
          : "properties to buy",
    search.location ? `near ${search.location}` : "in preferred cities",
    search.budgetLakhs ? `within about Rs ${search.budgetLakhs}L` : "with flexible budget",
    search.bedrooms ? `${search.bedrooms}BHK fit` : "matching your lifestyle"
  ];

  return `HomeZone understood this as: ${pieces.join(", ")}.`;
}
