import type { Payment, PaymentProduct } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { getPaymentProduct } from "@/lib/payments/catalog";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function invoiceMetadata({
  product,
  amount,
  currency
}: {
  amount: number;
  currency: string;
  product: PaymentProduct;
}) {
  const config = getPaymentProduct(product);
  return {
    amount,
    currency,
    description: config.description,
    product
  } satisfies Prisma.InputJsonValue;
}

export async function applyPaidEntitlement(payment: Payment) {
  const now = new Date();
  const config = getPaymentProduct(payment.product);

  if (payment.product === "FEATURED_LISTING" && payment.propertyId) {
    await db.property.update({
      where: {
        id: payment.propertyId
      },
      data: {
        featured: true,
        featuredUntil: addDays(now, config.durationDays ?? 30)
      }
    });
    await auditLog({
      action: "LISTING_FEATURED_ACTIVATED",
      actorId: payment.payerId,
      entityId: payment.propertyId,
      entityType: "property",
      metadata: {
        paymentId: payment.id
      }
    });
  }

  if (payment.product === "PREMIUM_LISTING" && payment.propertyId) {
    await db.property.update({
      where: {
        id: payment.propertyId
      },
      data: {
        premium: true,
        premiumUntil: addDays(now, config.durationDays ?? 30)
      }
    });
    await auditLog({
      action: "LISTING_PREMIUM_ACTIVATED",
      actorId: payment.payerId,
      entityId: payment.propertyId,
      entityType: "property",
      metadata: {
        paymentId: payment.id
      }
    });
  }

  if (config.subscription && payment.payerId) {
    const subscription = await db.subscription.create({
      data: {
        endsAt: addDays(now, config.durationDays ?? 30),
        product: payment.product,
        profileId: payment.payerId,
        startsAt: now,
        status: "ACTIVE"
      }
    });

    await db.payment.update({
      where: {
        id: payment.id
      },
      data: {
        subscriptionId: subscription.id
      }
    });

    await auditLog({
      action: "SUBSCRIPTION_ACTIVATED",
      actorId: payment.payerId,
      entityId: subscription.id,
      entityType: "subscription",
      metadata: {
        paymentId: payment.id,
        product: payment.product
      }
    });
  }

  if (config.createsStudioRequest && payment.studioRequestId) {
    await db.studioRequest.update({
      where: {
        id: payment.studioRequestId
      },
      data: {
        paymentStatus: "PAID",
        status: "paid"
      }
    });

    await auditLog({
      action: "STUDIO_PAYMENT_COMPLETED",
      actorId: payment.payerId,
      entityId: payment.studioRequestId,
      entityType: "studio_request",
      metadata: {
        paymentId: payment.id,
        product: payment.product
      }
    });
  }
}

export async function markPaymentPaid({
  orderId,
  paymentId,
  signature,
  webhookEventId
}: {
  orderId: string;
  paymentId: string;
  signature?: string;
  webhookEventId?: string;
}) {
  const existing = await db.payment.findUnique({
    where: {
      razorpayOrderId: orderId
    }
  });

  if (!existing) {
    return null;
  }

  if (existing.status === "PAID") {
    return existing;
  }

  const payment = await db.payment.update({
    where: {
      id: existing.id
    },
    data: {
      paidAt: new Date(),
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      razorpayWebhookEventId: webhookEventId,
      status: "PAID"
    }
  });

  await applyPaidEntitlement(payment);

  await auditLog({
    action: "PAYMENT_VERIFIED",
    actorId: payment.payerId,
    entityId: payment.id,
    entityType: "payment",
    metadata: {
      orderId,
      paymentId,
      product: payment.product
    }
  });

  return payment;
}
