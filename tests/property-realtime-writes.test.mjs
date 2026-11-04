import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute the real mutation routes and notification helper with transaction,
// authentication, AI and upload fixtures. No network or database is contacted.
const state = {};
globalThis.__propertyRealtimeFixture = state;
const photos = [1, 2, 3, 4].map(id => `https://images.fixture.invalid/${id}.jpg`);
const originalFlag = process.env.HOMEZONE_REALTIME_ENABLED;
const snapshot = () => ({
  id: "property-0001", ownerId: "owner-0001", status: "DRAFT", verificationStatus: "PENDING",
  verified: false, publishedAt: null, coverImageUrl: photos[0], mediaUrls: [...photos],
  videoUrl: null, virtualTourUrl: null, updatedAt: new Date("2026-01-01T00:00:00Z")
});
function reset(overrides = {}) {
  process.env.HOMEZONE_REALTIME_ENABLED = "true";
  Object.assign(state, {
    authenticated: true, allowed: true, role: "OWNER", currentRole: "OWNER", actorStatus: "PENDING",
    currentActorStatus: "PENDING", property: snapshot(), currentProperty: snapshot(),
    committedWrites: [], committedEvents: [], order: [], failWrite: false, failNotify: false,
    uploadRequests: [], uploadReply: undefined,
    ...overrides
  });
}
function nextProperty(data) {
  const next = { ...state.currentProperty, ...data };
  if (data.mediaUrls?.push) next.mediaUrls = [...state.currentProperty.mediaUrls, data.mediaUrls.push];
  return next;
}
state.db = {
  property: { findUnique: async () => state.property, findFirst: async () => state.property },
  auditLog: { create: async () => {} },
  $transaction: async callback => {
    const writes = [], events = [];
    state.order.push("begin");
    const mutation = async (method, args) => {
      state.order.push(method);
      if (state.failWrite) throw new Error("SYNTHETIC_STORAGE_FAILURE");
      writes.push({ method, ...args });
      return method === "create" ? { ...snapshot(), ...args.data } : nextProperty(args.data ?? {});
    };
    try {
      const result = await callback({
        $queryRaw: async strings => { state.order.push(/Profile/.test(strings.join("")) ? "lock-profile" : "lock-property"); return []; },
        $executeRaw: async (strings, ...values) => {
          state.order.push("notify");
          assert.match(strings.join("?"), /^SELECT pg_notify\(\?, \?\)$/);
          assert.equal(values[0], "homezone_public_properties_v1");
          assert.equal(values[1], '{"v":1,"type":"properties.changed"}');
          if (state.failNotify) throw new Error("SYNTHETIC_NOTIFICATION_FAILURE");
          events.push(values[1]);
          return 1;
        },
        profile: {
          findUnique: async () => ({ role: state.currentRole, verificationStatus: state.currentActorStatus }),
          update: async () => ({})
        },
        property: {
          findUnique: async () => state.currentProperty,
          findFirst: async () => state.currentProperty,
          create: args => mutation("create", args), update: args => mutation("update", args),
          delete: args => mutation("delete", args)
        }
      });
      state.committedWrites.push(...writes); state.committedEvents.push(...events);
      state.order.push("commit");
      return result;
    } catch (error) {
      state.order.push("rollback");
      throw error;
    }
  }
};
const mocks = {
  "@/auth": "export const auth=async()=>globalThis.__propertyRealtimeFixture.authenticated?{user:{id:'fixture-user'}}:null;",
  "@/lib/auth/profile": "export const getOrCreateProfile=async()=>({id:'owner-0001',role:globalThis.__propertyRealtimeFixture.role,verificationStatus:globalThis.__propertyRealtimeFixture.actorStatus});",
  "@/lib/db": "export const db=globalThis.__propertyRealtimeFixture.db;",
  "@/lib/audit": "export const auditLog=async()=>{};",
  "@/lib/ai/homezone-ai": "export const generateOpenAIText=async()=>null;",
  "@/lib/properties/queries": "export const getMarketplaceProperties=async()=>[];export const parseMarketplaceFilters=x=>x;",
  "@/lib/logging/logger": "export const captureException=()=>{};",
  "@/lib/trust/verification": "export const propertyVerificationEvent=status=>'fixture_'+status;",
  "@/lib/api/rate-limit": "export const checkRateLimit=()=>({allowed:globalThis.__propertyRealtimeFixture.allowed,resetAt:new Date()});export const rateLimitKey=()=> 'fixture';",
  "@/../backend/api/media/upload/route": "export const POST=async request=>{const fixture=globalThis.__propertyRealtimeFixture;fixture.uploadRequests.push(request);return fixture.uploadReply?fixture.uploadReply(request):Response.json({url:'https://images.fixture.invalid/uploaded.jpg'});};"
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
const media = await import("../backend/api/properties/[id]/media/route.ts");
const moderate = await import("../backend/api/admin/properties/[id]/moderate/route.ts");
const verify = await import("../backend/api/admin/properties/[id]/verify/route.ts");
const upload = await import("../src/app/api/mobile/upload/route.ts");
hooks.deregister();
const context = () => ({ params: Promise.resolve({ id: "property-0001" }) });
const request = (method, body) => new Request("https://fixture.invalid/api/properties/property-0001", {
  method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})
});
const createBody = {
  title: "Synthetic publication fixture", description: "Synthetic transaction only, no real listing is created.",
  intent: "BUY", propertyType: "House", city: "Fixture City", status: "PUBLISHED",
  coverImageUrl: photos[0], mediaUrls: [...photos]
};
const patch = body => edit.PATCH(request("PATCH", body), context());
const patchMedia = body => media.PATCH(request("PATCH", body), context());
const remove = () => edit.DELETE(request("DELETE"), context());
const adminCall = (route, status) => route.PATCH(request("PATCH", { status, note: "Synthetic fixture" }), context());
const uploadCall = () => upload.POST(request("POST", { propertyId: "property-0001", base64: Buffer.from([255, 216, 255, 0]).toString("base64") }));
function expectOneCommit(method) {
  assert.equal(state.committedWrites.length, 1);
  assert.equal(state.committedEvents.length, 1);
  assert.equal(state.order.filter(value => value === "notify").length, 1);
  assert.ok(state.order.indexOf(method) < state.order.indexOf("notify"));
  assert.ok(state.order.indexOf("notify") < state.order.indexOf("commit"));
  assert.doesNotMatch(state.committedEvents[0], /property-0001|owner-0001|https:|password|pin/i);
}

test("public-property writes emit only transaction-bound, anonymous invalidations", async t => {
  try {
    await t.test("new published Owner listing notifies after create and before transaction commit", async () => {
      reset(); assert.equal((await create.POST(request("POST", createBody))).status, 200);
      expectOneCommit("create");
    });
    await t.test("private creates and disabled or noncanonical activation values never notify", async () => {
      for (const status of ["DRAFT", "PENDING_REVIEW"]) {
        reset(); assert.equal((await create.POST(request("POST", { ...createBody, status }))).status, 200);
        assert.equal(state.committedEvents.length, 0); assert.ok(!state.order.includes("notify"));
      }
      for (const flag of [undefined, "false", "TRUE", "1"]) {
        reset(); if (flag === undefined) delete process.env.HOMEZONE_REALTIME_ENABLED; else process.env.HOMEZONE_REALTIME_ENABLED = flag;
        assert.equal((await create.POST(request("POST", createBody))).status, 200);
        assert.equal(state.committedEvents.length, 0); assert.ok(!state.order.includes("notify"));
      }
    });
    await t.test("publication, published edits and unpublication each notify once", async () => {
      for (const [before, changes] of [["DRAFT", { status: "PUBLISHED" }], ["PUBLISHED", { title: "Corrected synthetic title" }], ["PUBLISHED", { status: "DRAFT" }], ["PUBLISHED", { status: "ARCHIVED" }]]) {
        reset(); state.currentProperty.status = before;
        assert.equal((await patch(changes)).status, 200); expectOneCommit("update");
      }
      reset(); assert.equal((await patch({ title: "Private synthetic draft" })).status, 200);
      assert.equal(state.committedEvents.length, 0);
    });
    await t.test("published media updates notify; private media edits do not", async () => {
      for (const status of ["PUBLISHED", "DRAFT"]) {
        reset(); state.currentProperty.status = status;
        assert.equal((await patchMedia({ action: "reorder", mediaUrls: [...photos].reverse() })).status, 200);
        if (status === "PUBLISHED") expectOneCommit("update"); else assert.equal(state.committedEvents.length, 0);
      }
    });
    await t.test("provider upload attachment notifies only for the locked published row", async () => {
      for (const status of ["PUBLISHED", "DRAFT"]) {
        reset(); state.currentProperty.status = status;
        assert.equal((await uploadCall()).status, 200);
        if (status === "PUBLISHED") expectOneCommit("update"); else assert.equal(state.committedEvents.length, 0);
        assert.ok(state.order.indexOf("lock-profile") < state.order.indexOf("lock-property"));
      }
    });
    await t.test("native caller cancellation reaches the shared upload without attaching or notifying", async () => {
      reset();
      const caller = new AbortController();
      let entered;
      const ready = new Promise(resolve => { entered = resolve; });
      state.uploadReply = request => new Promise(resolve => {
        request.signal.addEventListener("abort", () => resolve(Response.json({
          success: false, code: "PROPERTY_PHOTO_UPLOAD_FAILED",
          error: "Property photo upload could not be completed. Refresh the listing before retrying."
        }, { status: 502 })), { once: true });
        entered();
      });
      const original = new Request("https://fixture.invalid/api/mobile/upload", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: "property-0001", base64: Buffer.from([255, 216, 255, 0]).toString("base64") }),
        signal: caller.signal
      });
      const pending = upload.POST(original);
      await ready;
      assert.equal(state.uploadRequests.length, 1);
      assert.equal(state.uploadRequests[0].signal.aborted, false);
      caller.abort();
      const response = await pending;
      assert.equal(response.status, 502);
      assert.equal((await response.json()).code, "PROPERTY_PHOTO_UPLOAD_FAILED");
      assert.equal(state.uploadRequests[0].signal.aborted, true);
      assert.equal(state.uploadRequests.length, 1);
      assert.equal(state.committedWrites.length, 0);
      assert.equal(state.committedEvents.length, 0);
    });
    await t.test("delete rechecks locked ownership and notifies only the deleted public row", async () => {
      for (const status of ["PUBLISHED", "DRAFT"]) {
        reset(); state.currentProperty.status = status;
        assert.equal((await remove()).status, 200);
        if (status === "PUBLISHED") expectOneCommit("delete"); else assert.equal(state.committedEvents.length, 0);
        assert.deepEqual(state.order.slice(0, 3), ["begin", "lock-profile", "lock-property"]);
        assert.equal(state.committedWrites[0].where.ownerId, "owner-0001");
      }
      for (const overrides of [{ currentActorStatus: "SUSPENDED" }, { currentRole: "USER" }]) {
        reset(overrides); assert.equal((await remove()).status, 403);
        assert.equal(state.committedWrites.length, 0); assert.equal(state.committedEvents.length, 0);
      }
      reset(); state.currentProperty.ownerId = "foreign-owner";
      assert.equal((await remove()).status, 403); assert.equal(state.committedEvents.length, 0);
      reset(); state.currentProperty = null;
      assert.equal((await remove()).status, 404); assert.equal(state.committedEvents.length, 0);
    });
    await t.test("admin verification and moderation include both visibility transitions", async () => {
      for (const [route, next] of [[moderate, "PUBLISHED"], [verify, "VERIFIED"], [moderate, "REJECTED"], [verify, "EXPIRED"]]) {
        reset({ role: "ADMIN", currentRole: "ADMIN" });
        if (["REJECTED", "EXPIRED"].includes(next)) state.currentProperty.status = "PUBLISHED";
        assert.equal((await adminCall(route, next)).status, 200); expectOneCommit("update");
      }
      reset({ role: "ADMIN", currentRole: "ADMIN" });
      assert.equal((await adminCall(moderate, "REJECTED")).status, 200);
      assert.equal(state.committedEvents.length, 0);
    });
    await t.test("denied, invalid, incomplete-photo and failed storage writes have no event", async () => {
      for (const [overrides, expected] of [[{ authenticated: false }, 401], [{ actorStatus: "SUSPENDED" }, 403], [{ allowed: false }, 429], [{ failWrite: true }, 500]]) {
        reset(overrides); assert.equal((await create.POST(request("POST", createBody))).status, expected);
        assert.equal(state.committedWrites.length, 0); assert.equal(state.committedEvents.length, 0);
      }
      reset(); assert.equal((await create.POST(request("POST", { ...createBody, mediaUrls: photos.slice(0, 3) }))).status, 400);
      assert.equal(state.committedEvents.length, 0);
      reset(); assert.equal((await patch({ status: "invalid" })).status, 400);
      assert.equal(state.committedEvents.length, 0);
    });
    await t.test("notification failure aborts the same transaction, rather than acknowledging an unsignalled write", async () => {
      reset({ failNotify: true });
      assert.equal((await patch({ status: "PUBLISHED" })).status, 500);
      assert.equal(state.committedWrites.length, 0); assert.equal(state.committedEvents.length, 0);
      assert.deepEqual(state.order.slice(-3), ["update", "notify", "rollback"]);
    });
  } finally {
    if (originalFlag === undefined) delete process.env.HOMEZONE_REALTIME_ENABLED;
    else process.env.HOMEZONE_REALTIME_ENABLED = originalFlag;
  }
});
