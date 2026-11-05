import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Actual checkout, webhook, entitlement, membership and callback code; all
// sessions, transactions and provider acknowledgments below are synthetic.
const state = { payments: [], subscriptions: [], webhooks: [], audit: [], orders: [], locks: [] };
globalThis.__buyerPlus = state;
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "provider_eventId") return matches(row, value);
    if (key === "AND") return value.every(part => matches(row, part));
    if (key === "OR") return value.some(part => matches(row, part));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("path" in value) return value.path.reduce((part, path) => part?.[path], row[key]) === value.equals;
      if ("in" in value) return value.in.includes(row[key]);
      if ("some" in value) return row[key].some(part => matches(part, value.some));
      if ("lte" in value && !(row[key] <= value.lte)) return false;
      if ("gt" in value && !(row[key] > value.gt)) return false;
      if ("lte" in value || "gt" in value) return true;
      return matches(row[key], value);
    }
    return row[key] === value;
  });
}
const projection = (row, select) => row == null ? null : !select ? structuredClone(row) :
  Object.fromEntries(Object.entries(select).filter(([, selected]) => selected).map(([key]) => [key, structuredClone(row[key])]));
const withPayments = row => ({ ...row, payments: state.payments.filter(payment => payment.subscriptionId === row.id) });
let queue = Promise.resolve();
state.db = {
  $queryRaw: async strings => { state.locks.push(strings.join("")); return []; },
  $transaction: callback => {
    const task = queue.then(async () => {
      const snapshot = structuredClone({ payments: state.payments, subscriptions: state.subscriptions, audit: state.audit });
      try { return await callback(state.db); } catch (error) { Object.assign(state, snapshot); throw error; }
    });
    queue = task.catch(() => {});
    return task;
  },
  profile: { findUnique: async args => projection(state.currentProfile, args.select) },
  payment: {
    findUnique: async args => {
      if (args.where.razorpayPaymentId && state.refundLookupMissOnce) { state.refundLookupMissOnce = false; return null; }
      return projection(state.payments.find(row => matches(row, args.where)), args.select);
    },
    findMany: async args => state.payments.filter(row => matches(row, args.where)).map(row => projection(row, args.select)),
    create: async ({ data }) => {
      const row = { id: `payment-${state.payments.length + 1}`, razorpayOrderId: null, razorpayPaymentId: null, subscriptionId: null, ...data };
      state.payments.push(row); return structuredClone(row);
    },
    update: async ({ where, data }) => {
      const row = state.payments.find(row => matches(row, where)); assert.ok(row); Object.assign(row, data); return structuredClone(row);
    },
    updateMany: async ({ where, data }) => {
      const rows = state.payments.filter(row => matches(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
    }
  },
  subscription: {
    findFirst: async args => projection(state.subscriptions.map(withPayments).find(row => matches(row, args.where)), args.select),
    findMany: async args => state.subscriptions.map(withPayments).filter(row => matches(row, args.where)).map(row => projection(row, args.select)),
    create: async ({ data }) => {
      if (state.failSubscription) throw new Error("SYNTHETIC_PRIVATE_FAILURE");
      const row = { id: `subscription-${state.subscriptions.length + 1}`, ...data }; state.subscriptions.push(row); return structuredClone(row);
    },
    updateMany: async ({ where, data }) => {
      const rows = state.subscriptions.filter(row => matches(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
    }
  },
  webhookEvent: {
    findUnique: async args => projection(state.webhooks.find(row => matches(row, args.where)), args.select),
    findFirst: async args => projection(state.webhooks.find(row => matches(row, args.where)), args.select),
    create: async ({ data }) => { const row = { id: `webhook-${state.webhooks.length + 1}`, ...data }; state.webhooks.push(row); return structuredClone(row); },
    update: async ({ where, data }) => { const row = state.webhooks.find(row => matches(row, where)); Object.assign(row, data); return structuredClone(row); }
  }
};
const mocks = {
  "@/auth": "export const auth = async () => globalThis.__buyerPlus.profile ? {user:{id:'synthetic-user'}} : null;",
  "@/lib/auth/profile": "export const getOrCreateProfile = async () => globalThis.__buyerPlus.profile;",
  "@/lib/auth/redirect": "export const authOrigin = () => 'https://fixture.invalid';",
  "@/lib/db": "export const db = globalThis.__buyerPlus.db;",
  "@/lib/audit": "export const auditLog = async data => {globalThis.__buyerPlus.audit.push(data)};",
  "@/lib/logging/logger": "export const captureException = () => {};",
  "@/lib/api/rate-limit": "export const checkRateLimit = () => ({allowed:true}); export const rateLimitKey = () => 'synthetic';",
  "@/lib/payments/razorpay": `export const getRazorpayKeyId=()=> 'synthetic-public-key';
    export const createRazorpayOrder=async args=>{const s=globalThis.__buyerPlus;s.orders.push(args);if(s.providerFailure)throw Error('SYNTHETIC_PRIVATE_PROVIDER');return{id:'order-synthetic-'+s.orders.length,...args}};
    export const verifyRazorpayPaymentSignature=()=>globalThis.__buyerPlus.signatureValid;
    export const verifyRazorpayWebhookSignature=()=>globalThis.__buyerPlus.signatureValid;`
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier === "next/server") return next("next/server.js", context);
    if (specifier.startsWith("@/")) return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
    return next(url, context);
  }
});
const checkout = await import("../backend/api/payments/checkout/route.ts");
const verify = await import("../backend/api/payments/verify/route.ts");
const webhook = await import("../backend/api/payments/webhook/route.ts");
const service = await import("../src/lib/payments/service.ts");
const membership = await import("../src/app/api/mobile/membership/route.ts");
hooks.deregister();

const names = ["HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED", "HOMEZONE_ENGAGEMENT_ENABLED", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"];
const previousEnv = Object.fromEntries(names.map(name => [name, process.env[name]]));
function reset() {
  for (const key of ["payments", "subscriptions", "webhooks", "audit", "orders", "locks"]) state[key] = [];
  state.profile = { id: "buyer-0001", role: "USER", verificationStatus: "PENDING" }; state.currentProfile = { ...state.profile };
  state.signatureValid = true; state.providerFailure = false; state.failSubscription = false; state.refundLookupMissOnce = false;
  process.env.HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED = "true";
  process.env.HOMEZONE_ENGAGEMENT_ENABLED = "true";
  for (const name of names.slice(2)) process.env[name] = "synthetic-configured";
}
const request = (path, body, headers = {}) => new Request(`https://fixture.invalid${path}`, {
  method: "POST", headers: { "content-type": "application/json", origin: "https://fixture.invalid", ...headers }, body: JSON.stringify(body)
});
const pay = (extra = {}, headers = {}) => checkout.POST(request("/api/payments/checkout", { product: "BUYER_PLUS", ...extra }, headers));
const captureBody = (patch = {}) => ({ event: "payment.captured", payload: { payment: { entity: {
  id: "pay-synthetic-0001", order_id: state.payments[0]?.razorpayOrderId, status: "captured", captured: true, amount: 29900, currency: "INR", ...patch
} } } });
const notify = body => webhook.POST(request("/api/payments/webhook", body, { "x-razorpay-signature": "synthetic-signature" }));
const refund = () => notify({ event: "refund.processed", payload: { refund: { entity: { id: "refund-synthetic-0001", payment_id: "pay-synthetic-0001", status: "processed" } } } });

test("Buyer Plus payments are opt-in, serialized, capture-backed and revocable", async t => {
  try {
    await t.test("configuration and exact browser origin fail before creating payment records", async () => {
      for (const name of names) {
        reset(); delete process.env[name]; assert.equal((await pay()).status, 503); assert.equal(state.payments.length, 0);
      }
      for (const headers of [{ origin: "null" }, { origin: "https://other.invalid" }, { "sec-fetch-site": "cross-site" }]) {
        reset(); assert.equal((await pay({}, headers)).status, 403); assert.equal(state.orders.length, 0);
      }
      reset(); const body = request("/api/payments/checkout", { product: "BUYER_PLUS" }); body.headers.delete("origin");
      assert.equal((await checkout.POST(body)).status, 403);
    });
    await t.test("only fresh nonsuspended USER can purchase; unrelated references rejected", async () => {
      for (const role of ["OWNER", "BROKER", "BUILDER", "SERVICE_PROVIDER", "ADMIN", "SUPER_ADMIN"]) {
        reset(); state.profile.role = role; state.currentProfile.role = role; assert.equal((await pay()).status, 403); assert.equal(state.payments.length, 0);
      }
      for (const patch of [{ role: "OWNER" }, { verificationStatus: "SUSPENDED" }]) {
        reset(); Object.assign(state.currentProfile, patch); assert.equal((await pay()).status, 403); assert.equal(state.orders.length, 0);
      }
      for (const extra of [{ propertyId: "property-0001" }, { serviceBookingId: "booking-0001" }, { studioRequestId: "studio-0001" }]) {
        reset(); assert.equal((await pay(extra)).status, 400); assert.equal(state.payments.length, 0);
      }
    });
    await t.test("server fixes price and serializes concurrent/repeated checkout", async () => {
      reset(); const results = await Promise.all([pay(), pay()]);
      assert.ok(results.every(response => [200, 409].includes(response.status))); assert.equal(state.orders.length, 1); assert.equal(state.payments.length, 1);
      assert.equal((await pay({ amount: 1 })).status, 200); assert.equal(state.orders.length, 1);
      assert.equal(state.orders[0].amount, 29900); assert.equal(state.orders[0].currency, "INR");
      assert.ok(state.locks.every(lock => lock.includes('"Profile"') && lock.includes("FOR UPDATE")));
    });
    await t.test("uncertain provider failure preserves reservation and cannot retry another charge", async () => {
      reset(); state.providerFailure = true; const response = await pay(); assert.equal(response.status, 503);
      assert.doesNotMatch(JSON.stringify(await response.json()), /SYNTHETIC_PRIVATE/);
      state.providerFailure = false; assert.equal((await pay()).status, 409); assert.equal(state.orders.length, 1); assert.equal(state.payments[0].status, "CREATED");
    });
    await t.test("checkout signature cannot activate access", async () => {
      reset(); await pay(); const response = await verify.POST(request("/api/payments/verify", {
        razorpay_order_id: state.payments[0].razorpayOrderId, razorpay_payment_id: "pay-synthetic-0001", razorpay_signature: "synthetic-valid-signature"
      }));
      assert.equal(response.status, 200); assert.equal((await response.json()).status, "PENDING"); assert.equal(state.subscriptions.length, 0); assert.equal(state.payments[0].status, "PENDING");
      assert.equal(await service.markPaymentPaid({ orderId: state.payments[0].razorpayOrderId, paymentId: "pay-synthetic-0001" }), null);
    });
    await t.test("unsigned and mismatched capture acknowledgments never grant membership", async () => {
      reset(); await pay(); state.signatureValid = false; assert.equal((await notify(captureBody())).status, 400); assert.equal(state.subscriptions.length, 0);
      for (const patch of [{ amount: 1 }, { currency: "USD" }, { status: "authorized" }, { captured: false }]) {
        reset(); await pay(); assert.equal((await notify(captureBody(patch))).status, 400); assert.equal(state.subscriptions.length, 0); assert.equal(state.payments[0].status, "PENDING");
      }
    });
    await t.test("trusted capture activates exact snapshot once, callback/webhook retries are idempotent", async () => {
      reset(); await pay(); const response = await notify(captureBody()); assert.equal(response.status, 200);
      assert.equal(state.payments[0].status, "PAID"); assert.equal(state.subscriptions.length, 1);
      assert.equal(state.subscriptions[0].contactLimit, 10); assert.equal(state.subscriptions[0].contactsUsed, 0);
      assert.equal(state.subscriptions[0].endsAt - state.subscriptions[0].startsAt, 30 * 86400000);
      await notify(captureBody()); assert.equal(state.subscriptions.length, 1); assert.equal((await pay()).status, 409);
      const view = await membership.GET(); assert.equal(view.status, 200); const body = await view.json();
      assert.equal(body.active.remaining, 10); assert.equal(body.mobileCheckoutAvailable, false);
      assert.equal(view.headers.get("cache-control"), "private, no-store");
    });
    await t.test("failed entitlement transaction rolls payment back and can retry capture", async () => {
      reset(); await pay(); state.failSubscription = true; assert.equal((await notify(captureBody())).status, 500);
      assert.equal(state.payments[0].status, "PENDING"); assert.equal(state.subscriptions.length, 0);
      state.failSubscription = false; assert.equal((await notify(captureBody())).status, 200); assert.equal(state.subscriptions.length, 1);
    });
    await t.test("refund revokes access and late capture cannot reactivate it", async () => {
      reset(); await pay(); await notify(captureBody()); await refund(); await refund();
      assert.equal(state.payments[0].status, "REFUNDED"); assert.equal(state.subscriptions[0].status, "CANCELLED");
      assert.equal((await (await membership.GET()).json()).active, null);
      await service.markPaymentPaid({ orderId: state.payments[0].razorpayOrderId, paymentId: "pay-synthetic-0001", captured: { amount: 29900, currency: "INR" } });
      assert.equal(state.subscriptions.length, 1); assert.equal(state.subscriptions[0].status, "CANCELLED");
    });
    await t.test("refund cannot be acknowledged while a concurrent capture identifier is invisible", async () => {
      reset(); await pay(); await notify(captureBody());
      // Simulate READ COMMITTED visibility while capture still owns the row lock:
      // the refund's initial provider-id lookup cannot yet see that identifier.
      state.refundLookupMissOnce = true;
      assert.equal((await refund()).status, 503); assert.equal(state.webhooks.find(row => row.eventType === "refund.processed").status, "FAILED");
      assert.equal((await refund()).status, 200); assert.equal(state.subscriptions[0].status, "CANCELLED");
      assert.equal(state.payments[0].status, "REFUNDED");
    });
    await t.test("out-of-order signed refund blocks later capture and aggregate validates linked payments", async () => {
      reset(); await pay(); await refund(); await notify(captureBody()); assert.equal(state.subscriptions.length, 0); assert.equal(state.payments[0].status, "REFUNDED");
      reset(); await pay(); await notify(captureBody());
      state.subscriptions[0].contactsUsed = 3; assert.equal((await (await membership.GET()).json()).active.remaining, 7);
      state.payments[0].status = "FAILED"; assert.equal((await (await membership.GET()).json()).active, null);
    });
    await t.test("membership never enables native checkout or exposes another role's access", async () => {
      reset(); state.currentProfile.role = "OWNER"; const body = await (await membership.GET()).json();
      assert.equal(body.eligible, false); assert.equal(body.active, null); assert.equal(body.mobileCheckoutAvailable, false);
      state.currentProfile.verificationStatus = "SUSPENDED"; assert.equal((await membership.GET()).status, 403);
      state.profile = null; assert.equal((await membership.GET()).status, 401);
    });
    await t.test("webhook rejects oversized, malformed and unsigned bodies without registering events", async () => {
      reset();
      const oversized = new Request("https://fixture.invalid/api/payments/webhook", { method: "POST",
        headers: { "x-razorpay-signature": "synthetic-signature" }, body: "x".repeat(262145) });
      assert.equal((await webhook.POST(oversized)).status, 413);
      const malformed = new Request("https://fixture.invalid/api/payments/webhook", { method: "POST",
        headers: { "x-razorpay-signature": "synthetic-signature" }, body: '{"SYNTHETIC_PRIVATE_BODY":' });
      const response = await webhook.POST(malformed); assert.equal(response.status, 400);
      assert.doesNotMatch(JSON.stringify(await response.json()), /SYNTHETIC_PRIVATE/);
      const unsigned = new Request("https://fixture.invalid/api/payments/webhook", { method: "POST", body: "x".repeat(262145) });
      assert.equal((await webhook.POST(unsigned)).status, 400); assert.equal(state.webhooks.length, 0);
    });
    await t.test("membership rejects expired, not-yet-started or cancelled subscriptions", async () => {
      for (const patch of [
        { endsAt: new Date(Date.now() - 1000) },
        { startsAt: new Date(Date.now() + 86400000) },
        { status: "CANCELLED" }
      ]) {
        reset(); await pay(); await notify(captureBody()); Object.assign(state.subscriptions[0], patch);
        assert.equal((await (await membership.GET()).json()).active, null);
      }
    });
  } finally {
    for (const [name, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
