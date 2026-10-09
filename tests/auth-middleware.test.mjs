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

// Requires Node 22.15+ for registerHooks (the project currently uses Node 24).
// Execute the real TypeScript middleware with the installed libraries. Node
// needs the Next.js extension and the one path alias resolved explicitly.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/auth/roles") {
      return { url: new URL("../src/lib/auth/roles.ts", import.meta.url).href, shortCircuit: true };
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
hooks.deregister();

const secret = randomBytes(32).toString("hex");
const originalEnv = Object.fromEntries(
  ["AUTH_SECRET", "AUTH_URL", "NEXTAUTH_URL"].map((key) => [key, process.env[key]])
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
  const value = await encode({ token: { id, role }, secret: signingSecret, salt: name, maxAge });
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
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
  try {
    for (const origin of ["https://homezone.example", "http://localhost:3000"]) {
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

    await t.test("HTTPS rejects the HTTP cookie name", async () => {
      rejectedPage(await middleware(request("https://homezone.example", "/dashboard", await sessionCookie("http://localhost:3000"))), "/dashboard");
    });

    await t.test("canonical auth URL controls cookie naming behind an HTTP proxy", async () => {
      process.env.NEXTAUTH_URL = "https://homezone.example";
      const cookie = await sessionCookie(process.env.NEXTAUTH_URL);
      passed(await middleware(request("http://internal:3000", "/dashboard", cookie)));
      process.env.AUTH_URL = "http://localhost:3000";
      passed(await middleware(request("https://homezone.example", "/dashboard", await sessionCookie(process.env.AUTH_URL))));
      delete process.env.AUTH_URL;
      delete process.env.NEXTAUTH_URL;
    });

    await t.test("chunked HTTPS session cookies are recognized", async () => {
      const cookie = await sessionCookie("https://homezone.example");
      const [name, value] = cookie.split("=");
      const midpoint = Math.floor(value.length / 2);
      passed(await middleware(request("https://homezone.example", "/dashboard", `${name}.0=${value.slice(0, midpoint)}; ${name}.1=${value.slice(midpoint)}`)));
    });

    for (const origin of ["https://homezone.example", "http://localhost:3000"]) {
      await t.test(`${new URL(origin).protocol} Auth.js sign-in and logout cookies remain compatible`, async () => {
        // In-memory fixture only: no production configuration imports or DB calls.
        const config = {
          secret,
          trustHost: true,
          basePath: "/api/auth",
          session: { strategy: "jwt" },
          providers: [Credentials({ id: "password", authorize: async () => ({ id: "synthetic-user", name: "Synthetic User" }) })],
          callbacks: { jwt: async ({ token, user }) => user ? { ...token, id: user.id, role: "USER" } : token }
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
        const signIn = await Auth(new Request(`${origin}/api/auth/callback/password`, {
          method: "POST",
          headers: { cookie: cookieHeader(), "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ csrfToken, callbackUrl: `${origin}/dashboard` })
        }), config);
        remember(signIn);
        assert.equal(signIn.status, 302);
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
      });
    }
  } finally {
    restoreEnv();
  }
});
