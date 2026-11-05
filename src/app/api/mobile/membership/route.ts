import { auth } from "@/auth";
import { db } from "@/lib/db";
import { apiError, forbidden, ok, unauthorized } from "@/lib/api/response";
import { buyerPlusPlan, getBuyerPlusMembership } from "@/lib/engagement/membership";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await db.profile.findUnique({ where: { userId: session.user.id }, select: { id: true, role: true, verificationStatus: true } });
    if (!profile || profile.verificationStatus === "SUSPENDED") return forbidden();
    const eligible = profile.role === "USER";
    return ok({
      plan: buyerPlusPlan,
      eligible,
      active: eligible ? await getBuyerPlusMembership(profile.id) : null,
      mobileCheckoutAvailable: false,
      checkoutNotice: "Purchases are not available in this app yet. No payment or subscription is created by viewing these plans."
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return apiError("Membership is unavailable. Please try again later.", 503);
  }
}
