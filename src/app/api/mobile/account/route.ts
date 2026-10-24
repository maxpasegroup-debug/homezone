import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { buyerEnquirySelect } from "@/lib/leads/access";
import { mobilePropertySelect } from "@/lib/properties/mobile-catalog";
import { handleApiError, ok, parseJson, unauthorized, rateLimited } from "@/lib/api/response";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";
// Read-only account snapshot. Every query is scoped to the authenticated profile.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const [saved, shortlists, enquiries] = await Promise.all([
      db.savedProperty.findMany({ where: { userId: profile.id, property: { status: "PUBLISHED" } },
        select: { property: { select: mobilePropertySelect } }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.propertyShortlist.findMany({ where: { userId: profile.id }, select: { id: true, name: true,
        items: { where: { property: { status: "PUBLISHED" } }, select: { property: { select: mobilePropertySelect } },
          orderBy: { createdAt: "desc" }, take: 50 } },
        orderBy: { updatedAt: "desc" }, take: 100 }),
      db.lead.findMany({ where: { userId: profile.id }, select: buyerEnquirySelect,
        orderBy: { createdAt: "desc" }, take: 100 })
    ]);
    return ok({ profile: { fullName: profile.fullName, city: profile.city, phone: profile.phone },
      saved: saved.map((item) => item.property), shortlists, enquiries,
      limits: { saved: 200, shortlists: 100, shortlistItems: 50, enquiries: 100 } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return handleApiError(new Error("Mobile account unavailable"), { route: "GET /api/mobile/account" }); }
}

const editSchema = z.object({ city: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(32).regex(/^\+?[0-9\s().-]+$/) }).strict();

// Unlike the role-selection web contract, this mobile edit never changes roles.
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const limit = checkRateLimit({ key: rateLimitKey(request, "mobile:profile", session.user.id), limit: 20, windowMs: 60_000 });
    if (!limit.allowed) return rateLimited(limit.resetAt);
    const parsed = await parseJson(request, editSchema);
    if ("error" in parsed) return parsed.error;
    const profile = await getOrCreateProfile(session.user);
    const updated = await db.profile.update({ where: { id: profile.id },
      data: { city: parsed.data.city, phone: parsed.data.phone,
        whatsappVerified: profile.phone === parsed.data.phone ? profile.whatsappVerified : false },
      select: { fullName: true, city: true, phone: true } });
    return ok({ profile: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch { return handleApiError(new Error("Mobile profile update unavailable"), { route: "PATCH /api/mobile/account" }); }
}
