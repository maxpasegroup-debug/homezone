import { z } from "zod";

const phoneSchema = z
  .string()
  .min(8)
  .max(32)
  .regex(/^\+?[0-9\s().-]+$/, "Phone number contains invalid characters");

const idSchema = z.string().min(8).max(128);
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().positive().optional()
);
const optionalCoordinate = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(min).max(max).optional()
  );
const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(min).max(max).optional()
  );

export const appRoleSchema = z.enum([
  "USER",
  "OWNER",
  "BROKER",
  "BUILDER",
  "SERVICE_PROVIDER",
  "ADMIN",
  "SUPER_ADMIN"
]);

export const propertyIntentSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(z.enum(["BUY", "RENT", "LEASE", "INVEST"]));

export const propertyCategorySchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(z.enum([
    "RESIDENTIAL",
    "COMMERCIAL",
    "LAND",
    "INDUSTRIAL",
    "AGRICULTURAL",
    "HOSPITALITY",
    "LUXURY"
  ]));

export const currencySchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(z.enum(["INR", "AED", "USD", "GBP", "EUR"]));

export const aiSearchSchema = z.object({
  query: z.string().min(2).max(500),
  country: z.string().default("India"),
  language: z.string().default("English")
});

export const assistantSchema = z.object({
  message: z.string().min(2).max(2000)
});

export const leadSchema = z.object({
  name: z.string().min(2),
  phone: phoneSchema,
  message: z.string().min(2).max(1000),
  propertyId: idSchema.optional(),
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
  intent: propertyIntentSchema,
  category: propertyCategorySchema.default("RESIDENTIAL"),
  propertyType: z.string().min(2).max(80),
  country: z.string().min(2).max(120).default("India"),
  state: z.string().min(2).max(120).optional(),
  city: z.string().min(2).max(120),
  locality: z.string().min(2).max(160).optional(),
  latitude: optionalCoordinate(-90, 90),
  longitude: optionalCoordinate(-180, 180),
  timezone: z.string().min(2).max(80).optional(),
  price: optionalNumber,
  currency: currencySchema.default("INR"),
  areaValue: optionalNumber,
  areaUnit: z.string().default("sqft"),
  bedrooms: optionalInteger(0, 20),
  bathrooms: optionalInteger(0, 20),
  amenities: z.array(z.string()).default([])
});

export const propertyMediaSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).default("image")
});

export const reelCreateSchema = z.object({
  propertyId: idSchema.optional(),
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
  entityId: idSchema,
  reason: z.string().min(3).max(500)
});

export const profileUpdateSchema = z.object({
  city: z.string().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
  role: appRoleSchema.exclude(["ADMIN", "SUPER_ADMIN"])
});

export const otpSendSchema = z.object({
  phone: phoneSchema
});

export const otpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "OTP code must be 6 digits"),
  phone: phoneSchema
});

export const marketplaceFilterSchema = z.object({
  bathrooms: z.coerce.number().int().min(0).max(20).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  category: propertyCategorySchema.optional(),
  city: z.string().min(1).max(120).optional(),
  country: z.string().min(1).max(120).optional(),
  keyword: z.string().min(1).max(200).optional(),
  locality: z.string().min(1).max(160).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minPrice: z.coerce.number().positive().optional(),
  purpose: propertyIntentSchema.optional(),
  state: z.string().min(1).max(120).optional(),
  verifiedOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true")
});
