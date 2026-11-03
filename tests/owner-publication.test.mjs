import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Real route, validation and policy execution. External authentication, storage,
// AI and logging boundaries are fixtures; no database or network is contacted.
const state = {};
globalThis.__ownerPublicationFixture = state;
const snapshot = () => ({
  id: "property-0001", ownerId: "owner-0001", status: "DRAFT",
  verificationStatus: "PENDING", verified: false, publishedAt: null
});
function reset(overrides = {}) {
  Object.assign(state, {
    authenticated: true, role: "OWNER", profileStatus: "PENDING", currentRole: "OWNER",
    currentProfileStatus: "PENDING", property: snapshot(), currentProperty: snapshot(),
    writes: [], locks: [], allowed: true, ...overrides
  });
}
state.db = {
  property: { findUnique: async () => state.property },
  $transaction: async callback => callback({
    $queryRaw: async strings => { state.locks.push(strings.join("?")); return []; },
    profile: {
      findUnique: async () => ({ role: state.currentRole, verificationStatus: state.currentProfileStatus }),
      update: async args => { state.writes.push({ model: "profile", ...args }); return {}; }
    },
    property: {
      findUnique: async () => state.currentProperty,
      create: async args => { state.writes.push({ model: "property", method: "create", ...args }); return { id: "created-0001", ...args.data }; },
      update: async args => { state.writes.push({ model: "property", method: "update", ...args }); return { ...state.currentProperty, ...args.data }; }
    }
  })
};
const mocks = {
  "@/auth": "export const auth=async()=>globalThis.__ownerPublicationFixture.authenticated?{user:{id:'user-0001'}}:null;",
  "@/lib/auth/profile": "export const getOrCreateProfile=async()=>({id:'owner-0001',role:globalThis.__ownerPublicationFixture.role,verificationStatus:globalThis.__ownerPublicationFixture.profileStatus});",
  "@/lib/db": "export const db=globalThis.__ownerPublicationFixture.db;",
  "@/lib/audit": "export const auditLog=async()=>{};",
  "@/lib/ai/homezone-ai": "export const generateOpenAIText=async()=>null;",
  "@/lib/properties/queries": "export const getMarketplaceProperties=async()=>[]; export const parseMarketplaceFilters=x=>x;",
  "@/lib/logging/logger": "export const captureException=()=>{};",
  "@/lib/api/rate-limit": "export const checkRateLimit=()=>({allowed:globalThis.__ownerPublicationFixture.allowed,resetAt:new Date()}); export const rateLimitKey=()=> 'fixture';"
};
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
const create = await import("../backend/api/properties/route.ts");
const edit = await import("../backend/api/properties/[id]/route.ts");
const policy = await import("../src/lib/properties/publication.ts");
hooks.deregister();
const body = {
  title: "Synthetic publication fixture", description: "An isolated test property with no real listing.",
  intent: "BUY", propertyType: "House", city: "Fixture City", status: "PUBLISHED"
};
const request = (method, value) => new Request("https://fixture.invalid/api/properties/property-0001", {
  method, headers: { "content-type": "application/json" }, body: JSON.stringify(value)
});
const patch = value => edit.PATCH(request("PATCH", value), { params: Promise.resolve({ id: "property-0001" }) });

test("Owner direct publication uses existing routes without granting verification", async t => {
  await t.test("new Owner publication sets public status/time and leaves verification pending", async () => {
    reset();
    const response = await create.POST(request("POST", { ...body, verified: true, verificationStatus: "VERIFIED" }));
    assert.equal(response.status, 200);
    const result = (await response.json()).property;
    assert.equal(result.status, "PUBLISHED"); assert.equal(result.verificationStatus, "PENDING");
    assert.equal(result.verified, false); assert.ok(result.publishedAt);
    assert.equal(state.writes.length, 1); assert.equal(state.writes[0].data.ownerId, "owner-0001");
    assert.match(state.locks[0], /Profile.*FOR UPDATE/);
  });
  await t.test("explicit drafts, explicit review and omitted legacy status stay private", async () => {
    for (const status of ["DRAFT", "PENDING_REVIEW", undefined]) {
      reset();
      const data = { ...body }; if (status) data.status = status; else delete data.status;
      assert.equal((await create.POST(request("POST", data))).status, 200);
      const saved = state.writes[0].data;
      assert.equal(saved.status, status ?? "PENDING_REVIEW");
      assert.equal(saved.publishedAt, undefined); assert.equal(saved.verified, false);
    }
  });
  await t.test("USER cannot obtain direct publication through create's legacy Owner conversion", async () => {
    reset({ role: "USER", currentRole: "USER" });
    assert.equal((await create.POST(request("POST", body))).status, 403);
    assert.equal(state.writes.length, 0);
    assert.equal((await create.POST(request("POST", { ...body, status: "DRAFT" }))).status, 200);
    assert.equal(state.writes[1].model, "profile"); assert.equal(state.writes[1].data.role, "OWNER");
  });
  await t.test("other public roles retain existing create and verification gates", async () => {
    for (const role of ["BROKER", "BUILDER", "SERVICE_PROVIDER"]) {
      reset({ role, currentRole: role });
      assert.equal((await create.POST(request("POST", body))).status, 403);
      assert.equal((await patch({ status: "PUBLISHED" })).status, 403);
      assert.equal(state.writes.length, 0);
      state.currentProperty.verificationStatus = "VERIFIED";
      assert.equal((await patch({ status: "PUBLISHED" })).status, 200);
    }
  });
  await t.test("Owner publishes owned unverified draft or review without inventing trust metadata", async () => {
    for (const [status, verificationStatus] of [["DRAFT", "PENDING"], ["PENDING_REVIEW", "UNDER_REVIEW"]]) {
      reset(); state.property = snapshot();
      state.currentProperty = { ...snapshot(), status, verificationStatus };
      const response = await patch({ status: "PUBLISHED" }); assert.equal(response.status, 200);
      const saved = state.writes[0];
      assert.deepEqual(state.locks.map(x => /Profile/.test(x) ? "profile" : "property"), ["profile", "property"]);
      assert.equal(saved.where.ownerId, "owner-0001"); assert.ok(saved.data.publishedAt);
      assert.equal(saved.data.verificationStatus, undefined); assert.equal(saved.data.verified, undefined);
      assert.equal(saved.data.verifiedAt, undefined); assert.equal(saved.data.verifiedBy, undefined);
    }
  });
  await t.test("repeated publication preserves original publication date", async () => {
    reset(); const publishedAt = new Date("2026-01-01T00:00:00Z");
    state.currentProperty = { ...snapshot(), status: "PUBLISHED", publishedAt };
    assert.equal((await patch({ status: "PUBLISHED" })).status, 200);
    assert.equal(state.writes[0].data.publishedAt, publishedAt);
  });
  await t.test("anonymous, suspended and throttled actors cannot write", async () => {
    for (const [overrides, expected] of [[{ authenticated: false }, 401], [{ profileStatus: "SUSPENDED" }, 403], [{ allowed: false }, 429]]) {
      reset(overrides);
      assert.equal((await create.POST(request("POST", body))).status, expected);
      assert.equal((await patch({ status: "PUBLISHED" })).status, expected);
      assert.equal(state.writes.length, 0);
    }
  });
  await t.test("foreign ownership is checked before and again after locking", async () => {
    reset(); state.property.ownerId = "foreign-owner";
    assert.equal((await patch({ status: "PUBLISHED" })).status, 403);
    reset(); state.currentProperty.ownerId = "new-owner-after-read";
    assert.equal((await patch({ status: "PUBLISHED" })).status, 403);
    assert.equal(state.writes.length, 0);
  });
  await t.test("role changes or suspension during transaction abort create and update", async () => {
    for (const overrides of [{ currentRole: "USER" }, { currentProfileStatus: "SUSPENDED" }]) {
      reset(overrides);
      assert.equal((await create.POST(request("POST", body))).status, 403);
      assert.equal((await patch({ status: "PUBLISHED" })).status, 403);
      assert.equal(state.writes.length, 0);
    }
  });
  await t.test("locked moderation outcome rejects publishing and draft/review laundering", async () => {
    for (const changes of [{ status: "REJECTED" }, { status: "ARCHIVED" }, ...["REJECTED", "NEEDS_CHANGES", "EXPIRED"].map(verificationStatus => ({ verificationStatus }))]) {
      for (const status of ["PUBLISHED", "DRAFT", "PENDING_REVIEW"]) {
        reset(); state.currentProperty = { ...snapshot(), ...changes };
        assert.equal((await patch({ status })).status, 403);
        assert.equal(state.writes.length, 0);
      }
    }
  });
  await t.test("admins retain publication authority over moderation-restricted foreign records", async () => {
    for (const role of ["ADMIN", "SUPER_ADMIN"]) {
      reset({ role, currentRole: role });
      state.property.ownerId = "foreign-owner";
      state.currentProperty = { ...snapshot(), ownerId: "foreign-owner", status: "REJECTED", verificationStatus: "REJECTED" };
      assert.equal((await patch({ status: "PUBLISHED" })).status, 200);
      assert.deepEqual(state.writes[0].where, { id: "property-0001" });
      assert.equal((await create.POST(request("POST", body))).status, 200);
    }
  });
  await t.test("ordinary edits and archive leave moderation outcomes intact", async () => {
    reset(); state.currentProperty.verificationStatus = "NEEDS_CHANGES";
    assert.equal((await patch({ title: "Corrected fixture title" })).status, 200);
    assert.equal(state.writes[0].data.verificationStatus, undefined);
    assert.equal((await patch({ status: "ARCHIVED" })).status, 200);
    assert.equal(state.writes[1].data.verificationStatus, undefined);
    assert.deepEqual(policy.updatePublication("OWNER", snapshot(), undefined, new Date()), { data: {} });
  });
});
