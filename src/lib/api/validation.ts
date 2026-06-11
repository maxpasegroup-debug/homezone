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
