import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute actual routes, booking reservation, response contracts and provider
// policy. All identities, DB rows, locks and payment-provider calls are synthetic.
const state = { calls: [], payments: [], orders: [], profile: null };
globalThis.__roleProviderPayment = state;
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return value.every(part => matches(row, part));
    if (key === "OR") return value.some(part => matches(row, part));
    if (value && typeof value === "object") {
      if ("not" in value) return row?.[key] !== value.not;
      if ("in" in value) return value.in.includes(row?.[key]);
      if ("some" in value) return row?.[key]?.some(part => matches(part, value.some));
      return matches(row?.[key], value);
    }
    return row?.[key] === value;
  });
}
function project(row, select) {
  if (row == null) return null;
  if (!select) return structuredClone(row);
  return Object.fromEntries(Object.entries(select).filter(([, value]) => value).map(([key, value]) => {
    if (value === true) return [key, structuredClone(row[key])];
    return [key, Array.isArray(row[key]) ? row[key].filter(item => matches(item, value.where)).map(item => project(item, value.select)) : project(row[key], value.select)];
  }));
}
let transactionQueue = Promise.resolve();
state.db = {
  $queryRaw: async strings => { state.calls.push(strings.join("").includes('"Profile"') ? "profile-share-lock" : "booking-lock"); return []; },
  $transaction: callback => {
    const task = transactionQueue.then(() => callback(state.db));
    transactionQueue = task.catch(() => {});
    return task;
  },
  serviceProvider: { findFirst: async args => {
    state.calls.push({ providerQuery: args });
    return matches(state.provider, args.where) ? project(state.provider, args.select) : null;
  } },
  serviceRequest: { findMany: async args => {
    state.calls.push({ requestQuery: args });
    return state.requests.filter(row => matches(row, args.where)).slice(0, args.take).map(row => project(row, args.select));
  } },
  serviceBooking: { findUnique: async args => state.booking?.id === args.where.id ? project(state.booking, args.select) : null },
  profile: { findUnique: async () => state.currentProfile },
  payment: {
    findMany: async args => state.payments.filter(row => matches(row, args.where)).map(row => project(row, args.select)),
    create: async ({ data }) => {
      const row = { id: `payment-${state.payments.length + 1}`, razorpayOrderId: null, ...data };
      state.payments.push(row); return structuredClone(row);
    },
    update: async ({ where, data }) => {
      const row = state.payments.find(payment => payment.id === where.id); Object.assign(row, data); return structuredClone(row);
    }
  }
};
const mocks = {
  "@/auth": "export const auth = async () => globalThis.__roleProviderPayment.profile ? {user:{id:'synthetic-user'}} : null;",
  "@/lib/auth/profile": "export const getOrCreateProfile = async () => globalThis.__roleProviderPayment.profile;",
  "@/lib/db": "export const db = globalThis.__roleProviderPayment.db;",
  "@/lib/audit": "export const auditLog = async () => {};",
  "@/lib/logging/logger": "export const captureException = () => {};",
  "@/lib/api/rate-limit": "export const checkRateLimit = () => ({allowed:true}); export const rateLimitKey = () => 'synthetic';",
  "@/lib/payments/razorpay": `export const getRazorpayKeyId = () => {
      if(globalThis.__roleProviderPayment.keysMissing)throw new Error('SYNTHETIC_PRIVATE_CONFIGURATION');
      return 'synthetic-public-key';
    };
    export const createRazorpayOrder = async args => {
      const s=globalThis.__roleProviderPayment;s.orders.push(args);
      if(s.orderFailure)throw new Error('SYNTHETIC_PRIVATE_PROVIDER_BODY');
      return {id:'synthetic-order-'+s.orders.length,amount:args.amount,currency:args.currency,receipt:args.receipt};
    };`
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
const requests = await import("../backend/api/service-requests/route.ts");
const marketplace = await import("../src/lib/services/marketplace.ts");
const checkout = await import("../backend/api/payments/checkout/route.ts");
const amounts = await import("../src/lib/payments/service-checkout.ts");
hooks.deregister();

function reset() {
  state.profile = { id: "actor-0001", role: "SERVICE_PROVIDER", verificationStatus: "PENDING" };
  state.currentProfile = { ...state.profile };
  state.provider = { id: "provider-0001", profileId: state.profile.id, category: "Plumbing", city: "Kochi", verified: true,
    suspended: false, profile: { role: state.profile.role, verificationStatus: state.profile.verificationStatus }, bookings: [], quotes: [], reviews: [], rating: 0, reviewCount: 0 };
  const quote = providerId => ({ id: `quote-${providerId}`, providerId, amount: 100, message: "Synthetic quote", provider: { id: providerId, businessName: "Synthetic", profileId: "PRIVATE_PROFILE" } });
  const row = (id, overrides = {}) => ({ id, requesterId: "customer-other", providerId: null, category: "Plumbing", city: "Kochi", status: "requested",
    budget: "Synthetic", message: "Synthetic", createdAt: new Date(), booking: { id: "competitor-booking", amount: 99999 }, quotes: [quote("provider-other"), quote(state.provider.id)], ...overrides });
  state.requests = [row("open"), row("directed-other", { providerId: "provider-other", quotes: [quote("provider-other")] }),
    row("closed", { status: "cancelled", quotes: [] }), row("different-city", { city: "Delhi", quotes: [] }),
    row("directed-own", { providerId: state.provider.id }), row("own-request", { requesterId: state.profile.id, category: "Legal", quotes: [quote("provider-other")] })];
  state.booking = { id: "booking-0001", customerId: state.profile.id, status: "UPCOMING", amount: "100", depositAmount: "100", currency: "INR" };
  state.calls = []; state.payments = []; state.orders = []; state.orderFailure = false; state.keysMissing = false;
}
const pay = (product = "SERVICE_BOOKING_DEPOSIT", extra = {}) => checkout.POST(new Request("https://fixture.invalid/api/payments/checkout", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product, serviceBookingId: "booking-0001", ...extra })
}));
const paid = (amount, extra = {}) => ({ id: "paid-0001", serviceBookingId: state.booking.id, amount, currency: "INR", status: "PAID", product: "SERVICE_BOOKING_DEPOSIT", ...extra });

test("legacy service requests enforce provider eligibility and least-privilege projections", async t => {
  await t.test("directed competitors, closed unquoted requests and other cities are excluded", async () => {
    reset(); const response = await requests.GET(); assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const data = await response.json(); assert.deepEqual(data.requests.map(row => row.id).sort(), ["directed-own", "open", "own-request"]);
    for (const row of data.requests.filter(row => row.id !== "own-request")) {
      assert.deepEqual(row.quotes.map(quote => quote.provider.id), [state.provider.id]);
      assert.equal(row.quotes[0].provider.profileId, undefined); assert.equal(row.requesterId, undefined);
      assert.equal(row.booking, undefined);
    }
    assert.equal(data.requests.find(row => row.id === "own-request").quotes[0].provider.id, "provider-other");
  });
  await t.test("unverified, suspended or non-provider actors see only their own requests", async () => {
    for (const patch of [{ verified: false }, { suspended: true }, { role: "USER" }]) {
      reset(); Object.assign(state.provider, patch); if (patch.role) state.profile.role = patch.role;
      const data = await (await requests.GET()).json(); assert.deepEqual(data.requests.map(row => row.id), ["own-request"]);
    }
    reset(); state.profile.verificationStatus = "SUSPENDED"; assert.equal((await requests.GET()).status, 403);
  });
  await t.test("missing provider city does not make open requests globally visible", async () => {
    reset(); state.provider.city = null; state.requests.find(row => row.id === "open").quotes = [];
    assert.deepEqual((await (await requests.GET()).json()).requests.map(row => row.id).sort(), ["directed-own", "own-request"]);
  });
  await t.test("provider dashboard shares recipient and own-quote scoping", async () => {
    reset(); const data = await marketplace.getProviderDashboardData(state.profile.id);
    assert.deepEqual(data.quoteRequests.map(row => row.id).sort(), ["directed-own", "open"]);
    assert.equal(data.quoteRequests[0].quotes.some(quote => quote.provider.id === "provider-other"), false);
    for (const patch of [{ verified: false }, { suspended: true }, { profile: { role: "USER", verificationStatus: "PENDING" } }, { profile: { role: "SERVICE_PROVIDER", verificationStatus: "SUSPENDED" } }]) {
      reset(); Object.assign(state.provider, patch); assert.equal(await marketplace.getProviderDashboardData(state.profile.id), null);
    }
  });
});

test("service payments use stored booking value, balance, lifecycle and serialized reservations", async t => {
  await t.test("exact minor-unit conversion rejects null, negative, excess precision and overflow", () => {
    assert.equal(amounts.serviceAmountInPaise("0.05"), 5); assert.equal(amounts.serviceAmountInPaise("100"), 10000);
    for (const value of [null, "-1", "1.001", "NaN", "9999999999"]) assert.equal(amounts.serviceAmountInPaise(value), null);
  });
  await t.test("a 100 rupee booking charges 100, not the catalogue's fixed 999 rupees", async () => {
    reset(); const response = await pay(); assert.equal(response.status, 200);
    assert.equal((await response.json()).amount, 10000); assert.equal(state.orders[0].amount, 10000);
    assert.equal(state.payments[0].invoiceMetadata.amount, 10000); assert.equal(state.calls.includes("booking-lock"), true);
  });
  await t.test("final payment deducts actual paid deposit and is unavailable before deposit", async () => {
    reset(); state.booking = { ...state.booking, amount: "1500.50", depositAmount: "999", status: "IN_PROGRESS" };
    assert.equal((await pay("SERVICE_FINAL_PAYMENT")).status, 409); assert.equal(state.orders.length, 0);
    state.payments = [paid(99900)]; const response = await pay("SERVICE_FINAL_PAYMENT");
    assert.equal(response.status, 200); assert.equal((await response.json()).amount, 50150);
  });
  await t.test("foreign customer/provider cannot pay and product references cannot be mixed", async () => {
    reset(); state.booking.customerId = "other-customer"; assert.equal((await pay()).status, 403);
    reset(); assert.equal((await pay("FEATURED_LISTING")).status, 403);
    state.profile.role = "OWNER"; assert.equal((await pay("FEATURED_LISTING")).status, 400);
    assert.equal((await pay("SERVICE_BOOKING_DEPOSIT", { serviceBookingId: undefined })).status, 400);
    assert.equal((await pay("SERVICE_BOOKING_DEPOSIT", { propertyId: "property-0001" })).status, 400);
    assert.equal(state.payments.length, 0);
  });
  await t.test("fresh account role and suspension are checked before booking admission", async () => {
    for (const patch of [{ role: "USER" }, { verificationStatus: "SUSPENDED" }]) {
      reset(); Object.assign(state.currentProfile, patch);
      assert.equal((await pay()).status, 403); assert.equal(state.payments.length, 0); assert.equal(state.orders.length, 0);
      assert.equal(state.calls.includes("profile-share-lock"), true); assert.equal(state.calls.includes("booking-lock"), false);
    }
    reset(); state.currentProfile = null; assert.equal((await pay()).status, 403); assert.equal(state.payments.length, 0);
  });
  await t.test("current Admin override works and demoted Admin cannot pay a foreign booking", async () => {
    reset(); state.profile.role = "ADMIN"; state.currentProfile.role = "ADMIN"; state.booking.customerId = "other-customer";
    assert.equal((await pay()).status, 200);
    assert.ok(state.calls.indexOf("profile-share-lock") < state.calls.indexOf("booking-lock"));
    reset(); state.profile.role = "ADMIN"; state.currentProfile.role = "USER"; state.booking.customerId = "other-customer";
    assert.equal((await pay()).status, 403); assert.equal(state.payments.length, 0); assert.equal(state.orders.length, 0);
  });
  await t.test("non-service products retain their catalogue pricing", async () => {
    reset(); state.profile.role = "BUILDER";
    const response = await pay("BUILDER_MONTHLY", { serviceBookingId: undefined });
    assert.equal(response.status, 200); assert.equal((await response.json()).amount, 999900);
  });
  await t.test("cancelled, already paid, wrong-stage and inconsistent bookings cannot be charged", async () => {
    for (const patch of [{ status: "CANCELLED" }, { currency: "USD" }, { amount: "99.999" }, { depositAmount: "101" }, { status: "IN_PROGRESS" }]) {
      reset(); Object.assign(state.booking, patch); assert.equal((await pay()).status, 409); assert.equal(state.orders.length, 0);
    }
    reset(); state.payments = [paid(10000)]; assert.equal((await pay()).status, 409);
    reset(); state.profile.verificationStatus = "SUSPENDED"; assert.equal((await pay()).status, 403);
  });
  await t.test("retrying an existing order reuses it and concurrent checkout creates only one charge", async () => {
    reset(); assert.equal((await pay()).status, 200); assert.equal((await pay()).status, 200); assert.equal(state.orders.length, 1);
    reset(); const results = await Promise.all([pay(), pay()]); assert.equal(results.some(response => response.status === 200), true);
    assert.equal(results.every(response => [200, 409].includes(response.status)), true); assert.equal(state.orders.length, 1); assert.equal(state.payments.length, 1);
  });
  await t.test("uncertain provider failures retain reservations and do not create another order", async () => {
    reset(); state.orderFailure = true; const response = await pay(); assert.equal(response.status, 500);
    assert.equal(JSON.stringify(await response.json()).includes("SYNTHETIC_PRIVATE"), false);
    state.orderFailure = false; assert.equal((await pay()).status, 409); assert.equal(state.orders.length, 1);
    assert.equal(state.payments[0].status, "CREATED");
  });
  await t.test("missing provider configuration creates no reservation and can recover after configuration is corrected", async () => {
    reset(); state.keysMissing = true;
    const response = await pay(); assert.equal(response.status, 500);
    assert.equal(JSON.stringify(await response.json()).includes("SYNTHETIC_PRIVATE"), false);
    assert.equal(state.payments.length, 0); assert.equal(state.orders.length, 0);
    state.keysMissing = false; assert.equal((await pay()).status, 200);
    assert.equal(state.payments.length, 1); assert.equal(state.orders.length, 1);
  });
  await t.test("refunded, failed and inconsistent paid records require reconciliation", async () => {
    for (const patch of [{ status: "REFUNDED" }, { status: "FAILED" }, { status: "CANCELLED", razorpayOrderId: "uncertain-order" }, { currency: "USD" }, { amount: -1 }, { amount: 15000 }]) {
      reset(); state.payments = [paid(5000, patch)]; assert.equal((await pay()).status, 409); assert.equal(state.orders.length, 0);
    }
  });
});
