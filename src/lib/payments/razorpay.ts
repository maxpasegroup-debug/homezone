import crypto from "node:crypto";
import { env } from "@/lib/env";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

function requireRazorpayKeys() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured");
  }

  return {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET
  };
}

function safeCompareSignature(expected: string, signature: string) {
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function createRazorpayOrder({
  amount,
  currency,
  receipt,
  notes
}: {
  amount: number;
  currency: string;
  notes: Record<string, string>;
  receipt: string;
}) {
  const { keyId, keySecret } = requireRazorpayKeys();
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  if (!Number.isSafeInteger(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency) || !receipt) {
    throw new Error("Invalid payment order");
  }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Payment order deadline exceeded"));
    }, 15_000);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch("https://api.razorpay.com/v1/orders", {
          body: JSON.stringify({ amount, currency, notes, receipt }),
          headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
          method: "POST", redirect: "error", signal: controller.signal
        });
        // Provider bodies can include account information. Never read them into
        // exceptions or logs, including rejected orders and malformed JSON.
        if (!response.ok) throw new Error("Payment order rejected");
        const order: unknown = await response.json();
        if (!order || typeof order !== "object" || Array.isArray(order)) throw new Error("Invalid payment order acknowledgment");
        const value = order as Record<string, unknown>;
        if (typeof value.id !== "string" || !value.id || value.id.length > 128 || value.amount !== amount ||
          value.currency !== currency || value.receipt !== receipt || typeof value.status !== "string" || !value.status || value.status.length > 64) {
          throw new Error("Invalid payment order acknowledgment");
        }
        return order as RazorpayOrderResponse;
      })(),
      deadline
    ]);
  } catch {
    // Timeout/transport errors do not prove the provider failed to create an
    // order. Callers must preserve their reservation and must not retry a charge.
    throw new Error(controller.signal.aborted ? "Razorpay order confirmation timed out" : "Razorpay order confirmation unavailable");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function getRazorpayKeyId() {
  return requireRazorpayKeys().keyId;
}

export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = requireRazorpayKeys();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return safeCompareSignature(expected, signature);
}

export function verifyRazorpayWebhookSignature({
  body,
  signature
}: {
  body: string;
  signature: string;
}) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Razorpay webhook secret is not configured");
  }

  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return safeCompareSignature(expected, signature);
}
