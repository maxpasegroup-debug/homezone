import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { Auth } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import { encode } from "next-auth/jwt";

const registry = new Map();
globalThis.__authRegistryDb = {
  user: { findUnique: async () => ({ sessionVersion: 0 }) },
  authSession: {
    create: async ({ data }) => { registry.set(data.id, { ...data, revokedAt: null }); },
    findUnique: async ({ where }) => {
      const row = registry.get(where.id);
      return row ? { ...row, user: { sessionVersion: 0 } } : null;
    },
    updateMany: async ({ where, data }) => {
      const row = registry.get(where.id);
      if (row && row.userId === where.userId) Object.assign(row, data);
      return { count: row ? 1 : 0 };
    }
  }
};

// Requires Node 22.15+ for registerHooks (the project currently uses Node 24).
// Execute the real TypeScript middleware with the installed libraries. Node
// needs the Next.js extension and the one path alias resolved explicitly.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/db") return {
      url: "data:text/javascript,export const db = globalThis.__authRegistryDb;", shortCircuit: true
    };
    if (specifier === "@/lib/auth/session-registry") return {
      url: new URL("../src/lib/auth/session-registry.ts", import.meta.url).href, shortCircuit: true
    };
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/auth/roles") {
      return { url: new URL("../src/lib/auth/roles.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "@/lib/auth/redirect") {
      return { url: new URL("../src/lib/auth/redirect.ts", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts") && !url.includes("/node_modules/")) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
        }).outputText,
        shortCircuit: true
      };
    }
    return nextLoad(url, context);
  }
});
const { NextRequest } = await import("next/server.js");
const { middleware } = await import("../middleware.ts");
const { authOrigin, authRedirect } = await import("../src/lib/auth/redirect.ts");
const { issueSession, revokeSession } = await import("../src/lib/auth/session-registry.ts");
hooks.deregister();

const secret = randomBytes(32).toString("hex");
const originalEnv = Object.fromEntries(
  ["AUTH_SECRET", "AUTH_URL", "NEXTAUTH_URL", "AUTH_STAGING_ORIGIN", "NODE_ENV"].map((key) => [key, process.env[key]])
);

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function cookieName(origin) {
  return `${new URL(origin).protocol === "https:" ? "__Secure-" : ""}authjs.session-token`;
}

async function sessionCookie(origin, { role = "USER", id = "synthetic-user", maxAge = 300, signingSecret = secret } = {}) {
  const name = cookieName(origin);
  const value = await encode({ token: { ...await issueSession(id), role }, secret: signingSecret, salt: name, maxAge });
  return `${name}=${value}`;
}

function request(origin, path, cookie, method = "GET") {
  return new NextRequest(`${origin}${path}`, {
    method,
    headers: cookie ? { cookie } : {}
  });
}

function passed(response) {
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
}

function rejectedPage(response, path) {
  assert.equal(response.status, 307);
  const destination = new URL(response.headers.get("location"));
  assert.equal(destination.pathname, "/auth");
  assert.equal(destination.searchParams.get("next"), path);
}

test("middleware cookie detection and route authorization", async (t) => {
  process.env.AUTH_SECRET = secret;
  process.env.NODE_ENV = "test";
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
  delete process.env.AUTH_STAGING_ORIGIN;
  try {
    for (const origin of ["https://homezone-production.up.railway.app", "http://localhost:3000"]) {
      process.env.AUTH_URL = origin;
      await t.test(`${new URL(origin).protocol} valid session permits protected pages and mutations`, async () => {
        const cookie = await sessionCookie(origin);
        for (const path of ["/dashboard", "/broker", "/builder", "/owner"]) {
          passed(await middleware(request(origin, path, cookie)));
        }
        passed(await middleware(request(origin, "/api/properties", cookie, "POST")));
      });

      await t.test(`${new URL(origin).protocol} missing, malformed, expired, and incorrectly signed sessions are rejected`, async () => {
        const cookies = [
          undefined,
          `${cookieName(origin)}=invalid`,
          await sessionCookie(origin, { maxAge: -120 }),
          await sessionCookie(origin, { signingSecret: randomBytes(32).toString("hex") })
        ];
        // A correctly encrypted token without an identity must also be rejected.
        const anonymous = await encode({ token: { role: "USER" }, secret, salt: cookieName(origin) });
        cookies.push(`${cookieName(origin)}=${anonymous}`);
        for (const cookie of cookies) {
          rejectedPage(await middleware(request(origin, "/dashboard", cookie)), "/dashboard");
          const response = await middleware(request(origin, "/api/properties", cookie, "POST"));
          assert.equal(response.status, 401);
          assert.deepEqual(await response.json(), { error: "Unauthorized" });
        }
      });

      await t.test(`${new URL(origin).protocol} admin rules remain enforced`, async () => {
        const ordinary = await sessionCookie(origin);
        const denied = await middleware(request(origin, "/api/admin/users", ordinary, "PATCH"));
        assert.equal(denied.status, 403);
        const redirected = await middleware(request(origin, "/admin", ordinary));
        assert.equal(new URL(redirected.headers.get("location")).pathname, "/dashboard");
        for (const role of ["ADMIN", "SUPER_ADMIN"]) {
          const cookie = await sessionCookie(origin, { role });
          passed(await middleware(request(origin, "/admin", cookie)));
          passed(await middleware(request(origin, "/api/admin/users", cookie, "PATCH")));
        }
      });

      await t.test(`${new URL(origin).protocol} public route rules remain unchanged`, async () => {
        for (const path of ["/", "/auth", "/api/properties", "/dashboard-public", "/administrator"]) {
          passed(await middleware(request(origin, path)));
        }
        for (const path of ["/api/auth/password/signup", "/api/ai/search", "/api/payments/webhook"]) {
          passed(await middleware(request(origin, path, undefined, "POST")));
        }
        assert.equal((await middleware(request(origin, "/api/admin/users"))).status, 401);
      });
    }

    delete process.env.AUTH_URL;
    await t.test("HTTPS rejects the HTTP cookie name", async () => {
      rejectedPage(await middleware(request("https://homezone-production.up.railway.app", "/dashboard", await sessionCookie("http://localhost:3000"))), "/dashboard");
    });

    await t.test("canonical auth URL controls cookie naming behind an HTTP proxy", async () => {
      process.env.NEXTAUTH_URL = "https://homezone-production.up.railway.app";
      const cookie = await sessionCookie(process.env.NEXTAUTH_URL);
      passed(await middleware(request("http://internal:3000", "/dashboard", cookie)));
      process.env.AUTH_URL = "http://localhost:3000";
      passed(await middleware(request("https://homezone-production.up.railway.app", "/dashboard", await sessionCookie(process.env.AUTH_URL))));
      delete process.env.AUTH_URL;
      delete process.env.NEXTAUTH_URL;
    });

    await t.test("chunked HTTPS session cookies are recognized", async () => {
      const cookie = await sessionCookie("https://homezone-production.up.railway.app");
      const [name, value] = cookie.split("=");
      const midpoint = Math.floor(value.length / 2);
      passed(await middleware(request("https://homezone-production.up.railway.app", "/dashboard", `${name}.0=${value.slice(0, midpoint)}; ${name}.1=${value.slice(midpoint)}`)));
    });

    await t.test("redirects use explicit origins and reject unsafe destinations", async () => {
      process.env.NODE_ENV = "production";
      const publicOrigin = "https://homezone-production.up.railway.app";
      assert.equal(authRedirect("/dashboard?tab=saved"), `${publicOrigin}/dashboard?tab=saved`);
      for (const destination of ["https://0.0.0.0:8080/dashboard", "https://evil.example/dashboard", "//evil.example", "/\\evil.example", "javascript:alert(1)", "https://user@homezone-production.up.railway.app/dashboard", "http://[", "https://service.railway.internal/dashboard"]) {
        assert.equal(authRedirect(destination), publicOrigin);
      }
      for (const configured of ["https://0.0.0.0:8080", "https://evil.example", "http://localhost:3000"]) {
        process.env.AUTH_URL = configured;
        assert.throws(() => authRedirect("/dashboard"));
      }
      delete process.env.AUTH_URL;
      const redirect = await middleware(new NextRequest("https://0.0.0.0:8080/dashboard", {
        headers: { host: "evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" }
      }));
      assert.equal(redirect.headers.get("location"), `${publicOrigin}/auth?next=%2Fdashboard`);
      process.env.NODE_ENV = "test";
    });

    await t.test("explicit staging approval permits only the selected HTTPS origin", async () => {
      const staging = "https://staging.example.com";
      process.env.NODE_ENV = "production";
      process.env.AUTH_URL = staging;
      assert.throws(() => authOrigin());
      process.env.AUTH_STAGING_ORIGIN = staging;
      assert.equal(authOrigin(), staging);
      assert.equal(authRedirect("/dashboard?tab=saved"), `${staging}/dashboard?tab=saved`);
      assert.equal(authRedirect(`${staging}/dashboard`), `${staging}/dashboard`);
      for (const destination of ["https://homezone-production.up.railway.app/dashboard", "https://evil.example.com", "//staging.example.com/dashboard", "https://staging.example.com.evil.example.com/dashboard", "https://staging.example.com@evil.example.com/dashboard", "/\\evil.example.com", "javascript:alert(1)", "http://["]) {
        assert.equal(authRedirect(destination), staging);
      }
      const response = await middleware(new NextRequest("https://0.0.0.0:8080/dashboard", {
        headers: { host: "evil.example.com", "x-forwarded-host": "evil.example.com", "x-forwarded-proto": "http" }
      }));
      assert.equal(response.headers.get("location"), `${staging}/auth?next=%2Fdashboard`);
      passed(await middleware(request(staging, "/dashboard", await sessionCookie(staging))));
      delete process.env.AUTH_URL;
      process.env.NEXTAUTH_URL = staging;
      assert.equal(authOrigin(), staging);
      delete process.env.NEXTAUTH_URL;
      assert.equal(authOrigin(), "https://homezone-production.up.railway.app");
      assert.equal(authRedirect(`${staging}/dashboard`), "https://homezone-production.up.railway.app");
      process.env.AUTH_URL = "https://unapproved.example.com";
      assert.throws(() => authOrigin());
      delete process.env.AUTH_URL;
      delete process.env.AUTH_STAGING_ORIGIN;
      process.env.NODE_ENV = "test";
    });

    await t.test("invalid staging approval fails closed", () => {
      process.env.NODE_ENV = "production";
      for (const origin of ["", "not-a-url", "https://homezone-production.up.railway.app", "http://staging.example.com", "//staging.example.com", "https://*.example.com", "https://staging.example.com/path", "https://staging.example.com?x=1", "https://staging.example.com#fragment", "https://user:pass@staging.example.com", " https://staging.example.com", "https://staging.example.com\\", "https://staging.example.com/%2f", "https://localhost", "https://127.0.0.1", "https://0.0.0.0:8080", "https://2130706433", "https://[::1]", "https://service.railway.internal", "https://service.local", "https://bad-.example.com"]) {
        process.env.AUTH_STAGING_ORIGIN = origin;
        assert.throws(() => authOrigin());
      }
      delete process.env.AUTH_STAGING_ORIGIN;
      process.env.NODE_ENV = "test";
    });

    for (const origin of ["https://homezone-production.up.railway.app", "http://localhost:3000", "https://0.0.0.0:8080", "https://staging.example.com"]) {
      await t.test(`${new URL(origin).protocol} Auth.js sign-in and logout cookies remain compatible`, async () => {
        const expectedOrigin = origin.includes("0.0.0.0") ? "https://homezone-production.up.railway.app" : origin;
        process.env.AUTH_URL = expectedOrigin;
        if (origin === "https://staging.example.com") process.env.AUTH_STAGING_ORIGIN = origin;
        // In-memory fixture only: no production configuration imports or DB calls.
        const config = {
          secret,
          trustHost: true,
          basePath: "/api/auth",
          session: { strategy: "jwt" },
          providers: [Credentials({ id: "password", authorize: async () => ({ id: "synthetic-user", name: "Synthetic User" }) })],
          callbacks: {
            redirect: ({ url }) => authRedirect(url),
            jwt: async ({ token, user }) => user ? { ...token, ...await issueSession(user.id), role: "USER" } : token
          },
          events: { signOut: ({ token }) => revokeSession(token) }
        };
        const jar = new Map();
        function remember(response) {
          for (const header of response.headers.getSetCookie()) {
            const pair = header.split(";")[0];
            const index = pair.indexOf("=");
            const name = pair.slice(0, index);
            const value = pair.slice(index + 1);
            if (!value || /Max-Age=0/i.test(header)) jar.delete(name);
            else jar.set(name, value);
          }
        }
        const cookieHeader = () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
        const csrf = await Auth(new Request(`${origin}/api/auth/csrf`), config);
        remember(csrf);
        const { csrfToken } = await csrf.json();
        if (origin.includes("0.0.0.0")) {
          const originalBehavior = await Auth(new Request(`${origin}/api/auth/callback/password`, {
            method: "POST",
            headers: { cookie: cookieHeader(), "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ csrfToken, callbackUrl: "/dashboard" })
          }), { ...config, callbacks: { jwt: config.callbacks.jwt } });
          assert.equal(originalBehavior.headers.get("location"), "https://0.0.0.0:8080/dashboard");
        }
        const signIn = await Auth(new Request(`${origin}/api/auth/callback/password`, {
          method: "POST",
          headers: { cookie: cookieHeader(), "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ csrfToken, callbackUrl: "/dashboard" })
        }), config);
        remember(signIn);
        assert.equal(signIn.status, 302);
        assert.equal(signIn.headers.get("location"), `${expectedOrigin}/dashboard`);
        assert.ok(jar.has(cookieName(origin)));
        passed(await middleware(request(origin, "/dashboard", cookieHeader())));
        const signOut = await Auth(new Request(`${origin}/api/auth/signout`, {
          method: "POST",
          headers: { cookie: cookieHeader(), "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ csrfToken })
        }), config);
        remember(signOut);
        assert.equal(signOut.status, 302);
        assert.equal(jar.has(cookieName(origin)), false);
        rejectedPage(await middleware(request(origin, "/dashboard", cookieHeader())), "/dashboard");
        delete process.env.AUTH_URL;
        delete process.env.AUTH_STAGING_ORIGIN;
      });
    }
  } finally {
    restoreEnv();
  }
});
