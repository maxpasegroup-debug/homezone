import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute the real upload/configuration contracts with in-process auth, audit,
// logging and HTTP fixtures. No Railway, provider or database is contacted.
const state = { authenticated: true, suspended: false, allowed: true, logs: [], audits: [], fetches: [] };
globalThis.__photoStorageFixture = state;
const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const mocks = {
  "@/auth": "export const auth=async()=>globalThis.__photoStorageFixture.authenticated?{user:{id:'synthetic-user'}}:null;",
  "@/lib/auth/profile": "export const getOrCreateProfile=async()=>({id:'synthetic-profile',role:'OWNER',verificationStatus:globalThis.__photoStorageFixture.suspended?'SUSPENDED':'PENDING'});",
  "@/lib/auth/redirect": "export const authOrigin=()=> 'https://fixture.invalid';",
  "@/lib/audit": "export const auditLog=async value=>globalThis.__photoStorageFixture.audits.push(value);",
  "@/lib/env": "export const env={UPLOAD_MAX_BYTES:25000000};",
  "@/lib/documents/private-files": "export const requirePrivateFiles=()=>{throw new Error('SYNTHETIC_UNAVAILABLE');};",
  "@/lib/api/rate-limit": "export const checkRateLimit=()=>({allowed:globalThis.__photoStorageFixture.allowed,resetAt:new Date(Date.now()+60000)});export const rateLimitKey=()=> 'synthetic';",
  "@/lib/logging/logger": "export const captureException=()=>{globalThis.__photoStorageFixture.logs.push({unexpected:true});};export const logger={warn:(message,context)=>globalThis.__photoStorageFixture.logs.push({message,context})};"
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
const upload = await import("../backend/api/media/upload/route.ts");
const capabilities = await import("../src/app/api/mobile/capabilities/route.ts");
hooks.deregister();

function reset(configured = false) {
  Object.assign(state, { authenticated: true, suspended: false, allowed: true, logs: [], audits: [], fetches: [] });
  for (const key of keys) {
    if (configured) process.env[key] = `SYNTHETIC_PRIVATE_${key}`;
    else delete process.env[key];
  }
  globalThis.fetch = async (...args) => {
    state.fetches.push(args);
    throw new Error("SYNTHETIC_PRIVATE_PROVIDER_EXCEPTION");
  };
}
function request() {
  const form = new FormData();
  form.append("folder", "homezone/property-media");
  form.append("file", new File([new Uint8Array([255, 216, 255, 0])], "synthetic.jpg", { type: "image/jpeg" }));
  return new Request("https://fixture.invalid/api/media/upload", { method: "POST", body: form });
}
function assertSanitized(value) {
  assert.doesNotMatch(JSON.stringify(value), /SYNTHETIC_PRIVATE|api_key|api_secret|signature|secure_url/);
}

test("property photo storage configuration and provider failures stay explicit and sanitized", async t => {
  try {
    await t.test("configuration flag is private, false when missing, and true only with all three settings", async () => {
      reset();
      let response = await capabilities.GET();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      let body = await response.json();
      assert.equal(body.propertyPhotoUploadConfigured, false);
      assertSanitized(body);
      for (const key of keys) {
        reset(true);
        delete process.env[key];
        assert.equal((await (await capabilities.GET()).json()).propertyPhotoUploadConfigured, false);
      }
      reset(true);
      body = await (await capabilities.GET()).json();
      assert.equal(body.propertyPhotoUploadConfigured, true);
      assert.match(body.notice, /do not prove provider health/);
      assertSanitized(body);
      assert.equal(state.fetches.length, 0);
      assert.equal(state.audits.length, 0);
    });
    await t.test("unauthenticated and suspended callers cannot read capability information or upload", async () => {
      for (const [key, status] of [["authenticated", 401], ["suspended", 403]]) {
        reset(true);
        state[key] = key === "authenticated" ? false : true;
        assert.equal((await capabilities.GET()).status, status);
        assert.equal((await upload.POST(request())).status, status);
        assert.equal(state.fetches.length, 0);
      }
    });
    await t.test("missing storage produces a coded 503 before any external request", async () => {
      for (const key of keys) {
        reset(true);
        delete process.env[key];
        const response = await upload.POST(request());
        assert.equal(response.status, 503);
        const body = await response.json();
        assert.equal(body.success, false);
        assert.equal(body.code, "PROPERTY_PHOTO_STORAGE_UNAVAILABLE");
        assert.equal(state.fetches.length, 0);
        assert.equal(state.audits.length, 0);
        assert.deepEqual(state.logs, [{ message: "Media upload unavailable", context: { stage: "configuration", category: body.code } }]);
        assertSanitized([body, state.logs]);
      }
    });
    await t.test("provider transport failure and rejection produce coded 502 without leaking provider details", async () => {
      for (const kind of ["transport", "response"]) {
        reset(true);
        if (kind === "response") globalThis.fetch = async (...args) => {
          state.fetches.push(args);
          return Response.json({ error: { message: "SYNTHETIC_PRIVATE_PROVIDER_RESPONSE" } }, { status: 401 });
        };
        const response = await upload.POST(request());
        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.code, "PROPERTY_PHOTO_UPLOAD_FAILED");
        assert.equal(body.success, false);
        assert.equal(state.fetches.length, 1);
        assert.equal(state.audits.length, 0);
        assertSanitized([body, state.logs]);
        assert.equal((await (await capabilities.GET()).json()).propertyPhotoUploadConfigured, true);
      }
    });
    await t.test("invalid or insecure success acknowledgment is never presented as an uploaded image", async () => {
      for (const body of [null, {}, { secure_url: "http://fixture.invalid/photo.jpg" }, { secure_url: "https://user:pass@fixture.invalid/photo.jpg" }, { secure_url: "https://fixture.invalid:444/photo.jpg" }, { secure_url: "https://fixture.invalid/photo.jpg#fragment" }, "invalid-json"]) {
        reset(true);
        globalThis.fetch = async () => body === "invalid-json" ? new Response("SYNTHETIC_PRIVATE_INVALID_JSON") : Response.json(body);
        const response = await upload.POST(request());
        assert.equal(response.status, 502);
        const result = await response.json();
        assert.equal(result.code, "PROPERTY_PHOTO_CONFIRMATION_UNAVAILABLE");
        assert.equal(result.url, undefined);
        assert.equal(state.audits.length, 0);
        assertSanitized([result, state.logs]);
      }
    });
    await t.test("valid HTTPS provider upload retains the existing acknowledgment contract", async () => {
      reset(true);
      const url = "https://images.fixture.invalid/photo.jpg";
      globalThis.fetch = async () => Response.json({ secure_url: url, public_id: "synthetic-photo", resource_type: "image" });
      const response = await upload.POST(request());
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.url, url);
      assert.equal(body.publicId, "synthetic-photo");
      assert.equal(body.resourceType, "image");
      assert.equal(state.audits.length, 1);
      assert.equal(state.logs.length, 0);
    });
    await t.test("existing rate limiting still rejects before provider traffic", async () => {
      reset(true);
      state.allowed = false;
      const response = await upload.POST(request());
      assert.equal(response.status, 429);
      assert.equal(state.fetches.length, 0);
      assert.equal(state.audits.length, 0);
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (originalEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[key];
    }
    delete globalThis.__photoStorageFixture;
  }
});
