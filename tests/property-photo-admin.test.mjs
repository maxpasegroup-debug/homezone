import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Exercise the actual administrator publication routes with local storage/auth
// fixtures. No credentials, database connection or network request is used.
const state = {};
globalThis.__adminPhotoFixture = state;
const photos = count => Array.from({ length: count }, (_, i) => `https://photos.example.invalid/${i}.jpg`);
function reset(overrides = {}) {
  Object.assign(state, {
    authenticated: true, allowed: true, role: "ADMIN", currentRole: "ADMIN",
    profileStatus: "VERIFIED", property: { id: "property-0001", status: "DRAFT", coverImageUrl: null, mediaUrls: photos(4) },
    writes: [], locks: [], audits: 0, ...overrides
  });
}
state.db = {
  auditLog: { create: async () => { state.audits++; } },
  $transaction: async callback => callback({
    $queryRaw: async strings => { state.locks.push(strings.join("?")); return []; },
    profile: { findUnique: async () => ({ role: state.currentRole, verificationStatus: state.profileStatus }) },
    property: {
      findUnique: async () => state.property,
      update: async args => { state.writes.push(args); return { ...state.property, ...args.data }; }
    }
  })
};
const mocks = {
  "@/auth": "export const auth=async()=>globalThis.__adminPhotoFixture.authenticated?{user:{id:'admin-user'}}:null;",
  "@/lib/auth/profile": "export const getOrCreateProfile=async()=>({id:'admin-0001',role:globalThis.__adminPhotoFixture.role,verificationStatus:'VERIFIED'});",
  "@/lib/db": "export const db=globalThis.__adminPhotoFixture.db;",
  "@/lib/audit": "export const auditLog=async()=>{globalThis.__adminPhotoFixture.audits++;};",
  "@/lib/logging/logger": "export const captureException=()=>{};",
  "@/lib/trust/verification": "export const propertyVerificationEvent=status=>'fixture_'+status;",
  "@/lib/api/rate-limit": "export const checkRateLimit=()=>({allowed:globalThis.__adminPhotoFixture.allowed,resetAt:new Date()}); export const rateLimitKey=()=> 'fixture';"
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
const moderate = await import("../backend/api/admin/properties/[id]/moderate/route.ts");
const verify = await import("../backend/api/admin/properties/[id]/verify/route.ts");
hooks.deregister();
function call(route, status) {
  return route.PATCH(new Request("https://fixture.invalid/api/admin/properties/property-0001", {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, note: "Synthetic fixture" })
  }), { params: Promise.resolve({ id: "property-0001" }) });
}

test("all administrator publication entry points enforce two photos under locks", async t => {
  for (const [name, route, publication] of [["moderate", moderate, "PUBLISHED"], ["verify", verify, "VERIFIED"]]) {
    await t.test(`${name}: zero or one photo cannot be published or audited as successful`, async () => {
      for (const count of [0, 1]) {
        reset(); state.property.mediaUrls = photos(count);
        const response = await call(route, publication);
        assert.equal(response.status, 400); assert.match((await response.json()).error, /at least 2/);
        assert.equal(state.writes.length, 0); assert.equal(state.audits, 0);
        assert.deepEqual(state.locks.map(s => /Profile/.test(s) ? "profile" : "property"), ["profile", "property"]);
      }
    });
    await t.test(`${name}: two, four or six distinct photos permit authorized publication`, async () => {
      for (const count of [2, 4, 6]) {
        reset(); state.property.mediaUrls = photos(count); state.property.coverImageUrl = state.property.mediaUrls[0];
        const response = await call(route, publication);
        assert.equal(response.status, 200); assert.equal(state.writes[0].data.status, "PUBLISHED");
        assert.equal(state.audits, 1);
      }
    });
    await t.test(`${name}: repeated cover and gallery photos count once`, async () => {
      reset(); const photo = photos(1)[0];
      state.property.coverImageUrl = `${photo}#cover`;
      state.property.mediaUrls = [photo, `${photo}#gallery`, "https://PHOTOS.example.invalid:443/0.jpg"];
      assert.equal((await call(route, publication)).status, 400);
      assert.equal(state.writes.length, 0); assert.equal(state.audits, 0);
    });
    await t.test(`${name}: legacy publication stays visible and private moderation remains possible`, async () => {
      reset(); state.property.status = "PUBLISHED"; state.property.mediaUrls = photos(1);
      assert.equal((await call(route, publication)).status, 200);
      reset(); state.property.mediaUrls = [];
      assert.equal((await call(route, "REJECTED")).status, 200);
    });
    await t.test(`${name}: denied, missing and changed actors never write`, async () => {
      for (const [overrides, expected] of [
        [{ authenticated: false }, 401], [{ role: "OWNER" }, 403], [{ allowed: false }, 429],
        [{ currentRole: "USER" }, 403], [{ profileStatus: "SUSPENDED" }, 403], [{ property: null }, 404]
      ]) {
        reset(overrides); assert.equal((await call(route, publication)).status, expected);
        assert.equal(state.writes.length, 0); assert.equal(state.audits, 0);
      }
    });
  }
});
