import type { PaymentProduct } from "@prisma/client";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import {
  apiError,
  forbidden,
  handleApiError,
  ok,
  parseJson,
  rateLimited,
  unauthorized
} from "@/lib/api/response";
import { paymentCheckoutSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { getPaymentProduct } from "@/lib/payments/catalog";
import { createInvoiceNumber, isAllowedForRole } from "@/lib/payments/catalog";
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/payments/razorpay";
import { invoiceMetadata } from "@/lib/payments/service";
import { isServicePayment, reserveServicePayment } from "@/lib/payments/service-checkout";
import { reserveBuyerPlusPayment } from "@/lib/payments/buyer-plus-checkout";
import { buyerPlusWebsiteCheckoutConfigured } from "@/lib/engagement/membership";
import { authOrigin } from "@/lib/auth/redirect";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "payments:checkout", session.user.id),
      limit: 20,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, paymentCheckoutSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    if (profile.verificationStatus === "SUSPENDED") return forbidden();
    const product = parsed.data.product as PaymentProduct;
    const config = getPaymentProduct(product);

    if (!isAllowedForRole({ product, role: profile.role })) {
      return forbidden("This product is not available for your role");
    }

    const propertyId = parsed.data.propertyId;
    const serviceBookingId = parsed.data.serviceBookingId;
    let studioRequestId = parsed.data.studioRequestId;

    if (product === "BUYER_PLUS") {
      // Native digital-access purchases are deliberately unavailable until an
      // approved store-billing integration exists. This separate website gate
      // cannot be inferred from the existing service-payment handoff flag.
      if (!buyerPlusWebsiteCheckoutConfigured()) return apiError("Plus checkout is not available yet.", 503);
      const origin = authOrigin();
      if (!origin.startsWith("https:") || request.headers.get("origin") !== origin ||
          request.headers.get("sec-fetch-site") === "cross-site") return forbidden("Request not permitted.");
      if (propertyId || serviceBookingId || studioRequestId || parsed.data.city || parsed.data.notes) {
        return apiError("This plan does not accept property or service references.", 400);
      }
      let keyId: string;
      try { keyId = getRazorpayKeyId(); } catch {
        return apiError("Plus checkout is not available yet.", 503);
      }
      const reserved = await reserveBuyerPlusPayment(profile.id);
      if ("error" in reserved) return apiError(reserved.error, reserved.status);
      const payment = reserved.payment;
      let orderId = payment.razorpayOrderId;
      if (!reserved.reuse) {
        try {
          const order = await createRazorpayOrder({ amount: payment.amount, currency: payment.currency,
            receipt: payment.invoiceNumber, notes: { paymentId: payment.id, product } });
          if (!order.id || order.amount !== payment.amount || order.currency !== payment.currency || order.receipt !== payment.invoiceNumber) {
            throw new Error("Payment acknowledgment mismatch");
          }
          await db.payment.update({ where: { id: payment.id }, data: { razorpayOrderId: order.id, status: "PENDING" } });
          orderId = order.id;
        } catch {
          // The provider may have created an order. Keep CREATED reserved and
          // require reconciliation rather than silently risking a second charge.
          return apiError("Payment confirmation was not received. Check Payments before trying again.", 503);
        }
        await auditLog({ action: "PAYMENT_ORDER_CREATED", actorId: profile.id, entityId: payment.id,
          entityType: "payment", metadata: { product } });
      }
      return ok({ amount: payment.amount, currency: payment.currency, description: payment.description,
        invoiceNumber: payment.invoiceNumber, keyId, orderId, paymentId: payment.id, product },
        { headers: { "Cache-Control": "private, no-store" } });
    }

    if (isServicePayment(product)) {
      if (!serviceBookingId || propertyId || studioRequestId) {
        return apiError("A service booking is required for this payment", 400);
      }
      let keyId: string;
      try {
        // This validates both provider keys without making a request. A known
        // configuration failure must not leave an ambiguous durable reservation.
        keyId = getRazorpayKeyId();
      } catch {
        return handleApiError(new Error("Service payment configuration unavailable"), {
          route: "POST /api/payments/checkout", stage: "service-payment-configuration"
        });
      }
      const reserved = await reserveServicePayment({ bookingId: serviceBookingId, product, actor: profile });
      if ("error" in reserved) return apiError(reserved.error, reserved.status);
      const payment = reserved.payment;
      let orderId = payment.razorpayOrderId;
      if (!reserved.reuse) {
        try {
          const order = await createRazorpayOrder({ amount: payment.amount, currency: payment.currency,
            notes: { paymentId: payment.id, product }, receipt: payment.invoiceNumber });
          if (!order.id || order.amount !== payment.amount || order.currency !== payment.currency || order.receipt !== payment.invoiceNumber) {
            throw new Error("Payment order acknowledgment mismatch");
          }
          await db.payment.update({ where: { id: payment.id }, data: { razorpayOrderId: order.id, status: "PENDING" } });
          orderId = order.id;
        } catch {
          // An interrupted request can have created an external order. Keep the
          // reservation; never silently create another charge or log provider bodies.
          return handleApiError(new Error("Service payment order confirmation unavailable"), {
            route: "POST /api/payments/checkout", stage: "service-order-confirmation"
          });
        }
        await auditLog({ action: "PAYMENT_ORDER_CREATED", actorId: profile.id, entityId: payment.id,
          entityType: "payment", metadata: { product } });
      }
      return ok({ amount: payment.amount, currency: payment.currency, description: payment.description,
        invoiceNumber: payment.invoiceNumber, keyId, orderId, paymentId: payment.id, product });
    }
    if (serviceBookingId) return apiError("This product does not accept a service booking", 400);

    if (config.requiresProperty) {
      if (!propertyId) {
        return forbidden("Property is required for this payment");
      }

      const property = await db.property.findUnique({
        where: {
          id: propertyId
        },
        select: {
          ownerId: true
        }
      });

      if (!property || (property.ownerId !== profile.id && !isAdminRole(profile.role))) {
        return forbidden("You can only upgrade your own listings");
      }
    }

    if (studioRequestId) {
      const requestRecord = await db.studioRequest.findUnique({
        where: {
          id: studioRequestId
        },
        select: {
          requesterId: true
        }
      });

      if (
        !requestRecord ||
        (requestRecord.requesterId !== profile.id && !isAdminRole(profile.role))
      ) {
        return forbidden("You can only pay for your own studio requests");
      }
    }

    if (config.createsStudioRequest && !studioRequestId) {
      const studioRequest = await db.studioRequest.create({
        data: {
          city: parsed.data.city,
          notes: parsed.data.notes,
          orderValue: config.amount,
          paymentStatus: "PENDING",
          propertyId,
          requesterId: profile.id,
          serviceType: product,
          status: "PAYMENT_PENDING",
          timeline: {
            create: {
              actorId: profile.id,
              eventType: "PAYMENT_ORDER_CREATED",
              message: "Studio order created from payment checkout.",
              metadata: {
                product
              }
            }
          }
        }
      });
      studioRequestId = studioRequest.id;
    }

    const invoiceNumber = createInvoiceNumber();
    const payment = await db.payment.create({
      data: {
        amount: config.amount,
        currency: config.currency,
        description: config.description,
        invoiceMetadata: invoiceMetadata({
          amount: config.amount,
          currency: config.currency,
          product
        }),
        invoiceNumber,
        payerId: profile.id,
        product,
        propertyId,
        serviceBookingId,
        status: "CREATED",
        studioRequestId
      }
    });

    const order = await createRazorpayOrder({
      amount: payment.amount,
      currency: payment.currency,
      notes: {
        paymentId: payment.id,
        product: payment.product
      },
      receipt: payment.invoiceNumber
    });

    const updated = await db.payment.update({
      where: {
        id: payment.id
      },
      data: {
        razorpayOrderId: order.id,
        status: "PENDING"
      }
    });

    await auditLog({
      action: "PAYMENT_ORDER_CREATED",
      actorId: profile.id,
      entityId: payment.id,
      entityType: "payment",
      metadata: {
        orderId: order.id,
        product
      }
    });

    return ok({
      amount: updated.amount,
      currency: updated.currency,
      description: updated.description,
      invoiceNumber: updated.invoiceNumber,
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      paymentId: updated.id,
      product: updated.product
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/payments/checkout"
    });
  }
}
