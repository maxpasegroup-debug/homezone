import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Actual routes and Builder admission locks; all auth, storage and transactions
// are synthetic, in-process fixtures. No network, filesystem storage or DB I/O.
const state = {};
globalThis.__builderUploadFixture = state;
const projectId = "project-0001";
const actorId = "builder-0001";
const image = Buffer.from([255, 216, 255, 0]).toString("base64");
const fields = ["mediaUrls", "floorPlanUrls", "masterPlanUrl", "brochureUrl"];
const safeKeys = ["id", "status", "mediaUrls", "floorPlanUrls", "masterPlanUrl", "brochureUrl", "updatedAt"].sort();
const pick = (row, select) => row && select
  ? Object.fromEntries(Object.entries(select).filter(([, value]) => value === true).map(([key]) => [key, row[key]]))
  : row;
function reset(overrides = {}) {
  Object.assign(state, {
    authenticated: true, role: "BUILDER", currentRole: "BUILDER", actorStatus: "PENDING",
    currentStatus: "PENDING", allowed: true, configured: true, uploads: 0, writes: [], locks: [], limits: [],
    providerAction: undefined, providerReply: undefined, failAttach: false, failRead: false,
    project: {
      id: projectId, builderId: actorId, status: "DRAFT", mediaUrls: [], floorPlanUrls: [],
      masterPlanUrl: null, brochureUrl: null, updatedAt: new Date("2026-11-06T00:00:00Z"),
      bookings: [{ buyerPhone: "PRIVATE_FIXTURE" }], team: ["PRIVATE_FIXTURE"]
    },
    property: { id: "property-0001", ownerId: actorId, mediaUrls: [], status: "DRAFT" },
    queue: Promise.resolve(), ...overrides
  });
}
state.db = {
  profile: { findUnique: async () => ({ role: state.currentRole, verificationStatus: state.currentStatus }) },
  builderProject: {
    findFirst: async ({ where, select }) => {
      if (state.failRead) throw new Error("PRIVATE_STORAGE_DETAIL");
      const row = state.project;
      return row && row.id === where.id && row.builderId === where.builderId ? pick(row, select) : null;
    },
    findUnique: async ({ where, select }) => state.project?.id === where.id ? pick(state.project, select) : null,
    update: async ({ where, data, select }) => {
      if (state.failAttach) throw new Error("PRIVATE_STORAGE_DETAIL");
      assert.equal(where.id, state.project.id);
      for (const [field, value] of Object.entries(data)) {
        state.project[field] = value && typeof value === "object" && "push" in value
          ? [...state.project[field], value.push] : value;
      }
      state.project.updatedAt = new Date(state.project.updatedAt.getTime() + 1);
      state.writes.push({ type: "project", data });
      return pick(state.project, select);
    }
  },
  property: {
    findFirst: async ({ where, select }) => state.property?.id === where.id && state.property.ownerId === where.ownerId
      ? pick(state.property, select) : null,
    update: async ({ data }) => {
      state.property.mediaUrls.push(data.mediaUrls.push);
      state.writes.push({ type: "property", data });
    }
  },
  $queryRaw: async (parts, id) => {
    state.locks.push({ kind: /BuilderProject/.test(parts.join("")) ? "project" : /Profile/.test(parts.join("")) ? "profile" : "property", id });
    return [];
  },
  $executeRaw: async (parts, ...values) => {
    assert.match(parts.join("?"), /^SELECT pg_notify\(\?, \?\)$/);
    assert.deepEqual(values, ["homezone_public_properties_v1", '{"v":1,"type":"properties.changed"}']);
    state.writes.push({ type: "publicInvalidate" });
    return 1;
  },
  $transaction: async callback => {
    // Serialize the real lock/admission callback, including concurrent cap checks.
    const predecessor = state.queue;
    let release;
    state.queue = new Promise(resolve => { release = resolve; });
    await predecessor;
    const snapshot = structuredClone(state.project);
    const writeCount = state.writes.length;
    try { return await callback(state.db); }
    catch (error) { state.project = snapshot; state.writes.length = writeCount; throw error; }
    finally { release(); }
  }
};
const mocks = {
  "@/auth": "export const auth=async()=>globalThis.__builderUploadFixture.authenticated?{user:{id:'fixture-user'}}:null;",
  "@/lib/auth/profile": "export const getOrCreateProfile=async()=>{const s=globalThis.__builderUploadFixture;return {id:'builder-0001',role:s.role,verificationStatus:s.actorStatus};};",
  "@/lib/db": "export const db=globalThis.__builderUploadFixture.db;",
  "@/lib/api/rate-limit": "export const checkRateLimit=options=>{const s=globalThis.__builderUploadFixture;s.limits.push(options);return {allowed:s.allowed,resetAt:new Date(Date.now()+60000)};};export const rateLimitKey=(_request,scope,id)=>scope+':'+id;",
  "@/lib/logging/logger": "export const captureException=()=>{};",
  "@/lib/auth/redirect": "export const authOrigin=()=> 'https://fixture.invalid';",
  "@/lib/documents/private-files": "export const requirePrivateFiles=()=>{throw new Error('unconfigured');};",
  "@/lib/media/cloudinary": "export const getCloudinaryConfig=()=>{throw new Error('unconfigured');};",
  "@/lib/media/property-photo-storage": "export const propertyPhotoStorageProvider=()=> 'railway-volume';export const propertyPhotoVolumeReady=async()=>globalThis.__builderUploadFixture.configured;",
  "@/../backend/api/media/upload/route": `export const POST=async request=>{
    const s=globalThis.__builderUploadFixture;s.uploads++;
    const form=await request.formData();s.uploadFolder=form.get('folder');s.uploadMime=form.get('file').type;
    await s.providerAction?.();
    return s.providerReply?s.providerReply():Response.json({url:'https://images.fixture.invalid/project-'+s.uploads+'.jpg'});
  };`
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
const upload = await import("../src/app/api/mobile/upload/route.ts");
const projectRoute = await import("../backend/api/builder/projects/[id]/route.ts");
const capabilities = await import("../src/app/api/mobile/capabilities/route.ts");
hooks.deregister();
const request = (data, headers = { "content-type": "application/json" }) => new Request("https://fixture.invalid/api/mobile/upload", {
  method: "POST", headers, body: JSON.stringify(data)
});
const photo = (field = "mediaUrls", extra = {}) => upload.POST(request({ projectId, field, base64: image, ...extra }));
const context = (id = projectId) => ({ params: Promise.resolve({ id }) });
const read = (id = projectId) => projectRoute.GET(new Request("https://fixture.invalid/api/builder/projects/" + id), context(id));

test("Builder project images reuse safe upload and owned-project readback", async t => {
  for (const field of fields) await t.test(`${field} attaches an image and returns only safe project metadata`, async () => {
    reset();
    const response = await photo(field);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(Object.keys(result.project).sort(), safeKeys);
    assert.equal(result.project.id, projectId);
    assert.equal(result.project.status, "DRAFT");
    assert.equal(Array.isArray(result.project[field]) ? result.project[field][0] : result.project[field], result.url);
    assert.equal(state.uploadFolder, "homezone/property-media");
    assert.equal(state.uploadMime, "image/jpeg");
    assert.deepEqual(state.locks, [{ kind: "profile", id: actorId }, { kind: "project", id: projectId }]);
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_FIXTURE|builderId|bookings|team/);
  });
  await t.test("single master-plan and brochure fields replace without changing other fields", async () => {
    for (const field of ["masterPlanUrl", "brochureUrl"]) {
      reset(); state.project[field] = "https://images.fixture.invalid/previous.jpg";
      assert.equal((await photo(field)).status, 200);
      assert.equal(state.project[field], "https://images.fixture.invalid/project-1.jpg");
      assert.deepEqual(state.project.mediaUrls, []);
      assert.deepEqual(state.project.floorPlanUrls, []);
      assert.equal(state.writes.length, 1);
    }
  });
  await t.test("published image attachment invalidates the public catalogue only after attachment", async () => {
    const original = process.env.HOMEZONE_REALTIME_ENABLED;
    try {
      process.env.HOMEZONE_REALTIME_ENABLED = "true";
      for (const status of ["PUBLISHED", "DRAFT"]) {
        reset(); state.project.status = status;
        assert.equal((await photo()).status, 200);
        assert.deepEqual(state.writes.map(write => write.type), status === "PUBLISHED" ? ["project", "publicInvalidate"] : ["project"]);
      }
      reset({ failAttach: true }); state.project.status = "PUBLISHED";
      assert.equal((await photo()).status, 409); assert.deepEqual(state.writes, []);
    } finally {
      if (original === undefined) delete process.env.HOMEZONE_REALTIME_ENABLED; else process.env.HOMEZONE_REALTIME_ENABLED = original;
    }
  });
  await t.test("JPEG, PNG and WebP image signatures are retained through the shared provider", async () => {
    for (const [bytes, mime] of [
      [Buffer.from([255, 216, 255, 0]), "image/jpeg"],
      [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]), "image/png"],
      [Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(1)]), "image/webp"]
    ]) {
      reset();
      assert.equal((await photo("mediaUrls", { base64: bytes.toString("base64") })).status, 200);
      assert.equal(state.uploadMime, mime);
    }
  });
  await t.test("strict request validation rejects unsupported fields and public PDFs before storage", async () => {
    for (const extra of [
      { field: "documents" }, { projectId: "bad/path" }, { propertyId: "property-0001" },
      { ownerId: "foreign-user" }, { status: "PUBLISHED" },
      { base64: Buffer.from("%PDF-1.4 document").toString("base64") },
      { base64: "not-base64!" }, { base64: " /9j/AA==" }, { base64: "/9j/AA" },
      { base64: Buffer.alloc(6 * 1024 * 1024 + 1, 1).toString("base64") }
    ]) {
      reset();
      assert.equal((await photo("mediaUrls", extra)).status, 400, JSON.stringify(Object.keys(extra)));
      assert.equal(state.uploads, 0); assert.deepEqual(state.writes, []);
    }
    reset();
    assert.equal((await upload.POST(request({ projectId, field: "mediaUrls", base64: image }, { "content-type": "text/plain" }))).status, 400);
    assert.equal(state.uploads, 0);
  });
  await t.test("an already attached provider URL is not appended twice", async () => {
    const url = "https://images.fixture.invalid/existing.jpg";
    reset({ providerReply: () => Response.json({ url }) });
    state.project.mediaUrls = [url];
    assert.equal((await photo()).status, 200);
    assert.deepEqual(state.project.mediaUrls, [url]);
    assert.deepEqual(state.writes, []);
  });
  await t.test("request stream cap is enforced without trusting Content-Length", async () => {
    reset();
    const response = await upload.POST(new Request("https://fixture.invalid/api/mobile/upload", {
      method: "POST", headers: { "content-type": "application/json", "content-length": "1" }, body: " ".repeat(9 * 1024 * 1024 + 1)
    }));
    assert.equal(response.status, 413);
    assert.equal(state.uploads, 0); assert.deepEqual(state.writes, []);
  });
  await t.test("authentication, role, suspension and project ownership are required before provider I/O", async () => {
    for (const [overrides, expected] of [
      [{ authenticated: false }, 401], [{ role: "USER" }, 403], [{ role: "ADMIN" }, 403],
      [{ role: "SUPER_ADMIN" }, 403], [{ role: "SERVICE_PROVIDER" }, 403], [{ actorStatus: "SUSPENDED" }, 403],
      [{ project: null }, 403]
    ]) {
      reset(overrides); assert.equal((await photo()).status, expected);
      assert.equal(state.uploads, 0); assert.deepEqual(state.writes, []);
    }
    reset(); state.project.builderId = "foreign-builder";
    assert.equal((await photo()).status, 403); assert.equal(state.uploads, 0);
  });
  await t.test("Owner and Broker property uploads retain their existing contract", async () => {
    for (const role of ["OWNER", "BROKER"]) {
      reset({ role, currentRole: role });
      const response = await upload.POST(request({ propertyId: "property-0001", base64: image }));
      assert.equal(response.status, 200);
      assert.deepEqual(Object.keys(await response.json()), ["url"]);
      assert.deepEqual(state.writes.map(write => write.type), ["property"]);
    }
    reset({ role: "OWNER", currentRole: "OWNER" });
    assert.equal((await photo()).status, 400); assert.equal(state.uploads, 0);
    reset();
    assert.equal((await upload.POST(request({ propertyId: "property-0001", base64: image }))).status, 400);
    assert.equal(state.uploads, 0);
  });
  await t.test("rate limits and provider failures cause no attachment", async () => {
    reset({ allowed: false });
    assert.equal((await photo()).status, 429); assert.equal(state.uploads, 0);
    reset({ providerReply: () => Response.json({ error: "Storage unavailable" }, { status: 503 }) });
    assert.equal((await photo()).status, 503); assert.deepEqual(state.writes, []);
    for (const url of ["http://images.fixture.invalid/a.jpg", "https://user:password@images.fixture.invalid/a.jpg", "https://images.fixture.invalid/a.jpg#fragment", "https://images.fixture.invalid:8443/a.jpg", "invalid"]) {
      reset({ providerReply: () => Response.json({ url }) });
      const response = await photo();
      assert.equal(response.status, 502); assert.deepEqual(state.writes, []);
      assert.doesNotMatch(JSON.stringify(await response.json()), /user:password|8443|PRIVATE/);
    }
  });
  await t.test("Builder batch allowance is 20/minute while Owner and Broker retain 10/minute", async () => {
    reset();
    assert.equal((await photo()).status, 200);
    assert.deepEqual(state.limits, [{ key: "mobile:builder-project-photo:" + actorId, limit: 20, windowMs: 60000 }]);
    for (const role of ["OWNER", "BROKER"]) {
      reset({ role, currentRole: role });
      assert.equal((await upload.POST(request({ propertyId: "property-0001", base64: image }))).status, 200);
      assert.deepEqual(state.limits, [{ key: "mobile:photo:" + actorId, limit: 10, windowMs: 60000 }]);
    }
  });
  await t.test("fresh locked admission refuses role, suspension, ownership or cap changes during provider I/O", async () => {
    for (const change of [
      () => { state.currentRole = "USER"; }, () => { state.currentStatus = "SUSPENDED"; },
      () => { state.project.builderId = "foreign-builder"; },
      () => { state.project.mediaUrls = Array.from({ length: 40 }, (_, i) => `https://images.fixture.invalid/${i}.jpg`); }
    ]) {
      reset({ providerAction: change });
      const response = await photo();
      assert.equal(response.status, 409); assert.equal(state.uploads, 1); assert.deepEqual(state.writes, []);
      assert.match((await response.json()).error, /Refresh the project before retrying/);
    }
  });
  await t.test("attachment storage errors are sanitized and do not claim provider file deletion", async () => {
    reset({ failAttach: true });
    const response = await photo();
    assert.equal(response.status, 409); assert.equal(state.uploads, 1); assert.deepEqual(state.writes, []);
    const result = await response.json();
    assert.match(result.error, /no provider file was deleted/);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_STORAGE_DETAIL/);
  });
  for (const [field, cap] of [["mediaUrls", 40], ["floorPlanUrls", 30]]) {
    await t.test(`${field} preflight blocks a full collection before uploading`, async () => {
      reset(); state.project[field] = Array.from({ length: cap }, (_, i) => `https://images.fixture.invalid/${i}.jpg`);
      assert.equal((await photo(field)).status, 409); assert.equal(state.uploads, 0); assert.deepEqual(state.writes, []);
    });
    await t.test(`${field} locked cap prevents concurrent uploads from exceeding ${cap}`, async () => {
      let arrivals = 0, release;
      const gate = new Promise(resolve => { release = resolve; });
      reset({ providerAction: async () => { if (++arrivals === 2) release(); await gate; } });
      // Unique provider URLs let this exercise the cap rather than idempotent URL reuse.
      let replies = 0;
      state.providerReply = () => Response.json({ url: `https://images.fixture.invalid/concurrent-${++replies}.jpg` });
      state.project[field] = Array.from({ length: cap - 1 }, (_, i) => `https://images.fixture.invalid/${i}.jpg`);
      const responses = await Promise.all([photo(field), photo(field)]);
      assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
      assert.equal(state.project[field].length, cap); assert.equal(state.writes.length, 1);
    });
  }
  await t.test("owned readback exposes only safe upload metadata and scopes by current profile", async () => {
    reset();
    const response = await read();
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys((await response.json()).project).sort(), safeKeys);
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    for (const [overrides, expected] of [[{ authenticated: false }, 401], [{ role: "OWNER" }, 403], [{ actorStatus: "SUSPENDED" }, 403], [{ project: null }, 404]]) {
      reset(overrides); assert.equal((await read()).status, expected);
    }
    reset(); state.project.builderId = "foreign-builder";
    assert.equal((await read()).status, 404);
    reset(); assert.equal((await read("bad/path")).status, 400);
    reset({ failRead: true });
    const unavailable = await read();
    assert.equal(unavailable.status, 503);
    assert.doesNotMatch(JSON.stringify(await unavailable.json()), /PRIVATE_STORAGE_DETAIL/);
  });
  await t.test("capability is explicitly Builder-only and matches existing storage readiness", async () => {
    for (const [role, configured, expected] of [["BUILDER", true, true], ["BUILDER", false, false], ["OWNER", true, false], ["BROKER", true, false], ["USER", true, false]]) {
      reset({ role, configured });
      const response = await capabilities.GET();
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.propertyPhotoUploadConfigured, configured);
      assert.equal(result.builderProjectImageUploadConfigured, expected);
      assert.deepEqual(result.builderProjectImageUploadFields, fields);
    }
    reset({ authenticated: false }); assert.equal((await capabilities.GET()).status, 401);
    reset({ actorStatus: "SUSPENDED" }); assert.equal((await capabilities.GET()).status, 403);
  });
});
