import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Auth } from "@auth/core";
import { encode } from "next-auth/jwt";
import ts from "typescript";

const state = { users: new Map(), sessions: new Map(), resets: new Map(), cookie: "", failWrite: false, failRevoke: false, delivery: "false" };
globalThis.__sessionSecurity = state;
state.secret = randomBytes(32).toString("hex");
state.core = Auth;
let queue = Promise.resolve();
const db = {
  user: {
    create: async ({ data }) => {
      const user = { id: "new", email: data.email, name: data.name, role: data.profile.create.role,
        sessionVersion: 0, passwordCredential: data.passwordCredential.create };
      state.users.set(user.id, user);
      return { id: user.id, email: user.email, name: user.name };
    },
    upsert: async ({ where, create }) => {
      if (where.email) return [...state.users.values()].find((u) => u.email === where.email);
      if (!state.users.has(where.id)) state.users.set(where.id, { ...create, sessionVersion: 0, role: "USER" });
      return state.users.get(where.id);
    },
    findUnique: async ({ where }) => [...state.users.values()].find((u) => where.id ? u.id === where.id : u.email === where.email) ?? null,
    update: async ({ where }) => { const u = state.users.get(where.id); u.sessionVersion++; return u; }
  },
  profile: { upsert: async ({ where }) => ({ role: state.users.get(where.userId).role }), findUnique: async ({ where }) => {
    const u = state.users.get(where.userId ?? where.id);
    return u ? { id: u.id, userId: u.id, role: u.role, whatsappVerified: false, user: u } : null;
  } },
  passwordCredential: { upsert: async ({ where, update }) => {
    if (state.failWrite) throw new Error("fixture failure");
    state.users.get(where.userId).passwordCredential = { passwordHash: update.passwordHash };
  } },
  authSession: {
    create: async ({ data }) => { state.sessions.set(data.id, { ...data, revokedAt: null }); },
    findUnique: async ({ where }) => {
      const row = state.sessions.get(where.id);
      return row ? { ...row, user: state.users.get(row.userId) } : null;
    },
    updateMany: async ({ where, data }) => {
      if (state.failRevoke) throw new Error("fixture revocation failure");
      let count = 0;
      for (const row of state.sessions.values()) {
        if ((!where.id || row.id === where.id) && row.userId === where.userId && row.revokedAt === null) {
          Object.assign(row, data); count++;
        }
      }
      return { count };
    }
  },
  passwordResetToken: {
    findUnique: async ({ where }) => state.resets.get(where.tokenHash) ?? null,
    create: async ({ data }) => { state.resets.set(data.tokenHash, { id: "generated", usedAt: null, ...data }); },
    updateMany: async ({ where, data }) => {
      let count = 0;
      for (const row of state.resets.values()) {
        if ((!where.id || row.id === where.id) && (!where.tokenHash || row.tokenHash === where.tokenHash) &&
          (!where.userId || row.userId === where.userId) && row.usedAt === null &&
          (!where.expiresAt || row.expiresAt > where.expiresAt.gt)) { Object.assign(row, data); count++; }
      }
      return { count };
    }
  },
  async $transaction(callback) {
    // Serialize fixture transactions and roll back every change on failure.
    // PostgreSQL's conditional UPDATE provides the production claim lock.
    const previous = queue;
    let release;
    queue = new Promise((resolve) => { release = resolve; });
    await previous;
    const snapshot = structuredClone({ users: state.users, sessions: state.sessions, resets: state.resets });
    try { return await callback(db); }
    catch (error) { Object.assign(state, snapshot); throw error; }
    finally { release(); }
  }
};
state.db = db;
const mocks = {
  "next-auth": `export default function NextAuth(config) {
    const s = globalThis.__sessionSecurity; s.config = config;
    return { handlers: {GET:r=>s.core(r,config),POST:r=>s.core(r,config)},
      auth:async()=> (await s.core(new Request('https://homezone-production.up.railway.app/api/auth/session',{headers:{cookie:s.cookie}}),config)).json(),
      signIn:async()=>{}, signOut:async()=>{} };
  }`,
  "@/lib/db": "export const db = globalThis.__sessionSecurity.db;",
  "@/lib/env": `export const env = {AUTH_SECRET:globalThis.__sessionSecurity.secret,NODE_ENV:'test'};
    export const isDemoLoginEnabled=()=>false,isEmailLoginEnabled=()=>false,isGoogleLoginEnabled=()=>false,isMobileOtpLoginEnabled=()=>false;`,
  "@/lib/auth/otp": "export const isDemoMobileOtp=()=>false,normalizePhone=p=>p;",
  "@/lib/auth/profile": "export const getOrCreateProfile=async u=>globalThis.__sessionSecurity.db.profile.findUnique({where:{userId:u.id}});",
  "@/lib/audit": "export const auditLog=async()=>{};",
  "@/lib/logging/logger": "export const logger={error:()=>{}}; export const captureException=()=>{};",
  "@/lib/api/rate-limit": "export const checkRateLimit=()=>({allowed:true}); export const rateLimitKey=()=> 'fixture';",
  "@/lib/email/resend": "export const sendPasswordResetEmail=async({resetUrl})=> { globalThis.__sessionSecurity.recoveryOrigin=new URL(resetUrl).origin; if(globalThis.__sessionSecurity.delivery==='throw')throw new Error('fixture delivery failure'); return {sent:false}; };"
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in mocks) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier === "@/auth") return { url: new URL("../backend/auth.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      }).outputText };
    return nextLoad(url, context);
  }
});
const { handlers } = await import("../backend/auth.ts");
const resetRoute = await import("../backend/api/auth/password/reset/route.ts");
const signupRoute = await import("../backend/api/auth/password/signup/route.ts");
const adminRoute = await import("../backend/api/admin/users/[id]/password/route.ts");
const forgotRoute = await import("../backend/api/auth/password/forgot/route.ts");
const profileRoute = await import("../backend/api/profile/route.ts");
const registry = await import("../src/lib/auth/session-registry.ts");
const passwords = await import("../src/lib/auth/password.ts");
const { middleware } = await import("../middleware.ts");
const { NextRequest } = await import("next/server.js");
hooks.deregister();
// Silence Auth.js fixture errors without printing credentials or token contents.
state.config.logger = { error: () => {}, warn: () => {}, debug: () => {} };
// NextAuth supplies this default before calling Auth core in production.
state.config.basePath = "/api/auth";
const initialPassword = randomBytes(16).toString("hex") + "Az1";
const newPassword = randomBytes(16).toString("hex") + "Az2";
const origin = "https://homezone-production.up.railway.app";
const oldEnv = { AUTH_SECRET: process.env.AUTH_SECRET, AUTH_URL: process.env.AUTH_URL, AUTH_STAGING_ORIGIN: process.env.AUTH_STAGING_ORIGIN };

async function seed() {
  state.users = new Map(); state.sessions = new Map(); state.resets = new Map();
  state.failWrite = false; state.failRevoke = false; state.cookie = "";
  for (const id of ["user", "other", "admin"]) state.users.set(id, {
    id, email: `${id}@fixture.invalid`, name: id, sessionVersion: 0, role: id === "admin" ? "ADMIN" : "USER",
    passwordCredential: { passwordHash: await passwords.hashPassword(initialPassword) }
  });
}
function jsonRequest(path, body, method = "POST") {
  return new Request(`${origin}${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
async function reset(token, password = newPassword) {
  return resetRoute.POST(jsonRequest("/api/auth/password/reset", { token, password }));
}
function resetToken(expired = false) {
  const token = passwords.createResetToken();
  state.resets.set(passwords.hashResetToken(token), { id: "reset-fixture", tokenHash: passwords.hashResetToken(token),
    userId: "user", usedAt: null, expiresAt: new Date(Date.now() + (expired ? -1000 : 60000)) });
  return token;
}
function jar() {
  const values = new Map();
  return {
    remember(response) {
      for (const header of response.headers.getSetCookie()) {
        const pair = header.split(";")[0], index = pair.indexOf("=");
        const name = pair.slice(0, index), value = pair.slice(index + 1);
        if (value) values.set(name, value); else values.delete(name);
      }
    },
    cookie: () => [...values].map(([k, v]) => `${k}=${v}`).join("; ")
  };
}
async function signIn(id = "user", password = initialPassword, expectedSuccess = true) {
  const cookies = jar();
  const csrf = await handlers.GET(new Request(`${origin}/api/auth/csrf`));
  cookies.remember(csrf);
  const { csrfToken } = await csrf.json();
  const response = await handlers.POST(new Request(`${origin}/api/auth/callback/password`, {
    method: "POST", headers: { cookie: cookies.cookie(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/dashboard", email: `${id}@fixture.invalid`, password })
  }));
  cookies.remember(response);
  if (expectedSuccess) assert.equal(response.headers.get("location"), `${origin}/dashboard`);
  else assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), "CredentialsSignin");
  return cookies;
}
async function session(cookie) {
  return (await handlers.GET(new Request(`${origin}/api/auth/session`, { headers: { cookie } }))).json();
}
async function signOut(cookies) {
  const csrf = await handlers.GET(new Request(`${origin}/api/auth/csrf`, { headers: { cookie: cookies.cookie() } }));
  cookies.remember(csrf);
  const { csrfToken } = await csrf.json();
  return handlers.POST(new Request(`${origin}/api/auth/signout`, {
    method: "POST", headers: { cookie: cookies.cookie(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/" })
  }));
}

test("real Auth.js callbacks and password handlers enforce session security", async (t) => {
  process.env.AUTH_SECRET = state.secret; process.env.AUTH_URL = origin;
  delete process.env.AUTH_STAGING_ORIGIN;
  try {
    await t.test("reset succeeds once; consumed and expired tokens fail", async () => {
      await seed(); const token = resetToken();
      assert.equal((await reset(token)).status, 200);
      assert.equal((await reset(token)).status, 400);
      assert.equal((await reset(resetToken(true))).status, 400);
      assert.equal(state.users.get("user").sessionVersion, 1);
    });
    await t.test("concurrent reset attempts have one winner", async () => {
      await seed(); const token = resetToken();
      const responses = await Promise.all([reset(token), reset(token)]);
      assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
      assert.equal(state.users.get("user").sessionVersion, 1);
    });
    await t.test("transaction failure rolls back token consumption and credential change", async () => {
      await seed(); const token = resetToken(); state.failWrite = true;
      assert.equal((await reset(token)).status, 500);
      assert.equal(state.resets.get(passwords.hashResetToken(token)).usedAt, null);
      assert.equal(state.users.get("user").sessionVersion, 0);
      state.failWrite = false;
      assert.equal((await reset(token)).status, 200);
    });
    await t.test("password reset rejects old cookies at Auth.js and middleware; new sign-in succeeds", async () => {
      await seed(); const old = await signIn(), unrelated = await signIn("other");
      assert.ok((await session(old.cookie())).user);
      assert.equal((await reset(resetToken())).status, 200);
      assert.equal(await session(old.cookie()), null);
      state.cookie = old.cookie();
      assert.equal((await profileRoute.GET()).status, 401);
      assert.equal((await middleware(new NextRequest(`${origin}/api/profile`, { method: "PATCH", headers: { cookie: old.cookie() } }))).status, 401);
      assert.ok((await session(unrelated.cookie())).user);
      assert.equal(await session((await signIn("user", initialPassword, false)).cookie()), null);
      const current = await signIn("user", newPassword);
      assert.ok((await session(current.cookie())).user);
      state.cookie = current.cookie();
      assert.equal((await profileRoute.GET()).status, 200);
    });
    await t.test("existing password signup can sign in using the new session registry", async () => {
      await seed();
      const response = await signupRoute.POST(jsonRequest("/api/auth/password/signup", {
        name: "Fixture New User", email: "new@fixture.invalid", password: initialPassword
      }));
      assert.equal(response.status, 201);
      assert.equal(state.users.get("new").role, "USER");
      assert.ok((await session((await signIn("new")).cookie())).user);
    });
    await t.test("administrator password change revokes only the affected user", async () => {
      await seed(); const user = await signIn(), admin = await signIn("admin"), other = await signIn("other");
      state.cookie = admin.cookie();
      const response = await adminRoute.PATCH(jsonRequest("/api/admin/users/user/password", { password: newPassword, reason: "Security reset" }, "PATCH"), { params: Promise.resolve({ id: "user" }) });
      assert.equal(response.status, 200);
      assert.equal(await session(user.cookie()), null);
      assert.ok((await session(admin.cookie())).user);
      assert.ok((await session(other.cookie())).user);
      assert.ok((await session((await signIn("user", newPassword)).cookie())).user);
    });
    await t.test("administrator bootstrap password replacement also invalidates existing sessions", async () => {
      await seed(); const admin = await signIn("admin"), other = await signIn("other");
      const source = readFileSync(new URL("../scripts/create-admin.cjs", import.meta.url), "utf8");
      const require = createRequire(import.meta.url);
      const context = {
        require: (name) => name === "@prisma/client" ? { PrismaClient: function () { return db; } } : require(name),
        process: { env: { ADMIN_EMAIL: "admin@fixture.invalid", ADMIN_PASSWORD: newPassword, ADMIN_ROLE: "ADMIN" } },
        console: { log: () => {}, error: () => {} }
      };
      // Execute the actual bootstrap function against isolated fixtures only.
      runInNewContext(source.slice(0, source.lastIndexOf("\nmain()")) + "\nglobalThis.runBootstrap = main;", context);
      await context.runBootstrap();
      assert.equal(await session(admin.cookie()), null);
      assert.ok((await session(other.cookie())).user);
      assert.ok((await session((await signIn("admin", newPassword)).cookie())).user);
    });
    await t.test("logout revokes copied cookie and renewal cannot restore it", async () => {
      await seed(); const cookies = await signIn(), copied = cookies.cookie(), other = await signIn();
      const response = await signOut(cookies);
      assert.equal(response.headers.get("location"), `${origin}/`);
      cookies.remember(response);
      assert.equal(await session(copied), null);
      assert.equal(await session(copied), null);
      assert.ok((await session(other.cookie())).user);
      assert.equal((await middleware(new NextRequest(`${origin}/dashboard`, { headers: { cookie: copied } }))).headers.get("location"), `${origin}/auth?next=%2Fdashboard`);
    });
    await t.test("revocation failure returns 503 rather than cookie-only success", async () => {
      await seed(); const cookies = await signIn(); state.failRevoke = true;
      const response = await signOut(cookies);
      assert.equal(response.status, 503);
      assert.equal(response.headers.getSetCookie().length, 0);
      state.failRevoke = false;
      assert.equal((await signOut(cookies)).status, 302);
    });
    await t.test("missing, invalid, legacy and expired cookies fail safely", async () => {
      await seed();
      for (const token of [{ id: "user" }, { ...await registry.issueSession("user"), sid: "invalid" }]) {
        const value = await encode({ token, secret: state.secret, salt: "__Secure-authjs.session-token" });
        assert.equal(await session(`__Secure-authjs.session-token=${value}`), null);
      }
      assert.equal(await session(""), null);
      assert.equal(await session("__Secure-authjs.session-token=invalid"), null);
      const value = await encode({ token: await registry.issueSession("user"), secret: state.secret, salt: "__Secure-authjs.session-token", maxAge: -120 });
      assert.equal(await session(`__Secure-authjs.session-token=${value}`), null);
    });
    await t.test("credential version captured before a password change cannot issue a new session", async () => {
      await seed(); state.users.get("user").sessionVersion = 1;
      assert.equal(await registry.issueSession("user", 0), null);
    });
    await t.test("revocation write failure rolls back the entire password-reset transaction", async () => {
      await seed(); const token = resetToken(); state.failRevoke = true;
      assert.equal((await reset(token)).status, 500);
      assert.equal(state.resets.get(passwords.hashResetToken(token)).usedAt, null);
      assert.equal(state.users.get("user").sessionVersion, 0);
      assert.ok(await passwords.verifyPassword(initialPassword, state.users.get("user").passwordCredential.passwordHash));
    });
    await t.test("existing demo identity receives a revocable registry entry rather than a validation bypass", async () => {
      await seed();
      const claims = await state.config.callbacks.jwt({ token: {}, user: { id: "homezone-demo-user", email: "fixture-demo@example.invalid", name: "Fixture" } });
      assert.ok(await registry.validateSession(claims));
      assert.ok([...state.sessions.keys()].every((key) => key !== claims.sid));
      await registry.revokeSession(claims);
      assert.equal(await registry.validateSession(claims), false);
    });
    await t.test("server registry expiry is enforced even when Auth.js renews the encrypted cookie", async () => {
      await seed(); const cookies = await signIn();
      for (const row of state.sessions.values()) row.expiresAt = new Date(Date.now() - 1000);
      assert.equal(await session(cookies.cookie()), null);
    });
    await t.test("logout without a valid CSRF exchange cannot revoke the session", async () => {
      await seed(); const cookies = await signIn();
      await handlers.POST(new Request(`${origin}/api/auth/signout`, {
        method: "POST", headers: { cookie: cookies.cookie(), "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken: "invalid", callbackUrl: "/" })
      }));
      assert.ok((await session(cookies.cookie())).user);
    });
    await t.test("recovery uses the approved staging origin rather than request or forwarded hosts", async () => {
      await seed(); state.delivery = "false";
      const staging = "https://staging.example.com";
      process.env.AUTH_STAGING_ORIGIN = staging;
      process.env.AUTH_URL = staging;
      try {
        const response = await forgotRoute.POST(new Request("https://0.0.0.0:8080/api/auth/password/forgot", {
          method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-host": "evil.example.com" },
          body: JSON.stringify({ email: "user@fixture.invalid" })
        }));
        assert.equal(response.status, 200);
        assert.equal(state.recoveryOrigin, staging);
      } finally {
        process.env.AUTH_URL = origin;
        delete process.env.AUTH_STAGING_ORIGIN;
      }
    });
    await t.test("failed recovery delivery has the same generic public outcome as unknown email", async () => {
      await seed();
      for (const delivery of ["false", "throw"]) {
        state.delivery = delivery;
        const known = await forgotRoute.POST(jsonRequest("/api/auth/password/forgot", { email: "user@fixture.invalid" }));
        const unknown = await forgotRoute.POST(jsonRequest("/api/auth/password/forgot", { email: "absent@fixture.invalid" }));
        assert.equal(known.status, 200);
        assert.deepEqual(await known.json(), await unknown.json());
      }
    });
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
