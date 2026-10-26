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

export async function applyPaidEntitlement(payment: Payment, client: Prisma.TransactionClient = db) {
  const now = new Date();
  const config = getPaymentProduct(payment.product);

  if (payment.product === "FEATURED_LISTING" && payment.propertyId) {
    await client.property.update({
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
    }, client);
  }

  if (payment.product === "PREMIUM_LISTING" && payment.propertyId) {
    await client.property.update({
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
    }, client);
  }

  if (config.subscription && payment.payerId) {
    const subscription = await client.subscription.create({
      data: {
        endsAt: addDays(now, config.durationDays ?? 30),
        product: payment.product,
        profileId: payment.payerId,
        startsAt: now,
        status: "ACTIVE"
      }
    });

    await client.payment.update({
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
    }, client);
  }

  if (config.createsStudioRequest && payment.studioRequestId) {
    await client.studioRequest.updateMany({
      where: {
        id: payment.studioRequestId,
        status: { in: ["DRAFT", "SUBMITTED", "PAYMENT_PENDING"] }
      },
      data: {
        paymentStatus: "PAID",
        status: "PAID"
      }
    });

    await client.studioRequest.update({where:{id:payment.studioRequestId},data:{paymentStatus:"PAID"}});
    await client.studioTimelineEvent.create({
      data: {
        actorId: payment.payerId,
        eventType: "PAYMENT_RECEIVED",
        message: "Studio payment received.",
        metadata: {
          paymentId: payment.id,
          product: payment.product
        },
        studioRequestId: payment.studioRequestId
      }
    });
    const studioRequest = await client.studioRequest.findUnique({
      select: {
        requesterId: true
      },
      where: {
        id: payment.studioRequestId
      }
    });

    if (studioRequest?.requesterId) {
      await client.studioNotification.create({
        data: {
          message: "Your payment was verified. Check the current order status; cancelled or completed orders are not reopened.",
          recipientId: studioRequest.requesterId,
          studioRequestId: payment.studioRequestId,
          title: "Studio payment received",
          type: "PAYMENT_RECEIVED"
        }
      });
    }

    await auditLog({
      action: "STUDIO_PAYMENT_COMPLETED",
      actorId: payment.payerId,
      entityId: payment.studioRequestId,
      entityType: "studio_request",
      metadata: {
        paymentId: payment.id,
        product: payment.product
      }
    }, client);
  }

  if ((payment.product === "SERVICE_BOOKING_DEPOSIT" || payment.product === "SERVICE_FINAL_PAYMENT") && payment.serviceBookingId) {
    await client.serviceBooking.updateMany({
      data: {
        status: payment.product === "SERVICE_FINAL_PAYMENT" ? "COMPLETED" : "UPCOMING"
      },
      where: {
        id: payment.serviceBookingId,
        status: payment.product === "SERVICE_FINAL_PAYMENT" ? "IN_PROGRESS" : "UPCOMING"
      }
    });

    await auditLog({
      action: "SERVICE_PAYMENT_COMPLETED",
      actorId: payment.payerId,
      entityId: payment.serviceBookingId,
      entityType: "service_booking",
      metadata: {
        paymentId: payment.id,
        product: payment.product
      }
    }, client);
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
  // A payment row is the idempotency lock. Status, entitlements and their audit
  // records commit together; an entitlement failure leaves the payment retryable.
  return db.$transaction(async tx => {
    const reference=await tx.payment.findUnique({where:{razorpayOrderId:orderId},select:{id:true}});
    if(!reference)return null;
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${reference.id} FOR UPDATE`;
    const existing=await tx.payment.findUnique({where:{id:reference.id}});
    if(!existing)return null;
    if(existing.status==="PAID")return existing;
    if(["REFUNDED","CANCELLED"].includes(existing.status)) {
      await auditLog({action:"PAYMENT_CAPTURE_REQUIRES_REVIEW",actorId:existing.payerId,
        entityId:existing.id,entityType:"payment",metadata:{product:existing.product}},tx);
      return existing;
    }
    const payment=await tx.payment.update({where:{id:existing.id},data:{paidAt:new Date(),
      razorpayPaymentId:paymentId,razorpaySignature:signature,razorpayWebhookEventId:webhookEventId,status:"PAID"}});
    await applyPaidEntitlement(payment,tx);
    await auditLog({action:"PAYMENT_VERIFIED",actorId:payment.payerId,entityId:payment.id,entityType:"payment",
      metadata:{orderId,paymentId,product:payment.product}},tx);
    return payment;
  });
}
