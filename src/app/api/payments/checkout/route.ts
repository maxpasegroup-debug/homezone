import type { PaymentProduct } from "@prisma/client";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import {
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
    const product = parsed.data.product as PaymentProduct;
    const config = getPaymentProduct(product);

    if (!isAllowedForRole({ product, role: profile.role })) {
      return forbidden("This product is not available for your role");
    }

    const propertyId = parsed.data.propertyId;
    let studioRequestId = parsed.data.studioRequestId;

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
          paymentStatus: "PENDING",
          propertyId,
          requesterId: profile.id,
          serviceType: product,
          status: "payment_pending"
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
