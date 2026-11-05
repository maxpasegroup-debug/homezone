import type { Payment } from "@prisma/client";
import { db } from "@/lib/db";
import { buyerPlusPlan } from "@/lib/engagement/membership";
import { createInvoiceNumber } from "@/lib/payments/catalog";
import { invoiceMetadata } from "@/lib/payments/service";

type ReservedPayment = Pick<Payment, "id" | "amount" | "currency" | "description" | "invoiceNumber" | "razorpayOrderId" | "product">;
type Admission = { error: string; status: 403 | 409 } | { payment: ReservedPayment; reuse: boolean };

export async function reserveBuyerPlusPayment(profileId: string): Promise<Admission> {
  return db.$transaction(async tx => {
    // One durable reservation per buyer across all instances; do not hold this
    // lock across the external provider call. Role changes and suspension are
    // rechecked under the same lock rather than trusting a session claim.
    await tx.$queryRaw`SELECT id FROM "Profile" WHERE id = ${profileId} FOR UPDATE`;
    const profile = await tx.profile.findUnique({ where: { id: profileId }, select: { role: true, verificationStatus: true } });
    if (!profile || profile.role !== "USER" || profile.verificationStatus === "SUSPENDED") {
      return { error: "This plan is only available to an active Buyer account.", status: 403 } as const;
    }
    const now = new Date();
    const active = await tx.subscription.findFirst({
      where: { profileId, product: "BUYER_PLUS", status: "ACTIVE", endsAt: { gt: now } }, select: { id: true }
    });
    if (active) return { error: "A Plus plan is already active. Check your membership before buying again.", status: 409 } as const;
    const pending = await tx.payment.findMany({
      where: { payerId: profileId, product: "BUYER_PLUS", status: { in: ["CREATED", "PENDING", "FAILED"] } },
      select: { id: true, amount: true, currency: true, description: true, invoiceNumber: true, razorpayOrderId: true, product: true, status: true }
    });
    if (pending.length) {
      const previous = pending[0];
      if (pending.length === 1 && previous.status === "PENDING" && previous.razorpayOrderId &&
          previous.amount === buyerPlusPlan.amount && previous.currency === buyerPlusPlan.currency) {
        return { payment: previous, reuse: true } as const;
      }
      return { error: "A previous payment needs confirmation. Check Payments before trying again.", status: 409 } as const;
    }
    const payment = await tx.payment.create({ data: {
      payerId: profileId, product: "BUYER_PLUS", amount: buyerPlusPlan.amount, currency: buyerPlusPlan.currency,
      description: "HomeZone Plus: 30 days and 10 owner-contact unlocks", invoiceNumber: createInvoiceNumber(), status: "CREATED",
      invoiceMetadata: invoiceMetadata({ product: "BUYER_PLUS", amount: buyerPlusPlan.amount, currency: buyerPlusPlan.currency })
    } });
    return { payment, reuse: false } as const;
  });
}
