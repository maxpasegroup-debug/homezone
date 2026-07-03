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
  language: z.enum(["AUTO", "ENGLISH", "MALAYALAM"]).default("AUTO"),
  message: z.string().min(2).max(2000)
});

export const aiLanguageSchema = z.enum(["AUTO", "ENGLISH", "MALAYALAM"]);

export const aiRecommendationSchema = z.object({
  language: aiLanguageSchema.default("AUTO"),
  locationPreference: z.string().min(2).max(120).optional()
});

export const aiAreaSchema = z.object({
  language: aiLanguageSchema.default("AUTO"),
  query: z.string().min(2).max(500)
});

export const aiCompareSchema = z.object({
  language: aiLanguageSchema.default("AUTO"),
  propertyIds: z.array(idSchema).min(2).max(4)
});

export const aiLeadAssistantSchema = z.object({
  context: z.string().max(1000).optional(),
  language: aiLanguageSchema.default("AUTO"),
  mode: z.enum(["INQUIRY", "FOLLOW_UP", "SELLER_REPLY", "BUYER_REPLY"]),
  propertyId: idSchema.optional()
});

export const leadSourceSchema = z.enum(["PROPERTY", "REEL", "SEARCH", "DASHBOARD"]);

export const contactActionSchema = z.enum(["CALL", "WHATSAPP", "INQUIRY"]);

export const leadSchema = z.object({
  name: z.string().min(2),
  phone: phoneSchema,
  message: z.string().min(2).max(1000),
  propertyId: idSchema.optional(),
  reelId: idSchema.optional(),
  source: leadSourceSchema.default("PROPERTY"),
  contactAction: contactActionSchema.default("INQUIRY")
});

export const serviceRequestSchema = z.object({
  category: z.string().min(2),
  city: z.string().min(2),
  budget: z.string().min(2),
  message: z.string().min(2).max(1000),
  providerId: idSchema.optional()
});

export const serviceProviderSchema = z.object({
  businessName: z.string().min(2).max(160),
  category: z.string().min(2).max(120),
  city: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  portfolioUrls: z.array(z.string().url()).max(20).optional(),
  photoUrls: z.array(z.string().url()).max(30).optional(),
  certifications: z.array(z.string()).max(20).optional(),
  experienceYears: z.coerce.number().int().min(0).max(100).optional(),
  serviceAreas: z.array(z.string()).max(30).optional(),
  availability: z.string().max(120).optional(),
  businessHours: z.record(z.string(), z.unknown()).optional(),
  priceLabel: z.string().max(120).optional()
});

export const serviceQuoteSchema = z.object({
  requestId: z.string(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().default("INR"),
  message: z.string().min(2).max(1000),
  revision: z.coerce.number().int().min(1).optional(),
  validUntil: z.string().datetime().optional()
});

export const serviceQuoteActionSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT", "REVISE"]),
  amount: z.coerce.number().positive().optional(),
  message: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime().optional()
});

export const serviceBookingActionSchema = z.object({
  action: z.enum(["START", "RESCHEDULE", "COMPLETE", "CANCEL"]),
  notes: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime().optional()
});

export const serviceReviewSchema = z.object({
  comment: z.string().max(1000).optional(),
  photoUrls: z.array(z.string().url()).max(10).optional(),
  rating: z.coerce.number().int().min(1).max(5)
});

export const propertyCreateSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(3000),
  intent: propertyIntentSchema,
  category: propertyCategorySchema.default("RESIDENTIAL"),
  propertyType: z.string().min(2).max(80),
  coverImageUrl: z.string().url().optional(),
  country: z.string().min(2).max(120).default("India"),
  state: z.string().min(2).max(120).optional(),
  city: z.string().min(2).max(120),
  locality: z.string().min(2).max(160).optional(),
  address: z.string().max(240).optional(),
  latitude: optionalCoordinate(-90, 90),
  longitude: optionalCoordinate(-180, 180),
  timezone: z.string().min(2).max(80).optional(),
  price: optionalNumber,
  currency: currencySchema.default("INR"),
  areaValue: optionalNumber,
  areaUnit: z.string().default("sqft"),
  bedrooms: optionalInteger(0, 20),
  bathrooms: optionalInteger(0, 20),
  amenities: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string().url()).max(40).optional(),
  videoUrl: z.string().url().optional(),
  virtualTourUrl: z.string().url().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW"]).default("PENDING_REVIEW")
});

export const propertyUpdateSchema = propertyCreateSchema
  .partial()
  .extend({
    status: z
      .enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"])
      .optional()
  });

export const propertyMediaSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    mediaUrl: z.string().url(),
    mediaType: z.enum(["image", "video", "cover"]).default("image")
  }),
  z.object({
    action: z.literal("remove"),
    mediaUrl: z.string().url()
  }),
  z.object({
    action: z.literal("reorder"),
    mediaUrls: z.array(z.string().url()).max(40)
  }),
  z.object({
    action: z.literal("replace-video"),
    videoUrl: z.string().url().optional()
  }),
  z.object({
    action: z.literal("set-virtual-tour"),
    virtualTourUrl: z.string().url().optional()
  })
]);

export const propertyDocumentSchema = z.object({
  documentType: z.enum([
    "SALE_DEED",
    "ENCUMBRANCE_CERTIFICATE",
    "TAX_RECEIPT",
    "APPROVAL_DOCUMENT",
    "FLOOR_PLAN",
    "OWNERSHIP_PROOF",
    "OTHER"
  ]),
  fileName: z.string().min(2).max(180),
  fileUrl: z.string().url(),
  fileSize: z.coerce.number().int().positive().optional(),
  mimeType: z.string().max(120).optional(),
  notes: z.string().max(500).optional()
});

export const propertyDocumentUpdateSchema = z.object({
  documentType: z
    .enum([
      "SALE_DEED",
      "ENCUMBRANCE_CERTIFICATE",
      "TAX_RECEIPT",
      "APPROVAL_DOCUMENT",
      "FLOOR_PLAN",
      "OWNERSHIP_PROOF",
      "OTHER"
    ])
    .optional(),
  notes: z.string().max(500).optional()
});

export const reelCreateSchema = z.object({
  propertyId: idSchema.optional(),
  title: z.string().min(3).max(160),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional()
});

export const reelFeedSchema = z.object({
  cursor: idSchema.optional(),
  take: z.coerce.number().int().min(1).max(20).default(6)
});

export const reelLeadSchema = z.object({
  contactAction: contactActionSchema,
  message: z.string().min(2).max(1000).default("I am interested in this property reel."),
  name: z.string().min(2),
  phone: phoneSchema
});

export const followProfileSchema = z.object({
  targetId: idSchema
});

export const moderationSchema = z.object({
  status: z.enum(["PUBLISHED", "REJECTED", "ARCHIVED", "PENDING_REVIEW", "NEEDS_CHANGES"]),
  note: z.string().min(3).max(500)
});

export const propertyVerificationSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "VERIFIED", "REJECTED", "NEEDS_CHANGES", "EXPIRED"]),
  note: z.string().max(1000).optional()
});

export const profileVerificationSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "SUSPENDED"]),
  note: z.string().max(1000).optional()
});

export const adminProfileUpdateSchema = z.object({
  city: z.string().min(2).max(120).optional(),
  country: z.string().min(2).max(120).optional(),
  role: appRoleSchema.optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]).optional(),
  note: z.string().min(3).max(1000).optional()
});

export const adminReportActionSchema = z.object({
  action: z.enum(["RESOLVED", "DISMISSED", "ESCALATED"]),
  note: z.string().min(3).max(1000)
});

export const paymentProductSchema = z.enum([
  "FEATURED_LISTING",
  "PREMIUM_LISTING",
  "BROKER_MONTHLY",
  "BROKER_YEARLY",
  "BROKER_ENTERPRISE",
  "BUILDER_MONTHLY",
  "BUILDER_YEARLY",
  "BUILDER_ENTERPRISE",
  "STUDIO_PHOTOGRAPHY",
  "STUDIO_VIDEOGRAPHY",
  "STUDIO_DRONE",
  "STUDIO_REELS",
  "STUDIO_BROCHURE",
  "STUDIO_DESIGN",
  "STUDIO_ADS",
  "STUDIO_VIRTUAL_STAGING",
  "STUDIO_VOICEOVER",
  "SERVICE_BOOKING_DEPOSIT",
  "SERVICE_FINAL_PAYMENT"
]);

export const paymentCheckoutSchema = z.object({
  city: z.string().min(2).max(120).optional(),
  notes: z.string().max(1000).optional(),
  product: paymentProductSchema,
  propertyId: idSchema.optional(),
  serviceBookingId: idSchema.optional(),
  studioRequestId: idSchema.optional()
});

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string().min(8).max(128),
  razorpay_payment_id: z.string().min(8).max(128),
  razorpay_signature: z.string().min(16).max(256)
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
  sort: z.enum(["recommended", "newest", "price_asc", "price_desc", "score"]).optional(),
  state: z.string().min(1).max(120).optional(),
  verifiedOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true")
});

export const propertyCompareSchema = z.object({
  propertyIds: z.array(idSchema).min(2).max(4)
});

export const shortlistSchema = z.object({
  name: z.string().min(2).max(80)
});

export const shortlistPropertySchema = z.object({
  propertyId: idSchema
});

export const studioRequestSchema = z.object({
  propertyId: z.string().optional(),
  serviceType: z.string().min(2).max(120),
  city: z.string().min(2).max(120).optional(),
  budget: z.string().max(120).optional(),
  notes: z.string().max(1200).optional(),
  orderValue: z.coerce.number().int().min(0).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "PAYMENT_PENDING",
      "PAID",
      "ASSIGNED",
      "IN_PRODUCTION",
      "QUALITY_CHECK",
      "DELIVERED",
      "CUSTOMER_APPROVED",
      "COMPLETED",
      "CANCELLED",
      "REVISION_REQUESTED"
    ])
    .optional()
});

export const studioStatusSchema = z.object({
  message: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum([
    "DRAFT",
    "SUBMITTED",
    "PAYMENT_PENDING",
    "PAID",
    "ASSIGNED",
    "IN_PRODUCTION",
    "QUALITY_CHECK",
    "DELIVERED",
    "CUSTOMER_APPROVED",
    "COMPLETED",
    "CANCELLED",
    "REVISION_REQUESTED"
  ])
});

export const studioAssignmentSchema = z.object({
  assigneeId: z.string().optional(),
  notes: z.string().max(500).optional(),
  role: z.enum(["PHOTOGRAPHER", "VIDEOGRAPHER", "DRONE_OPERATOR", "EDITOR", "DESIGNER"])
});

export const studioFileSchema = z.object({
  fileName: z.string().min(2).max(180),
  fileType: z.enum(["PHOTO", "VIDEO", "BROCHURE", "CREATIVE", "OTHER"]),
  fileUrl: z.string().url(),
  notes: z.string().max(500).optional(),
  version: z.coerce.number().int().min(1).optional()
});

export const studioRevisionSchema = z.object({
  comments: z.string().min(3).max(1200)
});

export const studioApprovalSchema = z.object({
  customerFeedback: z.string().max(1000).optional(),
  customerRating: z.coerce.number().int().min(1).max(5).optional()
});

export const leadUpdateSchema = z.object({
  stage: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "WON", "LOST", "ARCHIVED", "NURTURE"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  nextAction: z.string().max(240).optional(),
  followUpAt: z.string().datetime().optional(),
  dealValue: z.coerce.number().positive().optional()
});

export const leadNoteSchema = z.object({
  note: z.string().min(2).max(1000)
});

export const leadNoteUpdateSchema = z.object({
  note: z.string().min(2).max(1000)
});

export const leadTaskSchema = z.object({
  taskType: z.enum(["CALL", "MEETING", "WHATSAPP", "REMINDER"]).default("CALL"),
  title: z.string().min(2).max(240),
  dueAt: z.string().datetime().optional()
});

export const leadTaskUpdateSchema = z.object({
  completed: z.boolean().optional(),
  dueAt: z.string().datetime().optional(),
  taskType: z.enum(["CALL", "MEETING", "WHATSAPP", "REMINDER"]).optional(),
  title: z.string().min(2).max(240).optional()
});

export const leadVisitSchema = z.object({
  notes: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).default("SCHEDULED")
});

export const leadVisitUpdateSchema = z.object({
  notes: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional()
});

export const leadInboxFilterSchema = z.object({
  q: z.string().max(160).optional(),
  stage: z
    .enum(["ALL", "NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "WON", "LOST", "ARCHIVED", "NURTURE"])
    .default("ALL")
});

export const brokerTeamMemberSchema = z.object({
  active: z.boolean().optional(),
  email: z.string().email().optional(),
  name: z.string().min(2).max(120),
  permissions: z.array(z.enum(["LEADS", "VISITS", "COMMISSIONS", "REPORTS", "ADMIN"])).default(["LEADS"]),
  phone: phoneSchema.optional(),
  profileId: idSchema.optional(),
  role: z.enum(["OWNER", "MANAGER", "AGENT", "TELECALLER"]).default("AGENT")
});

export const brokerTeamMemberUpdateSchema = brokerTeamMemberSchema.partial();

export const brokerLeadAssignmentSchema = z.object({
  assigneeId: idSchema.optional(),
  notes: z.string().max(500).optional()
});

export const brokerCommissionSchema = z.object({
  agentId: idSchema.optional(),
  commissionPercent: z.coerce.number().min(0).max(100),
  dealValue: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
  status: z.enum(["PENDING", "PAID", "OUTSTANDING"]).default("PENDING")
});

export const brokerAutomationRuleSchema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]),
  enabled: z.boolean().default(true),
  provider: z.string().max(80).optional(),
  template: z.string().min(5).max(1000),
  trigger: z.enum(["NEW_LEAD", "FOLLOW_UP_DUE", "VISIT_SCHEDULED", "DEAL_WON"])
});

export const brokerClientDocumentSchema = z.object({
  documentType: z.enum(["ID_PROOF", "REQUIREMENT", "OFFER", "AGREEMENT", "PAYMENT", "OTHER"]).default("OTHER"),
  fileUrl: z.string().url(),
  title: z.string().min(2).max(160)
});

export const builderProjectSchema = z.object({
  name: z.string().min(3).max(160),
  city: z.string().min(2).max(120),
  locality: z.string().max(160).optional(),
  address: z.string().max(240).optional(),
  description: z.string().min(10).max(2000),
  amenities: z.array(z.string()).default([]),
  floorPlanUrls: z.array(z.string().url()).max(30).optional(),
  masterPlanUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).max(40).optional(),
  brochureUrl: z.string().url().optional(),
  qrCodeUrl: z.string().url().optional(),
  constructionStatus: z.enum(["PLANNING", "FOUNDATION", "STRUCTURE", "FINISHING", "READY", "COMPLETED"]).default("PLANNING"),
  completionDate: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "COMPLETED"]).default("DRAFT"),
  unitsCount: z.coerce.number().int().min(0).optional(),
  availableUnits: z.coerce.number().int().min(0).optional(),
  campaignStatus: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).default("DRAFT")
});

export const builderTowerSchema = z.object({
  floors: z.coerce.number().int().min(0).max(200).default(0),
  name: z.string().min(1).max(80),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE")
});

export const builderUnitSchema = z.object({
  areaUnit: z.string().max(20).default("sqft"),
  areaValue: z.coerce.number().positive().optional(),
  bathrooms: z.coerce.number().int().min(0).max(20).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  facing: z.string().max(40).optional(),
  floor: z.coerce.number().int().min(-10).max(200).optional(),
  floorPlanUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).max(20).optional(),
  price: z.coerce.number().positive().optional(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"]).default("AVAILABLE"),
  towerId: idSchema.optional(),
  unitNumber: z.string().min(1).max(40),
  unitType: z.string().min(1).max(80)
});

export const builderTeamMemberSchema = z.object({
  active: z.boolean().optional(),
  email: z.string().email().optional(),
  name: z.string().min(2).max(120),
  permissions: z.array(z.enum(["PROJECTS", "LEADS", "INVENTORY", "REPORTS", "ADMIN"])).default(["LEADS"]),
  phone: phoneSchema.optional(),
  profileId: idSchema.optional(),
  projectId: idSchema.optional(),
  role: z.enum(["OWNER", "MANAGER", "SALES", "MARKETING", "SITE_COORDINATOR"]).default("SALES")
});

export const builderBookingSchema = z.object({
  bookingAmount: z.coerce.number().min(0).optional(),
  buyerId: idSchema.optional(),
  leadId: idSchema.optional(),
  notes: z.string().max(500).optional(),
  saleValue: z.coerce.number().min(0).optional(),
  unitId: idSchema
});

export const builderBookingActionSchema = z.object({
  action: z.enum(["RELEASE", "CONFIRM", "SOLD"]),
  notes: z.string().max(500).optional(),
  saleValue: z.coerce.number().min(0).optional()
});

export const builderCampaignSchema = z.object({
  brochureDownloads: z.coerce.number().int().min(0).optional(),
  budget: z.coerce.number().min(0).optional(),
  channel: z.enum(["HOMEZONE", "META", "GOOGLE", "YOUTUBE", "WHATSAPP", "OFFLINE"]),
  landingPageUrl: z.string().url().optional(),
  leadsCount: z.coerce.number().int().min(0).optional(),
  name: z.string().min(2).max(160),
  qrCodeUrl: z.string().url().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).default("ACTIVE")
});

export const analyzerReportSchema = z.object({
  propertyId: z.string().optional(),
  propertyName: z.string().min(2).max(160),
  analysisMode: z.string().min(2).max(120),
  location: z.string().max(160).optional(),
  notes: z.string().max(2000).optional()
});

export const investmentReportSchema = z.object({
  area: z.string().min(2).max(160),
  city: z.string().min(2).max(120),
  profile: z.string().min(2).max(120),
  budget: z.string().min(2).max(120)
});
