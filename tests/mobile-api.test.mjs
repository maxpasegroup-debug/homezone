import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const state = { user: "buyer", calls: [], fail: false, allowed: true };
globalThis.__mobileAudit = state;
const property = { id: "property-0001", title: "Synthetic listing", status: "PUBLISHED" };
state.db = Object.fromEntries(["property", "savedProperty", "propertyShortlist", "lead", "profile"].map((model) => [model,
  Object.fromEntries(["findMany", "findFirst", "update"].map((method) => [method, async (args) => {
    state.calls.push({ model, method, args });
    if (state.fail) throw new Error("SYNTHETIC_SENSITIVE_DATABASE_ERROR");
    if (method === "update") return { city: args.data.city, phone: args.data.phone };
    if (method === "findFirst") return args.where.id === property.id ? property : null;
    if (model === "property") return Array.from({ length: args.take }, (_, i) => ({ ...property, id: `property-${i}` }));
    return [];
  }]))]));
const mocks = {
  "@/auth": "export const auth = async () => globalThis.__mobileAudit.user ? { user: {id: globalThis.__mobileAudit.user} } : null;",
  "@/lib/db": "export const db = globalThis.__mobileAudit.db;",
  "@/lib/auth/profile": "export const getOrCreateProfile = async () => ({id: 'profile-' + globalThis.__mobileAudit.user, phone: '+910000000000', whatsappVerified:true});",
  "@/lib/logging/logger": "export const captureException = (error) => { globalThis.__mobileAudit.error = error.message; };",
  "@/lib/leads/access": "export const buyerEnquirySelect = {id:true, property:{select:{id:true,title:true}}};",
  "@/lib/api/rate-limit": "export const checkRateLimit = () => ({allowed:globalThis.__mobileAudit.allowed, resetAt:new Date()}); export const rateLimitKey = () => 'synthetic';"
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
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      }).outputText };
    return next(url, context);
  }
});
const catalog = await import("../src/app/api/mobile/properties/route.ts");
const detail = await import("../src/app/api/mobile/properties/[id]/route.ts");
const account = await import("../src/app/api/mobile/account/route.ts");
const contracts = await import("../src/lib/properties/mobile-catalog.ts");
hooks.deregister();
const request = (query = "") => new Request(`https://fixture.invalid/api/mobile/properties${query}`);
const patch = (body) => new Request("https://fixture.invalid/api/mobile/account", {
  method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
});
test("mobile routes execute real contracts with mocked external boundaries", async (t) => {
  await t.test("catalog bounds pages and rejects unsupported or ambiguous budgets", async () => {
    for (const query of ["?page=0", "?pageSize=25", "?page=1001", "?furnishing=furnished", "?maxPrice=10", "?purpose=BUY&maxPrice=10", "?bedrooms=invalid", "?page=1&page=2", "?purpose=BUY&currency=INR&minPrice=20&maxPrice=10"]) {
      state.calls = [];
      assert.equal((await catalog.GET(request(query))).status, 400);
      assert.equal(state.calls.length, 0);
    }
  });
  await t.test("published projection excludes private fields and pages with one lookahead", async () => {
    state.calls = [];
    const response = await catalog.GET(request("?page=2&pageSize=2&purpose=BUY&currency=INR&maxPrice=100&city=Kochi&sort=price_asc"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, "database"); assert.equal(body.hasMore, true); assert.equal(body.properties.length, 2);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const { args } = state.calls[0];
    assert.equal(args.where.status, "PUBLISHED"); assert.equal(args.where.intent, "BUY"); assert.equal(args.where.currency, "INR");
    assert.equal(args.where.price.lte, 100); assert.equal(args.skip, 2); assert.equal(args.take, 3);
    assert.deepEqual(args.orderBy[1], { id: "asc" });
    for (const key of ["owner", "ownerId", "verificationNotes", "documents", "leads"]) assert.equal(contracts.mobilePropertySelect[key], undefined);
  });
  await t.test("detail visibility requires published status and missing details return 404", async () => {
    state.calls = [];
    assert.equal((await detail.GET(request(), { params: Promise.resolve({ id: property.id }) })).status, 200);
    assert.deepEqual(state.calls[0].args.where, { id: property.id, status: "PUBLISHED" });
    assert.equal((await detail.GET(request(), { params: Promise.resolve({ id: "missing" }) })).status, 404);
  });
  await t.test("anonymous account reads and edits perform no database operations", async () => {
    state.user = null; state.calls = [];
    assert.equal((await account.GET()).status, 401);
    assert.equal((await account.PATCH(patch({ city: "Kochi", phone: "+910000000001" }))).status, 401);
    assert.equal(state.calls.length, 0); state.user = "buyer";
  });
  await t.test("all account collections are scoped to the authenticated profile", async () => {
    state.calls = [];
    const response = await account.GET(); assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    for (const call of state.calls) assert.equal(call.args.where.userId, "profile-buyer");
    assert.ok(state.calls.every((call) => call.args.take <= 200));
    const shortlists = state.calls.find((call) => call.model === "propertyShortlist");
    assert.equal(shortlists.args.select.items.take, 50);
  });
  await t.test("role and foreign-account fields are rejected without writes", async () => {
    for (const extra of [{ role: "ADMIN" }, { userId: "other" }, { id: "other-profile" }]) {
      state.calls = [];
      assert.equal((await account.PATCH(patch({ city: "Kochi", phone: "+910000000001", ...extra }))).status, 400);
      assert.equal(state.calls.length, 0);
    }
  });
  await t.test("profile edit preserves role and clears changed phone verification", async () => {
    state.calls = [];
    assert.equal((await account.PATCH(patch({ city: "Kochi", phone: "+910000000001" }))).status, 200);
    const { args } = state.calls[0];
    assert.equal(args.where.id, "profile-buyer"); assert.equal(args.data.whatsappVerified, false);
    assert.equal(args.data.role, undefined);
  });
  await t.test("rate-limited edits do not write", async () => {
    state.allowed = false; state.calls = [];
    assert.equal((await account.PATCH(patch({ city: "Kochi", phone: "+910000000001" }))).status, 429);
    assert.equal(state.calls.length, 0); state.allowed = true;
  });
  await t.test("database failures are errors, never fictional fallback or raw diagnostics", async () => {
    state.fail = true;
    const response = await catalog.GET(request()); assert.equal(response.status, 500);
    assert.doesNotMatch(JSON.stringify(await response.json()), /SYNTHETIC_SENSITIVE/);
    assert.equal(state.error, "Mobile catalog unavailable"); state.fail = false;
  });
});
