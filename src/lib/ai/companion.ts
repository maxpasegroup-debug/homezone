import type { Prisma } from "@prisma/client";
import {
  detectAILanguage as detectAILanguageBase,
  parseAIPropertyFilters as parseAIPropertyFiltersBase,
  type AILanguage,
  type AIParsedMarketplaceFilters
} from "@/lib/ai/companion-utils";
import { generateOpenAIText } from "@/lib/ai/homezone-ai";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import type { MarketplaceProperty } from "@/lib/properties/queries";
import { getMarketplaceProperties } from "@/lib/properties/queries";

type AIHistoryInput = {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  profileId?: string | null;
  propertyId?: string | null;
  reportType: string;
};

type UserSignals = {
  city?: string;
  favoriteLocations: string[];
  inquiryCount: number;
  purpose?: string;
  reelEngagementCount: number;
  savedCount: number;
  searchCount: number;
  viewedCount: number;
};

const ml = {
  areaLimited:
    "\u0D08 area recommendation HomeZone listing data \u0D2E\u0D3E\u0D24\u0D4D\u0D30\u0D02 \u0D05\u0D1F\u0D3F\u0D38\u0D4D\u0D25\u0D3E\u0D28\u0D2E\u0D3E\u0D15\u0D4D\u0D15\u0D3F\u0D2F\u0D3E\u0D23\u0D4D. Data \u0D15\u0D41\u0D31\u0D35\u0D3E\u0D23\u0D46\u0D19\u0D4D\u0D15\u0D3F\u0D32\u0D4D strong market conclusion \u0D2A\u0D31\u0D2F\u0D3E\u0D28\u0D4D \u0D15\u0D34\u0D3F\u0D2F\u0D3F\u0D32\u0D4D\u0D32.",
  comparison:
    "\u0D08 comparison \u0D32\u0D2D\u0D4D\u0D2F\u0D2E\u0D3E\u0D2F property fields \u0D2E\u0D3E\u0D24\u0D4D\u0D30\u0D02 \u0D09\u0D2A\u0D2F\u0D4B\u0D17\u0D3F\u0D1A\u0D4D\u0D1A\u0D3E\u0D23\u0D4D \u0D24\u0D2F\u0D4D\u0D2F\u0D3E\u0D31\u0D3E\u0D15\u0D4D\u0D15\u0D3F\u0D2F\u0D24\u0D4D.",
  draft:
    "\u0D28\u0D2E\u0D38\u0D4D\u0D15\u0D3E\u0D30\u0D02, \u0D08 property \u0D15\u0D41\u0D31\u0D3F\u0D1A\u0D4D\u0D1A\u0D4D \u0D15\u0D42\u0D1F\u0D41\u0D24\u0D32\u0D4D \u0D35\u0D3F\u0D35\u0D30\u0D19\u0D4D\u0D19\u0D33\u0D4D \u0D05\u0D31\u0D3F\u0D2F\u0D3E\u0D28\u0D4D \u0D06\u0D17\u0D4D\u0D30\u0D39\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D41. \u0D26\u0D2F\u0D35\u0D3E\u0D2F\u0D3F details \u0D2A\u0D19\u0D4D\u0D15\u0D41\u0D35\u0D46\u0D15\u0D4D\u0D15\u0D3E\u0D2E\u0D4B?",
  recommendations:
    "\u0D28\u0D3F\u0D19\u0D4D\u0D19\u0D33\u0D41\u0D1F\u0D46 saved properties, inquiries, views, searches, profile location \u0D0E\u0D28\u0D4D\u0D28\u0D3F\u0D35 \u0D05\u0D1F\u0D3F\u0D38\u0D4D\u0D25\u0D3E\u0D28\u0D2E\u0D3E\u0D15\u0D4D\u0D15\u0D3F \u0D32\u0D2D\u0D4D\u0D2F\u0D2E\u0D3E\u0D2F marketplace listings \u0D06\u0D23\u0D4D \u0D15\u0D3E\u0D23\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D24\u0D4D.",
  search: (count: number) =>
    `HomeZone \u0D08 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02 marketplace filters \u0D06\u0D2F\u0D3F \u0D2E\u0D3E\u0D31\u0D4D\u0D31\u0D3F. \u0D32\u0D2D\u0D4D\u0D2F\u0D2E\u0D3E\u0D2F data \u0D32\u0D4D ${count} property match \u0D15\u0D23\u0D4D\u0D1F\u0D46\u0D24\u0D4D\u0D24\u0D3F.`
};

export function detectAILanguage(text: string, preferred: AILanguage = "AUTO") {
  return detectAILanguageBase(text, preferred);
}

export function parseAIPropertyFilters(query: string): AIParsedMarketplaceFilters {
  return parseAIPropertyFiltersBase(query);
}

function compactProperty(property: MarketplaceProperty) {
  return {
    id: property.id,
    title: property.title,
    price: property.priceLabel,
    city: property.city,
    locality: property.locality,
    location: property.location,
    area: property.area,
    purpose: property.intent,
    type: property.type,
    verificationStatus: property.verificationStatus,
    highlights: property.highlights.slice(0, 4)
  };
}

async function saveAIHistory({ input, output, profileId, propertyId, reportType }: AIHistoryInput) {
  try {
    await db.aiReport.create({
      data: {
        input: input as Prisma.InputJsonValue,
        output: output as Prisma.InputJsonValue,
        propertyId,
        reportType,
        userId: profileId
      }
    });
  } catch {
    // AI history should never block the user response.
  }
}

async function auditAIUsed({
  action,
  metadata = {},
  profileId,
  status = "success"
}: {
  action: string;
  metadata?: Record<string, unknown>;
  profileId?: string | null;
  status?: "failed" | "success";
}) {
  await auditLog({
    action: "AI_USED",
    actorId: profileId,
    entityType: "ai",
    metadata: {
      action,
      status,
      ...metadata
    }
  });
}

function mostCommon(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

function metadataString(value: Prisma.JsonValue | null | undefined, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entry = value[key];
  return typeof entry === "string" ? entry : undefined;
}

async function getUserSignals(profileId?: string | null): Promise<UserSignals> {
  if (!profileId) {
    return {
      favoriteLocations: [],
      inquiryCount: 0,
      reelEngagementCount: 0,
      savedCount: 0,
      searchCount: 0,
      viewedCount: 0
    };
  }

  const [profile, savedProperties, inquiries, propertyViews, reelViews, searches, aiSearches] = await Promise.all([
    db.profile.findUnique({ where: { id: profileId } }),
    db.savedProperty.findMany({
      where: { userId: profileId },
      include: { property: true },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    db.lead.findMany({
      where: { userId: profileId },
      include: { property: true },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    db.auditLog.findMany({
      where: {
        action: "PROPERTY_VIEWED",
        actorId: profileId
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    db.auditLog.count({
      where: {
        action: "REEL_VIEWED",
        actorId: profileId
      }
    }),
    db.auditLog.findMany({
      where: {
        action: "SEARCH_PERFORMED",
        actorId: profileId
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    db.aiReport.findMany({
      where: {
        reportType: "AI_SEARCH",
        userId: profileId
      },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  const favoriteLocations = mostCommon([
    profile?.city,
    ...savedProperties.map((item) => item.property.city),
    ...savedProperties.map((item) => item.property.locality),
    ...inquiries.map((item) => item.property?.city),
    ...inquiries.map((item) => item.property?.locality),
    ...propertyViews.map((item) => metadataString(item.metadata, "city")),
    ...propertyViews.map((item) => metadataString(item.metadata, "locality")),
    ...searches.map((item) => metadataString(item.metadata, "city")),
    ...searches.map((item) => metadataString(item.metadata, "locality"))
  ]).slice(0, 5);

  return {
    city: favoriteLocations[0] ?? profile?.city ?? undefined,
    favoriteLocations,
    inquiryCount: inquiries.length,
    purpose:
      savedProperties.find((item) => item.property.intent)?.property.intent ??
      inquiries.find((item) => item.property?.intent)?.property?.intent ??
      undefined,
    reelEngagementCount: reelViews,
    savedCount: savedProperties.length,
    searchCount: searches.length + aiSearches.length,
    viewedCount: propertyViews.length
  };
}

export async function runAIPropertySearch({
  profileId,
  query,
  language
}: {
  language: AILanguage;
  profileId?: string | null;
  query: string;
}) {
  const responseLanguage = detectAILanguage(query, language);
  const filters = parseAIPropertyFilters(query);
  const matches = await getMarketplaceProperties(filters);
  const propertyContext = matches.slice(0, 5).map(compactProperty);
  const fallbackExplanation =
    responseLanguage === "Malayalam"
      ? ml.search(matches.length)
      : `HomeZone converted your request into marketplace filters and found ${matches.length} matching properties from available data.`;

  const explanation =
    (await generateOpenAIText({
      system:
        "You explain real-estate search filters. Use only the provided filters and property count. Do not invent listings, prices, market trends, or area facts.",
      user: JSON.stringify({
        filters,
        matches: propertyContext,
        query,
        responseLanguage
      }),
      temperature: 0.2
    })) ?? fallbackExplanation;

  const output = {
    explanation,
    filters,
    language: responseLanguage,
    matches,
    source: "database"
  };

  await saveAIHistory({
    input: { query, language },
    output: {
      explanation,
      filters,
      matchCount: matches.length
    },
    profileId,
    reportType: "AI_SEARCH"
  });
  await auditLog({
    action: "AI_SEARCH",
    actorId: profileId,
    entityType: "ai",
    metadata: {
      filters,
      query
    }
  });
  await auditLog({
    action: "SEARCH_PERFORMED",
    actorId: profileId,
    entityType: "search",
    metadata: {
      city: filters.city,
      country: filters.country,
      filters,
      query
    }
  });
  await auditAIUsed({
    action: "AI_SEARCH",
    metadata: { matchCount: matches.length },
    profileId
  });

  return output;
}

export async function getAIRecommendations({
  locationPreference,
  profileId,
  language
}: {
  language: AILanguage;
  locationPreference?: string;
  profileId?: string | null;
}) {
  const signals = await getUserSignals(profileId);
  const city = locationPreference ?? signals.city;
  const recommendations = await getMarketplaceProperties({
    city,
    purpose: signals.purpose
  });
  const responseLanguage = detectAILanguage(locationPreference ?? city ?? "", language);
  const fallbackExplanation =
    responseLanguage === "Malayalam"
      ? ml.recommendations
      : "These recommendations are based on your saved properties, inquiries, viewed properties, search history, profile location, reel engagement, and available marketplace listings.";

  const explanation =
    (await generateOpenAIText({
      system:
        "Explain why these database-returned properties may fit the user. Use only the provided user signals and listings. Do not invent market facts.",
      user: JSON.stringify({
        city,
        purpose: signals.purpose,
        recommendations: recommendations.slice(0, 5).map(compactProperty),
        responseLanguage,
        signals
      }),
      temperature: 0.3
    })) ?? fallbackExplanation;

  await saveAIHistory({
    input: { city, locationPreference, purpose: signals.purpose, signals },
    output: { explanation, recommendationCount: recommendations.length },
    profileId,
    reportType: "AI_RECOMMENDATION"
  });
  await auditLog({
    action: "AI_RECOMMENDATION",
    actorId: profileId,
    entityType: "ai",
    metadata: { city, purpose: signals.purpose }
  });
  await auditLog({
    action: "RECOMMENDATION_VIEWED",
    actorId: profileId,
    entityType: "ai",
    metadata: {
      city,
      recommendationCount: recommendations.length
    }
  });
  await auditAIUsed({
    action: "AI_RECOMMENDATION",
    metadata: { recommendationCount: recommendations.length },
    profileId
  });

  return {
    explanation,
    language: responseLanguage,
    recommendations,
    signals
  };
}

export async function getAIAreaRecommendations({
  language,
  profileId,
  query
}: {
  language: AILanguage;
  profileId?: string | null;
  query: string;
}) {
  const filters = parseAIPropertyFilters(query);
  const responseLanguage = detectAILanguage(query, language);
  const rows = await db.property.groupBy({
    by: ["city", "locality"],
    where: {
      status: "PUBLISHED",
      ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" as const } } : {})
    },
    _avg: {
      price: true
    },
    _count: {
      _all: true
    },
    orderBy: {
      _count: {
        id: "desc"
      }
    },
    take: 8
  });

  const areas = rows.map((row) => ({
    averagePrice: row._avg.price ? Number(row._avg.price) : null,
    city: row.city,
    locality: row.locality,
    propertyCount: row._count._all
  }));
  const insufficient = areas.length < 2;
  const limitation =
    responseLanguage === "Malayalam"
      ? ml.areaLimited
      : "This area recommendation uses only available HomeZone listing data. If data is limited, HomeZone cannot make a strong market conclusion.";

  const explanation = insufficient
    ? limitation
    : (await generateOpenAIText({
        system:
          "Summarize locality options using only the provided property counts and average prices. Do not invent rental demand, future growth, or market trends.",
        user: JSON.stringify({ areas, query, responseLanguage }),
        temperature: 0.2
      })) ?? limitation;

  await saveAIHistory({
    input: { query, filters },
    output: { areas, explanation, insufficient },
    profileId,
    reportType: "AI_AREA_QUERY"
  });
  await auditLog({
    action: "AI_AREA_QUERY",
    actorId: profileId,
    entityType: "ai",
    metadata: { query, resultCount: areas.length }
  });
  await auditAIUsed({
    action: "AI_AREA_QUERY",
    metadata: { resultCount: areas.length },
    profileId
  });

  return {
    areas,
    explanation,
    insufficient,
    language: responseLanguage
  };
}

export async function compareAIProperties({
  language,
  profileId,
  propertyIds
}: {
  language: AILanguage;
  profileId?: string | null;
  propertyIds: string[];
}) {
  const properties = await Promise.all(propertyIds.map((id) => db.property.findUnique({ where: { id } })));
  const found = properties.filter(Boolean).map((property) => property!);
  const rows = found.map((property) => ({
    id: property.id,
    title: property.title,
    price: property.price ? Number(property.price) : null,
    currency: property.currency,
    location: [property.locality, property.city].filter(Boolean).join(", "),
    area: property.areaValue ? `${property.areaValue.toString()} ${property.areaUnit}` : "Area not set",
    purpose: property.intent,
    verificationStatus: property.verificationStatus,
    strengths: [
      property.verified ? "Verified property" : undefined,
      property.featured ? "Featured listing" : undefined,
      property.premium ? "Premium listing" : undefined,
      property.bedrooms ? `${property.bedrooms} bedrooms` : undefined,
      property.amenities[0]
    ].filter(Boolean),
    weaknesses: [
      !property.verified ? "Verification is not complete" : undefined,
      !property.price ? "Price is not listed" : undefined,
      !property.areaValue ? "Area is not listed" : undefined
    ].filter(Boolean)
  }));
  const responseLanguage = detectAILanguage(rows.map((row) => row.title).join(" "), language);
  const summary =
    (await generateOpenAIText({
      system:
        "Compare real-estate properties using only the provided rows. Do not add facts not present in the rows. Keep the response concise.",
      user: JSON.stringify({ properties: rows, responseLanguage }),
      temperature: 0.2
    })) ??
    (responseLanguage === "Malayalam"
      ? ml.comparison
      : "This comparison uses only the available property fields.");

  await saveAIHistory({
    input: { propertyIds },
    output: { found: rows.length, summary },
    profileId,
    propertyId: rows[0]?.id,
    reportType: "AI_COMPARISON"
  });
  await auditLog({
    action: "AI_COMPARISON",
    actorId: profileId,
    entityType: "ai",
    metadata: { found: rows.length, propertyIds }
  });
  await auditAIUsed({
    action: "AI_COMPARISON",
    metadata: { found: rows.length },
    profileId
  });

  return {
    missingPropertyIds: propertyIds.filter((id) => !found.some((property) => property.id === id)),
    properties: rows,
    summary
  };
}

export async function generateAILeadDraft({
  context,
  language,
  mode,
  profileId,
  propertyId
}: {
  context?: string;
  language: AILanguage;
  mode: "BUYER_REPLY" | "FOLLOW_UP" | "INQUIRY" | "SELLER_REPLY";
  profileId?: string | null;
  propertyId?: string;
}) {
  const property = propertyId ? await db.property.findUnique({ where: { id: propertyId } }) : null;
  const responseLanguage = detectAILanguage(context ?? property?.title ?? "", language);
  const fallbackDraft =
    responseLanguage === "Malayalam"
      ? ml.draft
      : "Hello, I am interested in this property. Please share more details when convenient.";
  const draft =
    (await generateOpenAIText({
      system:
        "Draft a real-estate message only. Do not send it. Use the provided property/context only and avoid guarantees.",
      user: JSON.stringify({
        context,
        mode,
        property: property
          ? {
              title: property.title,
              city: property.city,
              locality: property.locality,
              price: property.price ? Number(property.price) : null,
              currency: property.currency
            }
          : null,
        responseLanguage
      }),
      temperature: 0.4
    })) ?? fallbackDraft;

  await saveAIHistory({
    input: { context, mode, propertyId },
    output: { draft, responseLanguage },
    profileId,
    propertyId,
    reportType: "AI_LEAD_ASSISTANT"
  });
  await auditLog({
    action: "AI_LEAD_ASSISTANT",
    actorId: profileId,
    entityType: "ai",
    metadata: { mode, propertyId }
  });
  await auditAIUsed({
    action: "AI_LEAD_ASSISTANT",
    metadata: { mode, propertyId },
    profileId
  });

  return {
    draft,
    language: responseLanguage,
    mode,
    sent: false
  };
}
