import { db } from "@/lib/db";
import { getPaymentProduct } from "@/lib/payments/catalog";

export const BUYER_PLUS_CONTACT_LIMIT = 10;
const product = getPaymentProduct("BUYER_PLUS");
export const buyerPlusPlan = {
  code: "BUYER_PLUS",
  name: "HomeZone Plus",
  amount: product.amount,
  currency: product.currency,
  durationDays: product.durationDays ?? 30,
  contactLimit: BUYER_PLUS_CONTACT_LIMIT
} as const;

// A stored ACTIVE flag alone is insufficient. Only currently valid subscriptions
// backed by a captured paid purchase can supply credits. Always check the role
// and suspension separately against a fresh Profile before granting access.
export async function getBuyerPlusMembership(profileId: string, now = new Date()) {
  const subscriptions = await db.subscription.findMany({
    where: {
      profileId, product: "BUYER_PLUS", status: "ACTIVE",
      startsAt: { lte: now }, endsAt: { gt: now },
      payments: { some: { payerId: profileId, product: "BUYER_PLUS", status: "PAID", amount: buyerPlusPlan.amount, currency: buyerPlusPlan.currency } }
    },
    select: { endsAt: true, contactLimit: true, contactsUsed: true }
  });
  if (!subscriptions.length) return null;
  return {
    expiresAt: new Date(Math.max(...subscriptions.map(subscription => subscription.endsAt.getTime()))).toISOString(),
    contactLimit: subscriptions.reduce((sum, subscription) => sum + subscription.contactLimit, 0),
    used: subscriptions.reduce((sum, subscription) => sum + subscription.contactsUsed, 0),
    remaining: subscriptions.reduce((sum, subscription) => sum + Math.max(0, subscription.contactLimit - subscription.contactsUsed), 0)
  };
}

// This is a separate, opt-in website checkout gate. It must never be interpreted
// by Flutter as permission to sell digital access outside approved store billing.
export function buyerPlusWebsiteCheckoutConfigured() {
  return process.env.HOMEZONE_ENGAGEMENT_ENABLED === "true" &&
    process.env.HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED === "true" &&
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
}
