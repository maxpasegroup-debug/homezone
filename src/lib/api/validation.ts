import { z } from "zod";

export const aiSearchSchema = z.object({
  query: z.string().min(2).max(500),
  country: z.string().default("India"),
  language: z.string().default("English")
});

export const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  message: z.string().min(2).max(1000),
  propertyId: z.string().optional(),
  source: z.string().default("HomeZone")
});

export const serviceRequestSchema = z.object({
  category: z.string().min(2),
  city: z.string().min(2),
  budget: z.string().min(2),
  message: z.string().min(2).max(1000)
});

export const propertyCreateSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2000),
  intent: z.enum(["buy", "rent", "invest", "sell"]),
  propertyType: z.string().min(2).max(80),
  city: z.string().min(2).max(120),
  locality: z.string().min(2).max(160).optional(),
  price: z.coerce.number().positive().optional(),
  areaValue: z.coerce.number().positive().optional(),
  areaUnit: z.string().default("sqft"),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  bathrooms: z.coerce.number().int().min(0).max(20).optional(),
  amenities: z.array(z.string()).default([])
});

export const propertyMediaSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).default("image")
});

export const reelCreateSchema = z.object({
  propertyId: z.string().optional(),
  title: z.string().min(3).max(160),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional()
});

export const moderationSchema = z.object({
  status: z.enum(["PUBLISHED", "REJECTED", "ARCHIVED", "PENDING_REVIEW"]),
  note: z.string().max(500).optional()
});

export const reportSchema = z.object({
  entityType: z.enum(["property", "reel", "provider", "builder"]),
  entityId: z.string(),
  reason: z.string().min(3).max(500)
});
