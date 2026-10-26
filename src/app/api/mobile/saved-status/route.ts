import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { apiError, forbidden, ok, unauthorized } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";
const query = z.object({ propertyId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/) }).strict();

// A bounded account snapshot cannot establish absence from the complete collection.
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    if (profile.verificationStatus === "SUSPENDED") return forbidden();
    const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return apiError("Invalid property reference", 400);
    const saved = await db.savedProperty.findFirst({
      where: { userId: profile.id, propertyId: parsed.data.propertyId, property: { status: "PUBLISHED" } },
      select: { propertyId: true }
    });
    return ok({ propertyId: parsed.data.propertyId, saved: saved !== null },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch { return apiError("Saved status unavailable. Please retry.", 503); }
}
