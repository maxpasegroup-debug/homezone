import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const fixture = { RAZORPAY_KEY_ID: "synthetic-key", RAZORPAY_KEY_SECRET: "SYNTHETIC_PRIVATE_SECRET", RAZORPAY_WEBHOOK_SECRET: "SYNTHETIC_PRIVATE_WEBHOOK" };
globalThis.__razorpayOrderFixture = fixture;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/env") return { url: `data:text/javascript,${encodeURIComponent("export const env = globalThis.__razorpayOrderFixture;")}`, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith("/src/lib/payments/razorpay.ts")) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
    return next(url, context);
  }
});
const provider = await import("../src/lib/payments/razorpay.ts");
hooks.deregister();
const input = { amount: 10000, currency: "INR", receipt: "synthetic-invoice", notes: { paymentId: "synthetic-payment" } };
const validOrder = { id: "order_synthetic", amount: input.amount, currency: input.currency, receipt: input.receipt, status: "created" };
const originalFetch = globalThis.fetch;
const waitTurn = () => new Promise(resolve => queueMicrotask(resolve));
function fixedError(error) {
  assert.match(error.message, /^Razorpay order confirmation (unavailable|timed out)$/);
  assert.doesNotMatch(error.message, /SYNTHETIC_PRIVATE/); return true;
}

test("payment order transport has bounded acknowledgments and sanitized errors without external requests", async t => {
  try {
    await t.test("successful order uses fixed HTTPS host, preserves fields and disallows redirects", async () => {
      let calls = 0;
      globalThis.fetch = async (url, options) => {
        calls++; assert.equal(url, "https://api.razorpay.com/v1/orders"); assert.equal(options.redirect, "error");
        assert.equal(options.method, "POST"); assert.equal(options.signal.aborted, false);
        assert.deepEqual(JSON.parse(options.body), input);
        return { ok: true, json: async () => validOrder };
      };
      assert.deepEqual(await provider.createRazorpayOrder(input), validOrder); assert.equal(calls, 1);
    });
    await t.test("non-OK responses never read or expose provider response bodies", async () => {
      let calls = 0, bodyReads = 0;
      globalThis.fetch = async () => { calls++; return { ok: false, text: async () => { bodyReads++; return "SYNTHETIC_PRIVATE_PROVIDER_BODY"; } }; };
      await assert.rejects(provider.createRazorpayOrder(input), fixedError);
      assert.equal(calls, 1); assert.equal(bodyReads, 0);
    });
    await t.test("network and invalid JSON errors are replaced by fixed diagnostics", async () => {
      for (const handler of [async () => { throw new Error("SYNTHETIC_PRIVATE_NETWORK"); },
        async () => ({ ok: true, json: async () => { throw new Error("SYNTHETIC_PRIVATE_JSON"); } })]) {
        let calls = 0; globalThis.fetch = async () => { calls++; return handler(); };
        await assert.rejects(provider.createRazorpayOrder(input), fixedError); assert.equal(calls, 1);
      }
    });
    await t.test("missing fields and changed amount/currency/receipt cannot confirm an order", async () => {
      for (const value of [null, [], {}, { ...validOrder, amount: 99900 }, { ...validOrder, currency: "USD" },
        { ...validOrder, receipt: "other-invoice" }, { ...validOrder, id: "" }, { ...validOrder, status: 42 }]) {
        globalThis.fetch = async () => ({ ok: true, json: async () => value });
        await assert.rejects(provider.createRazorpayOrder(input), fixedError);
      }
    });
    await t.test("one deadline aborts a stalled request without retries", async () => {
      t.mock.timers.enable({ apis: ["setTimeout"] });
      try {
        let calls = 0, signal;
        globalThis.fetch = async (_, options) => { calls++; signal = options.signal; return new Promise(() => {}); };
        const result = assert.rejects(provider.createRazorpayOrder(input), fixedError);
        await waitTurn(); t.mock.timers.tick(14_999); assert.equal(signal.aborted, false);
        t.mock.timers.tick(1); await result; assert.equal(signal.aborted, true); assert.equal(calls, 1);
      } finally { t.mock.timers.reset(); }
    });
    await t.test("deadline covers stalled JSON acknowledgment after HTTP success", async () => {
      t.mock.timers.enable({ apis: ["setTimeout"] });
      try {
        let signal, reads = 0;
        globalThis.fetch = async (_, options) => { signal = options.signal; return { ok: true, json: async () => { reads++; return new Promise(() => {}); } }; };
        const result = assert.rejects(provider.createRazorpayOrder(input), fixedError);
        await waitTurn(); assert.equal(reads, 1); t.mock.timers.tick(15_000); await result; assert.equal(signal.aborted, true);
      } finally { t.mock.timers.reset(); }
    });
    await t.test("successful acknowledgment clears its deadline", async () => {
      t.mock.timers.enable({ apis: ["setTimeout"] });
      try {
        let signal;
        globalThis.fetch = async (_, options) => { signal = options.signal; return { ok: true, json: async () => validOrder }; };
        await provider.createRazorpayOrder(input); t.mock.timers.tick(15_000);
        assert.equal(signal.aborted, false);
      } finally { t.mock.timers.reset(); }
    });
    await t.test("known invalid input and missing keys fail before network activity", async () => {
      let calls = 0; globalThis.fetch = async () => { calls++; throw new Error("Unexpected request"); };
      for (const amount of [0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(provider.createRazorpayOrder({ ...input, amount }), /Invalid payment order/);
      const secret = fixture.RAZORPAY_KEY_SECRET; delete fixture.RAZORPAY_KEY_SECRET;
      try { await assert.rejects(provider.createRazorpayOrder(input), /keys are not configured/); }
      finally { fixture.RAZORPAY_KEY_SECRET = secret; }
      assert.equal(calls, 0);
    });
    await t.test("existing payment and webhook signature validation remains unchanged", () => {
      const payload = { orderId: "synthetic-order", paymentId: "synthetic-payment" };
      const signature = crypto.createHmac("sha256", fixture.RAZORPAY_KEY_SECRET).update(`${payload.orderId}|${payload.paymentId}`).digest("hex");
      assert.equal(provider.verifyRazorpayPaymentSignature({ ...payload, signature }), true);
      assert.equal(provider.verifyRazorpayPaymentSignature({ ...payload, signature: "invalid" }), false);
      const body = "synthetic-webhook";
      const webhook = crypto.createHmac("sha256", fixture.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
      assert.equal(provider.verifyRazorpayWebhookSignature({ body, signature: webhook }), true);
      assert.equal(provider.verifyRazorpayWebhookSignature({ body, signature: "invalid" }), false);
    });
  } finally { globalThis.fetch = originalFetch; }
});
