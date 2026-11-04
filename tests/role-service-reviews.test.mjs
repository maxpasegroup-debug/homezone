import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Real review handler, validation and booking access helper. Transaction locks
// and storage are in-process fixtures; no network or database is contacted.
const state = {};
globalThis.__serviceReviewFixture = state;
const bookingId = "booking-0001", providerId = "provider-0001", actorId = "customer-0001";
const booking = (id = bookingId, customerId = actorId) => ({
  id, customerId, providerId, status: "COMPLETED", provider: { profileId: "provider-profile" },
  customer: null, payments: [], quote: null, request: {}, review: null
});
function reset(overrides = {}) {
  Object.assign(state, {
    authenticated: true, actors: [], actorId, currentStatus: "PENDING", beforeTransaction: undefined,
    bookings: [booking()], reviews: [], provider: { rating: 0, reviewCount: 0 },
    transactions: 0, committed: [], order: [], failure: undefined, errorOnCreate: undefined,
    locks: new Map(), ...overrides
  });
}
const findBooking = ({ where }) => structuredClone(state.bookings.find(value => value.id === where.id) ?? null);
const findReview = (reviews, { where }) => reviews.find(value => value.bookingId === where.bookingId) ?? null;
const profile = { findUnique: async () => ({ verificationStatus: state.currentStatus }) };
state.db = {
  profile,
  serviceBooking: { findUnique: async args => findBooking(args) },
  $transaction: async callback => {
    state.transactions++;
    state.beforeTransaction?.();
    const reviews = [], writes = [], release = [];
    let provider;
    const tx = {
      profile,
      $queryRaw: async (parts, id) => {
        const table = parts.join("").match(/FROM "([^"]+)"/)[1];
        const key = `${table}:${id}`;
        const previous = state.locks.get(key) ?? Promise.resolve();
        let unlock;
        const held = new Promise(resolve => { unlock = resolve; });
        state.locks.set(key, held);
        await previous;
        release.push(unlock);
        state.order.push(table);
        return [];
      },
      serviceBooking: { findUnique: async args => findBooking(args) },
      serviceReview: {
        findUnique: async args => findReview([...state.reviews, ...reviews], args),
        create: async ({ data }) => {
          if (state.errorOnCreate) throw state.errorOnCreate;
          if ([...state.reviews, ...reviews].some(value => value.bookingId === data.bookingId)) {
            throw { code: "P2002", meta: { target: ["bookingId"] } };
          }
          const value = { id: `review-${data.bookingId}`, status: "PUBLISHED", ...data };
          reviews.push(value); writes.push("review"); return value;
        },
        aggregate: async ({ where }) => {
          if (state.failure === "aggregate") throw new Error("FIXTURE_PRIVATE_AGGREGATE_FAILURE");
          assert.deepEqual(where, { providerId, status: "PUBLISHED" });
          const rows = [...state.reviews, ...reviews].filter(value => value.providerId === where.providerId && value.status === where.status);
          return { _avg: { rating: rows.length ? rows.reduce((sum, value) => sum + value.rating, 0) / rows.length : null }, _count: { _all: rows.length } };
        }
      },
      serviceProvider: { update: async ({ where, data }) => {
        assert.equal(where.id, providerId);
        if (state.failure === "provider") throw new Error("FIXTURE_PRIVATE_PROVIDER_FAILURE");
        provider = data; writes.push("rating"); return data;
      } }
    };
    try {
      const result = await callback(tx);
      state.reviews.push(...reviews);
      if (provider) state.provider = provider;
      state.committed.push(...writes);
      return result;
    } finally { release.reverse().forEach(unlock => unlock()); }
  }
};
const mocks = {
  "@/auth": "export const auth=async()=>{const s=globalThis.__serviceReviewFixture;return s.authenticated?{user:{id:s.actors.shift()??s.actorId}}:null;};",
  "@/lib/auth/profile": "export const getOrCreateProfile=async user=>({id:user.id,role:'USER',verificationStatus:'PENDING'});",
  "@/lib/db": "export const db=globalThis.__serviceReviewFixture.db;",
  "@/lib/logging/logger": "export const captureException=()=>{};"
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier === "next/server") return next("next/server.js", context);
    if (specifier.startsWith("@/")) return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      }).outputText
    };
    return next(url, context);
  }
});
const route = await import("../backend/api/service-bookings/[id]/reviews/route.ts");
hooks.deregister();
const call = (rating = 5, id = bookingId) => route.POST(new Request("https://fixture.invalid/api/service-bookings/review", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ rating, comment: "Synthetic review fixture" })
}), { params: Promise.resolve({ id }) });

test("customer reviews and published provider rating are one authorized transaction", async t => {
  await t.test("completed customer booking creates one review and updates the published aggregate", async () => {
    reset({ reviews: [
      { id: "existing", bookingId: "old-booking", providerId, rating: 3, status: "PUBLISHED" },
      { id: "hidden", bookingId: "hidden-booking", providerId, rating: 1, status: "HIDDEN" }
    ] });
    const response = await call();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.review.reviewerId, actorId);
    assert.equal(result.review.providerId, providerId);
    assert.deepEqual(state.provider, { rating: 4, reviewCount: 2 });
    assert.deepEqual(state.committed, ["review", "rating"]);
    assert.deepEqual(state.order, ["Profile", "ServiceProvider", "ServiceBooking"]);
  });
  await t.test("anonymous, foreign customer and unfinished booking cannot write", async () => {
    reset({ authenticated: false }); assert.equal((await call()).status, 401);
    assert.equal(state.transactions, 0);
    reset({ actorId: "other-customer" }); assert.equal((await call()).status, 403);
    assert.equal(state.transactions, 0);
    reset({ bookings: [{ ...booking(), status: "UPCOMING" }] }); assert.equal((await call()).status, 403);
    assert.deepEqual(state.committed, []);
  });
  await t.test("out-of-range rating is rejected without a transaction", async () => {
    for (const rating of [0, 6, 1.5, "invalid"]) {
      reset(); assert.equal((await call(rating)).status, 400);
      assert.equal(state.transactions, 0);
    }
  });
  await t.test("fresh suspension, customer, completion and provider changes are rechecked", async () => {
    for (const [change, expected] of [
      [() => { state.currentStatus = "SUSPENDED"; }, 403],
      [() => { state.bookings[0].customerId = "other-customer"; }, 403],
      [() => { state.bookings[0].status = "CANCELLED"; }, 403],
      [() => { state.bookings[0].providerId = "other-provider"; }, 409],
      [() => { state.bookings = []; }, 404]
    ]) {
      reset({ beforeTransaction: change });
      assert.equal((await call()).status, expected);
      assert.deepEqual(state.committed, []);
    }
  });
  await t.test("already reviewed booking returns a safe conflict without overwriting", async () => {
    reset(); assert.equal((await call(4)).status, 200);
    const response = await call(1);
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /already been reviewed/);
    assert.equal(state.reviews.length, 1);
    assert.equal(state.reviews[0].rating, 4);
    assert.deepEqual(state.committed, ["review", "rating"]);
  });
  await t.test("booking uniqueness races become safe conflicts, unrelated failures stay generic", async () => {
    for (const target of [["bookingId"], "ServiceReview_bookingId_key"]) {
      reset({ errorOnCreate: { code: "P2002", meta: { target } } });
      assert.equal((await call()).status, 409);
      assert.deepEqual(state.committed, []);
    }
    reset({ errorOnCreate: { code: "P2002", meta: { target: ["otherField"] } } });
    assert.equal((await call()).status, 500);
  });
  await t.test("aggregate or provider update failure rolls back the review", async () => {
    for (const failure of ["aggregate", "provider"]) {
      reset({ failure });
      const response = await call();
      assert.equal(response.status, 500);
      assert.doesNotMatch(JSON.stringify(await response.json()), /FIXTURE_PRIVATE/);
      assert.deepEqual(state.reviews, []);
      assert.deepEqual(state.provider, { rating: 0, reviewCount: 0 });
      assert.deepEqual(state.committed, []);
    }
  });
  await t.test("concurrent submissions for one booking create exactly one review", async () => {
    reset();
    const results = await Promise.all([call(5), call(1)]);
    assert.deepEqual(results.map(value => value.status).sort(), [200, 409]);
    assert.equal(state.reviews.length, 1);
    assert.deepEqual(state.committed, ["review", "rating"]);
  });
  await t.test("different customers' concurrent reviews preserve the full provider aggregate", async () => {
    reset({ actors: [actorId, "customer-0002"], bookings: [booking(), booking("booking-0002", "customer-0002")] });
    const results = await Promise.all([call(5), call(1, "booking-0002")]);
    assert.deepEqual(results.map(value => value.status), [200, 200]);
    assert.equal(state.reviews.length, 2);
    assert.deepEqual(state.provider, { rating: 3, reviewCount: 2 });
  });
});
