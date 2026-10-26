import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { apiError, ok, unauthorized, forbidden, parseJson, rateLimited } from "@/lib/api/response";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { z } from "zod";

// REQUESTED is intentionally distinct from an owner-confirmed SCHEDULED visit.
export async function POST(request: Request) {
  try {
    const session = await auth(); if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    if(profile.verificationStatus==="SUSPENDED")return forbidden();
    const limit = checkRateLimit({ key: rateLimitKey(request, "mobile:visits", profile.id), limit: 5, windowMs: 60000 });
    if (!limit.allowed) return rateLimited(limit.resetAt);
    const parsed = await parseJson(request, z.object({ enquiryId: z.string().min(8).max(128), scheduledAt: z.string().datetime(), notes: z.string().max(1000).optional() }).strict());
    if ("error" in parsed) return parsed.error;
    const when = new Date(parsed.data.scheduledAt);
    if (when <= new Date() || when.getTime() > Date.now() + 366 * 86400000) return apiError("Choose a future date within one year", 400);
    const enquiry = await db.lead.findFirst({ where: { id: parsed.data.enquiryId, userId: profile.id, property: { status: "PUBLISHED" } }, select: { id: true, propertyId: true } });
    if (!enquiry) return apiError("Enquiry unavailable", 404);
    const visit = await db.leadSiteVisit.create({ data: { leadId: enquiry.id, propertyId: enquiry.propertyId, scheduledBy: profile.id, scheduledAt: when, notes: parsed.data.notes, status: "REQUESTED" }, select: { id: true, status: true, scheduledAt: true } });
    return ok({ visit }, { headers: { "Cache-Control": "no-store" } });
  } catch { return apiError("Visit request could not be confirmed", 503); }
}
