import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const state = { authenticated: true, role: "USER", suspended: false, calls: [], rows: {}, fail: false };
globalThis.__homezoneWorkspaceContract = state;
const mocks = {
  "@/auth": "export const auth = async () => globalThis.__homezoneWorkspaceContract.authenticated ? {user:{id:'user-fixture'}} : null;",
  "@/lib/auth/profile": "export const getOrCreateProfile = async () => ({id:'actor-fixture',role:globalThis.__homezoneWorkspaceContract.role,verificationStatus:globalThis.__homezoneWorkspaceContract.suspended?'SUSPENDED':'VERIFIED'});",
  "@/lib/db": "export const db = globalThis.__homezoneWorkspaceContract.db;",
  "@/lib/leads/access": "export const leadAccessWhere = id => ({OR:[{assignedTo:id},{property:{ownerId:id}}]});",
  "@/lib/logging/logger": "export const captureException = () => {};"
};
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some(part => matches(row, part));
    if (value && typeof value === "object") {
      if ("lt" in value) return row?.[key] < value.lt;
      return matches(row?.[key], value);
    }
    return row?.[key] === value;
  });
}
function project(row, select) {
  if (!row) return null;
  if (!select) return structuredClone(row);
  return Object.fromEntries(Object.entries(select).filter(([, value]) => value !== false).map(([key, value]) => [key,
    value === true ? row[key] : project(row[key], value.select)]));
}
state.db = new Proxy({}, {
  get(_target, model) {
    return {
      findMany: async args => {
        state.calls.push({ model, args });
        if (state.fail) throw new Error("SYNTHETIC_STORAGE_DETAILS_DO_NOT_EXPOSE");
        return (state.rows[model] ?? []).filter(row => matches(row, args.where)).slice(args.skip ?? 0, (args.skip ?? 0) + args.take).map(row => project(row, args.select));
      },
      findFirst: async args => {
        state.calls.push({ model, args });
        return project((state.rows[model] ?? []).find(row => matches(row, args.where)), args.select);
      }
    };
  }
});
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
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
const workspace = await import("../src/app/api/mobile/workspace/route.ts");
hooks.deregister();
function reset(role = "USER") {
  Object.assign(state, { authenticated: true, role, suspended: false, calls: [], rows: {}, fail: false });
}
const get = module => workspace.GET(new Request(`https://fixture.invalid/api/mobile/workspace?module=${module}&mode=cursor`));

test("Builder project projection contains supported publication/media fields and scopes the actor", async () => {
  reset("BUILDER");
  state.rows.builderProject = [
    { id: "project-own-0001", builderId: "actor-fixture", name: "Owned project", status: "PUBLISHED", locality: "Central", address: "Staging fixture", amenities: ["Lift"], mediaUrls: ["https://images.example.invalid/photo.jpg"], floorPlanUrls: ["https://images.example.invalid/plan.jpg"], masterPlanUrl: "https://images.example.invalid/master.jpg", brochureUrl: "https://images.example.invalid/brochure.pdf", privateInternalField: "do not expose" },
    { id: "project-other-0002", builderId: "foreign-fixture", name: "Other project" }
  ];
  const response = await get("projects");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 1);
  const item = body.items[0];
  for (const key of ["status", "locality", "address", "amenities", "mediaUrls", "floorPlanUrls", "masterPlanUrl", "brochureUrl"]) {
    assert.deepEqual(item[key], state.rows.builderProject[0][key]);
    assert.equal(state.calls[0].args.select[key], true);
  }
  assert.equal(item.builderId, undefined);
  assert.equal(item.privateInternalField, undefined);
  assert.equal(state.calls[0].args.where.builderId, "actor-fixture");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("non-Builder project reads are rejected before inventory queries", async () => {
  for (const role of ["USER", "OWNER", "BROKER", "SERVICE_PROVIDER"]) {
    reset(role);
    assert.equal((await get("projects")).status, 403);
    assert.deepEqual(state.calls, []);
  }
});

test("project pagination still uses bounded lookahead and returns a cursor", async () => {
  reset("BUILDER");
  state.rows.builderProject = Array.from({ length: 21 }, (_, index) => ({ id: `project-fixture-${String(100 - index)}`, builderId: "actor-fixture", status: "DRAFT" }));
  const body = await (await get("projects")).json();
  assert.equal(body.items.length, 20);
  assert.equal(body.hasMore, true);
  assert.equal(typeof body.nextCursor, "string");
  assert.equal(state.calls[0].args.take, 21);
});

test("provider profile is restricted to the SERVICE_PROVIDER role", async () => {
  for (const role of ["USER", "OWNER", "BROKER", "BUILDER", "ADMIN", "SUPER_ADMIN"]) {
    reset(role);
    assert.equal((await get("providerProfile")).status, 403);
    assert.deepEqual(state.calls, []);
  }
});

test("own Provider profile reports setup state and supported fields without foreign identities", async () => {
  reset("SERVICE_PROVIDER");
  state.rows.serviceProvider = [
    { id: "provider-own-0001", profileId: "actor-fixture", businessName: "Own service", verified: false, suspended: true, experienceYears: 3, certifications: ["Fixture certificate"], serviceAreas: ["Pune"], photoUrls: ["https://images.example.invalid/company.jpg"], portfolioUrls: ["https://images.example.invalid/portfolio.jpg"] },
    { id: "provider-other-0002", profileId: "foreign-fixture", businessName: "Other service" }
  ];
  const body = await (await get("providerProfile")).json();
  assert.equal(body.items.length, 1);
  const item = body.items[0];
  assert.equal(item.id, "provider-own-0001");
  assert.equal(item.verified, false);
  assert.equal(item.suspended, true);
  for (const key of ["experienceYears", "certifications", "serviceAreas", "photoUrls", "portfolioUrls"]) {
    assert.deepEqual(item[key], state.rows.serviceProvider[0][key]);
  }
  assert.equal(item.profileId, undefined);
  assert.deepEqual(state.calls[0].args.where, { profileId: "actor-fixture" });
});

function booking(id, overrides = {}) {
  return { id, customerId: "actor-fixture", amount: "125.50", currency: "USD", status: "COMPLETED", review: null,
    provider: { profileId: "provider-account", verified: true, suspended: false }, request: { category: "Cleaning", city: "Pune" }, ...overrides };
}
test("customer booking projection includes currency and gates reviews by customer/completion/existing review", async () => {
  reset("USER");
  state.rows.serviceBooking = [
    booking("booking-reviewable-0001"),
    booking("booking-reviewed-0002", { review: { id: "review-fixture", rating: 4, comment: "Completed" } }),
    booking("booking-active-0003", { status: "IN_PROGRESS" }),
    booking("booking-foreign-0004", { customerId: "foreign-account" })
  ];
  const body = await (await get("serviceBookings")).json();
  assert.equal(body.items.length, 3);
  assert.deepEqual(body.items.map(item => item.canReview), [true, false, false]);
  for (const item of body.items) {
    assert.equal(item.currency, "USD");
    assert.equal(item.amount, "125.50");
    assert.equal(item.canManage, false);
    assert.equal(item.customerId, undefined);
    assert.equal(item.provider, undefined);
  }
});

test("provider booking management requires current role and verified nonsuspended business", async () => {
  for (const [role, verified, suspended, expected] of [
    ["SERVICE_PROVIDER", true, false, true], ["SERVICE_PROVIDER", false, false, false],
    ["SERVICE_PROVIDER", true, true, false], ["USER", true, false, false]
  ]) {
    reset(role);
    state.rows.serviceBooking = [booking("booking-provider-0001", { customerId: "another-customer", provider: { profileId: "actor-fixture", verified, suspended } })];
    const item = (await (await get("serviceBookings")).json()).items[0];
    assert.equal(item.canManage, expected);
    assert.equal(item.canReview, false);
  }
});

test("anonymous and suspended profiles perform no queries; storage errors stay generic", async () => {
  reset(); state.authenticated = false;
  assert.equal((await get("serviceBookings")).status, 401);
  assert.deepEqual(state.calls, []);
  reset(); state.suspended = true;
  assert.equal((await get("serviceBookings")).status, 403);
  assert.deepEqual(state.calls, []);
  reset(); state.fail = true;
  const response = await get("serviceBookings");
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes("SYNTHETIC_STORAGE_DETAILS"), false);
});
