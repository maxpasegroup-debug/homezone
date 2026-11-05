import { auditLog } from "@/lib/audit";
import { apiError, handleApiError, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { markPaymentPaid, revokeBuyerPlusPayment } from "@/lib/payments/service";
import { registerWebhookEvent, updateWebhookEventStatus } from "@/lib/platform/webhooks";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        captured?: boolean;
        amount?: number;
        currency?: string;
      };
    };
    refund?: { entity?: { id?: string; payment_id?: string; status?: string } };
  };
};

const maxWebhookBytes = 262_144;

async function readWebhookBody(request: Request): Promise<string | Response> {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxWebhookBytes) return apiError("Webhook payload is too large", 413);
  const reader = request.body?.getReader();
  if (!reader) return apiError("Invalid webhook payload", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > maxWebhookBytes) {
        await reader.cancel();
        return apiError("Webhook payload is too large", 413);
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    return apiError("Invalid webhook payload", 400);
  } finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) return apiError("Invalid webhook signature", 400);
    const body = await readWebhookBody(request);
    if (body instanceof Response) return body;

    if (!verifyRazorpayWebhookSignature({ body, signature })) {
      return apiError("Invalid webhook signature", 400);
    }

    let payload: RazorpayWebhookPayload;
    try {
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      payload = parsed as RazorpayWebhookPayload;
    } catch { return apiError("Invalid webhook payload", 400); }
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    const refund = payload.payload?.refund?.entity;
    const refundEvent = payload.event === "refund.created" || payload.event === "refund.processed";
    if (refundEvent && (!refund?.id || !refund.payment_id)) return apiError("Invalid refund notification", 400);
    const eventId = `${payload.event ?? "razorpay"}:${refundEvent ? refund!.id : paymentId ?? orderId ?? body.length}`;
    const webhook = await registerWebhookEvent({
      eventId,
      eventType: payload.event,
      payload: payload as never,
      provider: "RAZORPAY"
    });

    if (webhook.duplicate && webhook.event.status === "PROCESSED") {
      return ok({ duplicate: true, received: true });
    }

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
      const reference = await db.payment.findUnique({ where: { razorpayOrderId: orderId },
        select: { product: true, amount: true, currency: true } });
      if (reference?.product === "BUYER_PLUS" && (paymentEntity?.status !== "captured" || paymentEntity.captured !== true ||
          !Number.isSafeInteger(paymentEntity.amount) || paymentEntity.amount !== reference.amount || paymentEntity.currency !== reference.currency)) {
        await updateWebhookEventStatus({ eventId, provider: "RAZORPAY", status: "FAILED", lastError: "Plus capture acknowledgment mismatch" });
        return apiError("Payment confirmation needs review", 400);
      }
      await markPaymentPaid({
        orderId,
        paymentId,
        webhookEventId: paymentId,
        ...(reference?.product === "BUYER_PLUS" ? { captured: { amount: paymentEntity!.amount!, currency: paymentEntity!.currency! } } : {})
      });
      await updateWebhookEventStatus({
        eventId,
        provider: "RAZORPAY",
        status: "PROCESSED"
      });
    }

    if (refundEvent) {
      const revoked = await revokeBuyerPlusPayment(refund!.payment_id!);
      if (revoked === "unmapped") {
        await updateWebhookEventStatus({ eventId, provider: "RAZORPAY", status: "FAILED", lastError: "Refund payment confirmation pending" });
        return apiError("Refund confirmation is pending. Retry this notification.", 503);
      }
      await updateWebhookEventStatus({ eventId, provider: "RAZORPAY", status: "PROCESSED" });
    }

    if (payload.event === "payment.failed" && orderId) {
      const payment = await db.payment.findUnique({
        where: {
          razorpayOrderId: orderId
        }
      });

      if (payment && payment.status !== "PAID") {
        await db.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: ["CREATED", "PENDING", "FAILED"] }
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
      await updateWebhookEventStatus({
        eventId,
        provider: "RAZORPAY",
        status: "PROCESSED"
      });
    }

    if (payload.event !== "payment.captured" && payload.event !== "payment.failed" && !refundEvent) {
      await updateWebhookEventStatus({
        eventId,
        provider: "RAZORPAY",
        status: "IGNORED"
      });
    }

    return ok({ received: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/payments/webhook"
    });
  }
}
