import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { marketplaceFilterSchema } from "@/lib/api/validation";
import { isProduction } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { propertyListings } from "@/lib/property-data";

export type MarketplaceProperty = {
  category?: string;
  country?: string;
  id: string;
  title: string;
  description?: string | null;
  location: string;
  city: string;
  state?: string | null;
  locality?: string | null;
  type: string;
  intent: string;
  priceLabel: string;
  priceValue?: number | null;
  currency?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  score: number;
  rentalYield: string;
  highlights: string[];
  mediaUrls: string[];
  verified?: boolean;
  status?: string;
};

export type MarketplaceFilters = {
  bathrooms?: number;
  bedrooms?: number;
  category?: string;
  city?: string;
  country?: string;
  keyword?: string;
  locality?: string;
  maxPrice?: number;
  minPrice?: number;
  purpose?: string;
  state?: string;
  verifiedOnly?: boolean;
};

const currencyLocales: Record<string, string> = {
  AED: "en-AE",
  EUR: "en-IE",
  GBP: "en-GB",
  INR: "en-IN",
  USD: "en-US"
};

function formatCurrency(price?: Prisma.Decimal | number | null, currency = "INR") {
  if (price === null || price === undefined) return "Price on request";
  const value = Number(price);
  if (!Number.isFinite(value)) return "Price on request";

  if (currency === "INR") {
    if (value >= 10000000) return `Rs ${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `Rs ${Math.round(value / 100000)}L`;
  }

  return new Intl.NumberFormat(currencyLocales[currency] ?? "en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function cleanFilter(value?: string | string[]) {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export function parseMarketplaceFilters(searchParams?: Record<string, string | string[] | undefined>) {
  const parsed = marketplaceFilterSchema.safeParse({
    bathrooms: cleanFilter(searchParams?.bathrooms),
    bedrooms: cleanFilter(searchParams?.bedrooms),
    category: cleanFilter(searchParams?.category),
    city: cleanFilter(searchParams?.city),
    country: cleanFilter(searchParams?.country),
    keyword: cleanFilter(searchParams?.keyword ?? searchParams?.q),
    locality: cleanFilter(searchParams?.locality),
    maxPrice: cleanFilter(searchParams?.maxPrice),
    minPrice: cleanFilter(searchParams?.minPrice),
    purpose: cleanFilter(searchParams?.purpose ?? searchParams?.intent),
    state: cleanFilter(searchParams?.state),
    verifiedOnly: cleanFilter(searchParams?.verifiedOnly)
  });

  return parsed.success ? parsed.data : {};
}

function buildMarketplaceWhere(filters: MarketplaceFilters): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    status: "PUBLISHED"
  };

  if (filters.keyword) {
    where.OR = [
      { title: { contains: filters.keyword, mode: "insensitive" } },
      { description: { contains: filters.keyword, mode: "insensitive" } },
      { country: { contains: filters.keyword, mode: "insensitive" } },
      { state: { contains: filters.keyword, mode: "insensitive" } },
      { city: { contains: filters.keyword, mode: "insensitive" } },
      { locality: { contains: filters.keyword, mode: "insensitive" } },
      { propertyType: { contains: filters.keyword, mode: "insensitive" } }
    ];
  }

  if (filters.country) where.country = { equals: filters.country, mode: "insensitive" };
  if (filters.state) where.state = { equals: filters.state, mode: "insensitive" };
  if (filters.city) where.city = { equals: filters.city, mode: "insensitive" };
  if (filters.locality) where.locality = { contains: filters.locality, mode: "insensitive" };
  if (filters.purpose) where.intent = filters.purpose as Prisma.EnumPropertyIntentFilter["equals"];
  if (filters.category) where.category = filters.category as Prisma.EnumPropertyCategoryFilter["equals"];
  if (filters.bedrooms !== undefined) where.bedrooms = filters.bedrooms;
  if (filters.bathrooms !== undefined) where.bathrooms = filters.bathrooms;
  if (filters.verifiedOnly) where.verified = true;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      gte: filters.minPrice,
      lte: filters.maxPrice
    };
  }

  return where;
}

export function fallbackMarketplaceProperties(): MarketplaceProperty[] {
  return propertyListings.map((property) => ({
    id: property.id,
    title: property.title,
    category: "RESIDENTIAL",
    country: property.city === "Dubai" ? "United Arab Emirates" : "India",
    description: property.highlights.join(", "),
    location: property.location,
    city: property.city,
    type: property.type,
    intent: property.intent,
    priceLabel: property.priceLabel,
    priceValue: property.priceLakhs,
    currency: property.city === "Dubai" ? "AED" : "INR",
    bedrooms: property.bedrooms,
    area: property.area,
    score: property.score,
    rentalYield: property.rentalYield,
    highlights: property.highlights,
    mediaUrls: [],
    verified: false,
    status: "DEMO"
  }));
}

export async function getMarketplaceProperties(filters: MarketplaceFilters = {}) {
  try {
    const properties = await db.property.findMany({
      where: buildMarketplaceWhere(filters),
      orderBy: {
        createdAt: "desc"
      },
      take: 24
    });

    if (!properties.length && !isProduction()) {
      return fallbackMarketplaceProperties();
    }

    return properties.map((property): MarketplaceProperty => ({
      id: property.id,
      title: property.title,
      category: property.category,
      country: property.country,
      description: property.description,
      location: [property.locality, property.city].filter(Boolean).join(", "),
      city: property.city,
      state: property.state,
      locality: property.locality,
      type: property.propertyType,
      intent: property.intent,
      priceLabel: formatCurrency(property.price, property.currency),
      priceValue: property.price ? Number(property.price) : null,
      currency: property.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      latitude: property.latitude ? Number(property.latitude) : null,
      longitude: property.longitude ? Number(property.longitude) : null,
      timezone: property.timezone,
      area:
        property.areaValue && property.areaUnit
          ? `${property.areaValue.toString()} ${property.areaUnit}`
          : "Area not set",
      score: property.propertyScore ?? 72,
      rentalYield: "AI estimate pending",
      highlights: property.amenities.length
        ? property.amenities
        : [property.aiSummary ?? "Submitted for HomeZone review"],
      mediaUrls: property.mediaUrls,
      verified: property.verified,
      status: property.status
    }));
  } catch (error) {
    logger.error("Marketplace property query failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return isProduction() ? [] : fallbackMarketplaceProperties();
  }
}

export async function getMarketplaceProperty(id: string) {
  try {
    const property = await db.property.findUnique({
      where: {
        id
      }
    });

    if (property) {
      return {
        id: property.id,
        title: property.title,
        category: property.category,
        country: property.country,
        description: property.description,
        location: [property.locality, property.city].filter(Boolean).join(", "),
        city: property.city,
        state: property.state,
        locality: property.locality,
        type: property.propertyType,
        intent: property.intent,
        priceLabel: formatCurrency(property.price, property.currency),
        priceValue: property.price ? Number(property.price) : null,
        currency: property.currency,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        latitude: property.latitude ? Number(property.latitude) : null,
        longitude: property.longitude ? Number(property.longitude) : null,
        timezone: property.timezone,
        area:
          property.areaValue && property.areaUnit
            ? `${property.areaValue.toString()} ${property.areaUnit}`
            : "Area not set",
        score: property.propertyScore ?? 72,
        rentalYield: "AI estimate pending",
        highlights: property.amenities.length
          ? property.amenities
          : [property.aiSummary ?? "Submitted for HomeZone review"],
        mediaUrls: property.mediaUrls,
        verified: property.verified,
        status: property.status
      } satisfies MarketplaceProperty;
    }
  } catch (error) {
    logger.error("Marketplace property detail query failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      propertyId: id
    });
  }

  return isProduction()
    ? null
    : fallbackMarketplaceProperties().find((property) => property.id === id) ?? null;
}
