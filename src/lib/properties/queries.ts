import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { propertyListings } from "@/lib/property-data";

export type MarketplaceProperty = {
  id: string;
  title: string;
  description?: string | null;
  location: string;
  city: string;
  type: string;
  intent: string;
  priceLabel: string;
  priceValue?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area: string;
  score: number;
  rentalYield: string;
  highlights: string[];
  mediaUrls: string[];
  status?: string;
};

function formatCurrency(price?: Prisma.Decimal | number | null, currency = "INR") {
  if (price === null || price === undefined) return "Price on request";
  const value = Number(price);
  if (!Number.isFinite(value)) return "Price on request";

  if (currency === "INR") {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${Math.round(value / 100000)}L`;
    return `₹${value.toLocaleString("en-IN")}`;
  }

  return `${currency} ${value.toLocaleString()}`;
}

export function fallbackMarketplaceProperties(): MarketplaceProperty[] {
  return propertyListings.map((property) => ({
    id: property.id,
    title: property.title,
    description: property.highlights.join(", "),
    location: property.location,
    city: property.city,
    type: property.type,
    intent: property.intent,
    priceLabel: property.priceLabel,
    priceValue: property.priceLakhs,
    bedrooms: property.bedrooms,
    area: property.area,
    score: property.score,
    rentalYield: property.rentalYield,
    highlights: property.highlights,
    mediaUrls: [],
    status: "DEMO"
  }));
}

export async function getMarketplaceProperties() {
  try {
    const properties = await db.property.findMany({
      where: {
        status: "PUBLISHED"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 24
    });

    if (!properties.length) {
      return fallbackMarketplaceProperties();
    }

    return properties.map((property): MarketplaceProperty => ({
      id: property.id,
      title: property.title,
      description: property.description,
      location: [property.locality, property.city].filter(Boolean).join(", "),
      city: property.city,
      type: property.propertyType,
      intent: property.intent,
      priceLabel: formatCurrency(property.price, property.currency),
      priceValue: property.price ? Number(property.price) : null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
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
      status: property.status
    }));
  } catch {
    return fallbackMarketplaceProperties();
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
        description: property.description,
        location: [property.locality, property.city].filter(Boolean).join(", "),
        city: property.city,
        type: property.propertyType,
        intent: property.intent,
        priceLabel: formatCurrency(property.price, property.currency),
        priceValue: property.price ? Number(property.price) : null,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
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
        status: property.status
      } satisfies MarketplaceProperty;
    }
  } catch {
    // Fall through to demo data.
  }

  return fallbackMarketplaceProperties().find((property) => property.id === id) ?? null;
}
