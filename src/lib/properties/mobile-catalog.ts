import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { marketplaceFilterSchema } from "@/lib/api/validation";

// Public projection: never return owner contact details, review notes or documents.
export const mobilePropertySelect = {
  id: true, title: true, description: true, intent: true, category: true,
  propertyType: true, coverImageUrl: true, mediaUrls: true, city: true,
  locality: true, country: true, price: true, currency: true, areaValue: true,
  areaUnit: true, bedrooms: true, bathrooms: true, latitude: true,
  longitude: true, amenities: true, videoUrl:true,virtualTourUrl:true,status: true
} satisfies Prisma.PropertySelect;

export const mobileCatalogSchema = marketplaceFilterSchema.extend({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
  currency: z.enum(["INR", "AED", "USD", "GBP", "EUR"]).optional()
}).strict().superRefine((filters, context) => {
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum price exceeds maximum price" });
  }
  if ((filters.minPrice !== undefined || filters.maxPrice !== undefined) && (!filters.currency || !filters.purpose)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Budget requires currency and purpose" });
  }
});

export async function mobileCatalog(filters: z.infer<typeof mobileCatalogSchema>) {
  const where: Prisma.PropertyWhereInput = { status: "PUBLISHED" };
  if (filters.keyword) where.OR = [
    { title: { contains: filters.keyword, mode: "insensitive" } },
    { description: { contains: filters.keyword, mode: "insensitive" } },
    { city: { contains: filters.keyword, mode: "insensitive" } },
    { locality: { contains: filters.keyword, mode: "insensitive" } },
    { propertyType: { contains: filters.keyword, mode: "insensitive" } }
  ];
  if (filters.city) where.city = { equals: filters.city, mode: "insensitive" };
  if (filters.country) where.country = { equals: filters.country, mode: "insensitive" };
  if (filters.state) where.state = { equals: filters.state, mode: "insensitive" };
  if (filters.locality) where.locality = { contains: filters.locality, mode: "insensitive" };
  if (filters.purpose) where.intent = filters.purpose;
  if (filters.category) where.category = filters.category;
  if (filters.currency) where.currency = filters.currency;
  if (filters.bedrooms !== undefined) where.bedrooms = filters.bedrooms;
  if (filters.bathrooms !== undefined) where.bathrooms = filters.bathrooms;
  if (filters.verifiedOnly) where.verified = true;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = { gte: filters.minPrice, lte: filters.maxPrice };
  }
  const orderBy: Prisma.PropertyOrderByWithRelationInput[] = filters.sort === "price_asc"
    ? [{ price: { sort: "asc", nulls: "last" } }, { id: "asc" }]
    : filters.sort === "price_desc"
      ? [{ price: { sort: "desc", nulls: "last" } }, { id: "asc" }]
      : filters.sort === "score" || filters.sort === "recommended"
        ? [{ propertyScore: { sort: "desc", nulls: "last" } }, { id: "asc" }]
        : [{ createdAt: "desc" }, { id: "asc" }];
  const rows = await db.property.findMany({ where, select: mobilePropertySelect,
    orderBy, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize + 1 });
  return { properties: rows.slice(0, filters.pageSize), page: filters.page,
    hasMore: rows.length > filters.pageSize, source: "database" as const };
}
