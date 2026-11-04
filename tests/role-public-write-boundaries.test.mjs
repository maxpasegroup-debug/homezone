import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute actual routes and visibility policy. Authentication, transactions,
// notifications and image storage are in-process fixtures; no live I/O occurs.
const state = {};
globalThis.__publicWriteFixture = state;
const propertyId = "property-0001";
function reset(overrides = {}) {
  Object.assign(state, {
    authenticated: true, role: "USER", currentRole: "USER", actorStatus: "PENDING",
    status: "PUBLISHED", propertyPresent: true, shortlistOwner: "actor-0001",
    propertyOwner: "actor-0001", failWrite: false, failAt: undefined, beforeTransaction: undefined,
    afterPropertyLock: undefined,
    uploadReply: undefined, committed: [], calls: [], notifications: [], uploads: 0,
    ...overrides
  });
}
const write = (operation, data) => {
  if (state.failWrite || state.failAt === operation || state.failAt === `${operation}:${data.eventType}`) throw new Error("FIXTURE_PRIVATE_STORAGE_DETAIL");
  const value = { operation, data };
  if (state.pending) state.pending.push(value); else state.committed.push(value);
  return { id: "lead-created-0001", ...data };
};
state.db = {
  profile: { findUnique: async () => ({ role: state.currentRole, verificationStatus: state.actorStatus }) },
  property: {
    findUnique: async ({ where }) => {
      state.calls.push({ operation: "property-read", where });
      return state.propertyPresent && (!where.status || state.status === where.status)
        ? { id: propertyId, ownerId: state.propertyOwner, status: state.status, mediaUrls: [] } : null;
    },
    findFirst: async ({ where }) => state.propertyPresent && state.propertyOwner === where.ownerId
      ? { id: propertyId, ownerId: state.propertyOwner, mediaUrls: [], status: state.status } : null,
    update: async ({ data }) => write("property-update", data)
  },
  propertyShortlist: { findUnique: async () => ({ id: "shortlist-0001", userId: state.shortlistOwner }) },
  savedProperty: {
    upsert: async ({ create }) => write("save", create),
    deleteMany: async ({ where }) => write("unsave", where)
  },
  shortlistProperty: {
    upsert: async ({ create }) => write("shortlist", create),
    deleteMany: async ({ where }) => write("remove-shortlist", where)
  },
  lead: { create: async ({ data }) => write("lead", data) },
  leadTimelineEvent: { create: async ({ data }) => write("timeline", data) },
  notification: { create: async ({ data }) => write("notification", data) },
  leadNotification: { create: async ({ data }) => write("lead-notification", data) },
  $queryRaw: async (parts, id) => {
    const operation = /Profile/.test(parts.join("")) ? "lock-profile" : "lock-property";
    state.calls.push({ operation, id });
    if (operation === "lock-property") state.afterPropertyLock?.();
    return [];
  },
  $transaction: async callback => {
    state.beforeTransaction?.();
    state.pending = [];
    try {
      const result = await callback(state.db);
      state.committed.push(...state.pending);
      return result;
    } finally { state.pending = undefined; }
  }
};
const mocks = {
  "@/auth": "export const auth=async()=>globalThis.__publicWriteFixture.authenticated?{user:{id:'fixture-user'}}:null;",
  "@/lib/auth/profile": "export const getOrCreateProfile=async()=>({id:'actor-0001',role:globalThis.__publicWriteFixture.role,verificationStatus:'PENDING'});",
  "@/lib/db": "export const db=globalThis.__publicWriteFixture.db;",
  "@/lib/audit": "export const auditLog=async()=>{};",
  "@/lib/api/rate-limit": "export const checkRateLimit=()=>({allowed:true});export const rateLimitKey=()=> 'fixture';",
  "@/lib/logging/logger": "export const captureException=()=>{};",
  "@/lib/properties/realtime": "export const notifyPublicPropertyChange=async()=>{};",
  "@/../backend/api/media/upload/route": "export const POST=async()=>{const s=globalThis.__publicWriteFixture;s.uploads++;return s.uploadReply?s.uploadReply():Response.json({url:'https://images.fixture.invalid/photo.jpg'});};"
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
const enquiry = await import("../backend/api/leads/route.ts");
const crm = await import("../backend/api/pro/leads/route.ts");
const save = await import("../backend/api/properties/[id]/save/route.ts");
const shortlist = await import("../backend/api/shortlists/[id]/properties/route.ts");
const upload = await import("../src/app/api/mobile/upload/route.ts");
hooks.deregister();
const body = { name: "Fixture Buyer", phone: "+919876543210", message: "Please contact me", propertyId };
const request = (data, method = "POST") => new Request("https://fixture.invalid/api/public-action", {
  method, headers: { "content-type": "application/json" }, body: JSON.stringify(data)
});
const context = id => ({ params: Promise.resolve({ id }) });
const actions = {
  enquiry: () => enquiry.POST(request(body)),
  favorite: () => save.POST(request({}), context(propertyId)),
  shortlist: () => shortlist.POST(request({ propertyId }), context("shortlist-0001"))
};
const photo = () => upload.POST(request({ propertyId, base64: Buffer.from([255, 216, 255, 0]).toString("base64") }));

test("public property mutation visibility and native photo authorization", async t => {
  for (const [name, action] of Object.entries(actions)) {
    await t.test(`${name} rejects every nonpublic status and unknown IDs without side effects`, async () => {
      for (const status of ["DRAFT", "PENDING_REVIEW", "ARCHIVED", "REJECTED"]) {
        reset({ status });
        assert.equal((await action()).status, 404, status);
        assert.deepEqual(state.committed, []);
        assert.deepEqual(state.notifications, []);
      }
      reset({ propertyPresent: false });
      assert.equal((await action()).status, 404);
      assert.deepEqual(state.committed, []);
    });
    await t.test(`${name} uses current published state and locks before checking visibility`, async () => {
      reset();
      const response = await action();
      assert.equal(response.status, 200);
      assert.ok(state.committed.length > 0);
      assert.deepEqual(state.calls.filter(call => call.operation.startsWith("lock")).map(call => call.operation), ["lock-profile", "lock-property"]);
      assert.deepEqual(state.calls.at(-1).where, { id: propertyId, status: "PUBLISHED" });
      assert.ok(state.committed.every(value => !value.data.userId || value.data.userId === "actor-0001"));
      reset({ beforeTransaction: () => { state.status = "ARCHIVED"; } });
      assert.equal((await action()).status, 404);
      assert.deepEqual(state.committed, []);
    });
    await t.test(`${name} requires authentication and rejects current suspension`, async () => {
      reset({ authenticated: false });
      assert.equal((await action()).status, 401);
      assert.deepEqual(state.committed, []);
      reset({ actorStatus: "SUSPENDED" });
      assert.equal((await action()).status, 404);
      assert.deepEqual(state.committed, []);
    });
    await t.test(`${name} returns a sanitized storage error without committed writes`, async () => {
      reset({ failWrite: true });
      const response = await action();
      assert.equal(response.status, 500);
      assert.doesNotMatch(JSON.stringify(await response.json()), /FIXTURE_PRIVATE/);
      assert.deepEqual(state.committed, []);
      assert.deepEqual(state.notifications, []);
    });
  }
  await t.test("unavailable favorites and shortlist entries can still be removed", async () => {
    reset({ status: "ARCHIVED" });
    assert.equal((await save.DELETE(request({}, "DELETE"), context(propertyId))).status, 200);
    assert.equal((await shortlist.DELETE(request({ propertyId }, "DELETE"), context("shortlist-0001"))).status, 200);
    assert.deepEqual(state.committed.map(value => value.operation), ["unsave", "remove-shortlist"]);
  });
  await t.test("shortlist ownership remains enforced", async () => {
    reset({ shortlistOwner: "foreign-actor" });
    assert.equal((await actions.shortlist()).status, 403);
    assert.deepEqual(state.committed, []);
  });
  await t.test("manual Broker CRM creation remains independent of public listing visibility", async () => {
    reset({ role: "BROKER", currentRole: "BROKER", status: "DRAFT" });
    assert.equal((await crm.POST(request({ ...body, source: "DASHBOARD" }))).status, 200);
    assert.equal(state.committed[0].data.assignedTo, "actor-0001");
    assert.equal(state.calls.length, 0);
  });
  await t.test("Buyer enquiry, counters, owner notifications and timelines commit together", async () => {
    reset();
    assert.equal((await actions.enquiry()).status, 200);
    assert.deepEqual(state.committed.map(value => value.operation), [
      "lead", "timeline", "property-update", "notification", "lead-notification", "timeline"
    ]);
    assert.equal(state.committed[3].data.recipientId, "actor-0001");
    assert.equal(state.committed[5].data.eventType, "OWNER_NOTIFIED");
  });
  await t.test("enquiry locks both recipient profiles before the property and rechecks ownership", async () => {
    reset({ propertyOwner: "foreign-owner" });
    assert.equal((await actions.enquiry()).status, 200);
    assert.deepEqual(state.calls.filter(call => call.operation.startsWith("lock")), [
      { operation: "lock-profile", id: "actor-0001" },
      { operation: "lock-profile", id: "foreign-owner" },
      { operation: "lock-property", id: propertyId }
    ]);
    assert.equal(state.committed.find(value => value.operation === "notification").data.recipientId, "foreign-owner");
    reset({ propertyOwner: "foreign-owner", afterPropertyLock: () => { state.propertyOwner = "changed-owner"; } });
    assert.equal((await actions.enquiry()).status, 404);
    assert.deepEqual(state.committed, []);
  });
  await t.test("notification or owner-timeline failure rolls back the enquiry and counters", async () => {
    for (const failAt of ["notification", "lead-notification", "timeline:OWNER_NOTIFIED"]) {
      reset({ failAt });
      const response = await actions.enquiry();
      assert.equal(response.status, 500, failAt);
      assert.doesNotMatch(JSON.stringify(await response.json()), /FIXTURE_PRIVATE/);
      assert.deepEqual(state.committed, [], failAt);
    }
  });
  await t.test("propertyless enquiries do not claim that an owner was notified", async () => {
    reset();
    assert.equal((await enquiry.POST(request({ ...body, propertyId: undefined }))).status, 200);
    assert.deepEqual(state.committed.map(value => value.operation), ["lead", "timeline"]);
    assert.equal(state.committed[1].data.eventType, "LEAD_CREATED");
  });
  for (const currentRole of ["USER", "BUILDER", "SERVICE_PROVIDER", "BROKER"]) {
    await t.test(`photo completion refuses changed Owner role ${currentRole}`, async () => {
      reset({ role: "OWNER", currentRole: "OWNER", uploadReply: () => {
        state.currentRole = currentRole;
        return Response.json({ url: "https://images.fixture.invalid/photo.jpg" });
      } });
      const response = await photo();
      assert.equal(response.status, 409);
      assert.equal(state.uploads, 1);
      assert.deepEqual(state.committed, []);
      assert.match((await response.json()).error, /Refresh before retrying/);
    });
  }
  await t.test("photo completion refuses suspension or changed ownership after provider I/O", async () => {
    for (const change of [() => { state.actorStatus = "SUSPENDED"; }, () => { state.propertyOwner = "foreign-actor"; }]) {
      reset({ role: "OWNER", currentRole: "OWNER", uploadReply: () => {
        change(); return Response.json({ url: "https://images.fixture.invalid/photo.jpg" });
      } });
      assert.equal((await photo()).status, 409);
      assert.deepEqual(state.committed, []);
    }
  });
  await t.test("unchanged Owner and Broker retain successful photo attachment", async () => {
    for (const role of ["OWNER", "BROKER"]) {
      reset({ role, currentRole: role });
      assert.equal((await photo()).status, 200);
      assert.equal(state.committed.length, 1);
      assert.equal(state.committed[0].operation, "property-update");
    }
  });
});
