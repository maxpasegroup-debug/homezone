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
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    body: JSON.stringify({
      amount,
      currency,
      notes,
      receipt
    }),
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Razorpay order creation failed: ${body}`);
  }

  return (await response.json()) as RazorpayOrderResponse;
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
