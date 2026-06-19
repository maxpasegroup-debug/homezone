import { auditLog } from "@/lib/audit";
import { handleApiError, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { markPaymentPaid } from "@/lib/payments/service";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !verifyRazorpayWebhookSignature({ body, signature })) {
      return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(body) as RazorpayWebhookPayload;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    await auditLog({
      action: "RAZORPAY_WEBHOOK_RECEIVED",
      entityId: orderId,
      entityType: "payment",
      metadata: {
        event: payload.event,
        paymentId
      }
    });

    if (payload.event === "payment.captured" && orderId && paymentId) {
      await markPaymentPaid({
        orderId,
        paymentId,
        webhookEventId: paymentId
      });
    }

    if (payload.event === "payment.failed" && orderId) {
      const payment = await db.payment.findUnique({
        where: {
          razorpayOrderId: orderId
        }
      });

      if (payment && payment.status !== "PAID") {
        await db.payment.update({
          where: {
            id: payment.id
          },
          data: {
            failureReason: "Razorpay payment.failed webhook",
            status: "FAILED"
          }
        });
        await auditLog({
          action: "PAYMENT_FAILED",
          actorId: payment.payerId,
          entityId: payment.id,
          entityType: "payment",
          metadata: {
            event: payload.event,
            orderId,
            paymentId
          }
        });
      }
    }

    return ok({ received: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/payments/webhook"
    });
  }
}
