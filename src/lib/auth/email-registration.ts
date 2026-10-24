import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
import { sendRegistrationEmail } from "@/lib/email/resend";
import { passwordSignUpSchema } from "@/lib/api/validation";
import { authOrigin } from "@/lib/auth/redirect";

const HOUR = 3_600_000;
const TTL = 600_000;
const idSchema = z.string().regex(/^[a-f0-9]{64}$/);
const signup = passwordSignUpSchema.extend({ email: z.string().trim().toLowerCase().max(254).email(), name: z.string().trim().min(2).max(120) }).strict();
const verification = z.object({ challengeId: idSchema, code: z.string().regex(/^\d{6}$/) }).strict();
const resend = z.object({ challengeId: idSchema }).strict();
class AdmissionDenied extends Error {
  constructor(readonly until: Date) { super("Registration quota exceeded"); }
}
type BudgetSpec = { key: string; max: number; duration: number };
type BudgetClaim = BudgetSpec & { resetAt: Date; count: number };
function digest(value: string) {
  if (!env.OTP_PEPPER || env.OTP_PEPPER.length < 32) throw new Error("Registration unavailable");
  return createHmac("sha256", env.OTP_PEPPER).update(`homezone:email-registration:v1:${value}`).digest("hex");
}
function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
async function boundedJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new SyntaxError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) { await reader.cancel(); throw new SyntaxError(); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}
// A no-op increment takes the row lock even when exhausted. Inspect ALL supplied
// constraints in a fixed order and roll back every increment if any one denies.
async function budgets(tx: Prisma.TransactionClient, specs: BudgetSpec[]): Promise<BudgetClaim[]> {
  const claims: BudgetClaim[] = [];
  let blockedUntil = 0;
  for (const spec of specs) {
    let row = await tx.registrationBudget.upsert({ where: { key: spec.key },
      create: { key: spec.key, count: 0, resetAt: new Date(Date.now() + spec.duration) },
      update: { count: { increment: 0 } } });
    if (!row || row.key !== spec.key || !Number.isSafeInteger(row.count) || row.count < 0 ||
        !(row.resetAt instanceof Date) || !Number.isFinite(row.resetAt.getTime())) {
      throw new Error("Registration quota unavailable");
    }
    const now = new Date(); // Re-evaluate after waiting for the row lock.
    if (row.resetAt <= now) {
      const resetAt = new Date(now.getTime() + spec.duration);
      const reset = await tx.registrationBudget.updateMany({ where: { key: spec.key, resetAt: { lte: now } }, data: { count: 0, resetAt } });
      if (reset.count !== 1) throw new Error("Registration quota unavailable");
      row = { ...row, count: 0, resetAt };
    }
    if (row.count >= spec.max) {
      blockedUntil = Math.max(blockedUntil, row.resetAt.getTime());
    } else {
      const admitted = await tx.registrationBudget.updateMany({ where: { key: spec.key, count: { lt: spec.max }, resetAt: { gt: now } }, data: { count: { increment: 1 } } });
      if (admitted.count !== 1) throw new Error("Registration quota unavailable");
      row = { ...row, count: row.count + 1 };
    }
    claims.push({ ...spec, count: row.count, resetAt: row.resetAt });
  }
  if (blockedUntil) throw new AdmissionDenied(new Date(blockedUntil));
  return claims;
}
async function admitDelivery(email: string) {
  const key = digest(`budget:${email}`);
  return db.$transaction(async (tx) => {
    const claims = await budgets(tx, [
      { key: "registration:delivery", max: 100, duration: HOUR },
      { key: `${key}:hour`, max: 3, duration: HOUR },
      { key: `${key}:cooldown`, max: 1, duration: 60_000 }
    ]);
    const now = new Date();
    // Bounded cleanup; never evict live enforcement state.
    // Password admission owns database-time expiry under its global lock. Never
    // erase its rows using this registration cleanup's application-clock cutoff.
    const excludePassword = { key: { startsWith: "password-signin:" } };
    const expired = await tx.registrationBudget.findMany({ where: { NOT: excludePassword, resetAt: { lt: new Date(now.getTime() - HOUR) } }, select: { key: true }, take: 100 });
    if (expired.length) await tx.registrationBudget.deleteMany({ where: { NOT: excludePassword, key: { in: expired.map((v) => v.key) }, resetAt: { lt: now } } });
    const old = await tx.emailRegistration.findMany({ where: { expiresAt: { lt: now } }, select: { id: true }, take: 100 });
    if (old.length) await tx.emailRegistration.deleteMany({ where: { id: { in: old.map((v) => v.id) }, expiresAt: { lt: now } } });
    return claims;
  });
}
function restart() {
  return reply({ error: "Registration challenge unavailable. Please restart registration.", restartRequired: true }, 400);
}

export async function registrationRequest(request: Request, action: "start" | "resend" | "verify") {
  let requestBlockedUntil = 0;
  try {
    const origin = request.headers.get("origin");
    if ((origin && origin !== authOrigin()) || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Request not permitted." }, 403);
    if (!env.RESEND_API_KEY || !(env.RESEND_FROM_EMAIL || env.EMAIL_FROM) || !env.OTP_PEPPER || env.OTP_PEPPER.length < 32) return reply({ error: "Registration is temporarily unavailable." }, 503);
    // Fixed-cardinality shared admission, including malformed/unknown IDs, BEFORE
    // parsing identifiers or looking up pending credentials. Not a trusted-IP limit.
    const requestClaims = await db.$transaction((tx) => budgets(tx, [{ key: "registration:requests", max: 5000, duration: HOUR }]));
    requestBlockedUntil = Math.max(0, ...requestClaims.filter((v) => v.count >= v.max).map((v) => v.resetAt.getTime()));
    const input = await boundedJson(request);
    const now = new Date();
    if (action === "verify") {
      const parsed = verification.safeParse(input);
      if (!parsed.success) return reply({ error: "Enter a valid verification code." }, 400);
      const { challengeId, code } = parsed.data;
      await db.$transaction((tx) => budgets(tx, [{ key: "registration:verification", max: 1000, duration: HOUR }]));
      const verified = await db.$transaction(async (tx) => {
        // Count and lock BEFORE comparing: concurrent wrong guesses share one bound.
        const attempt = await tx.emailRegistration.updateMany({ where: { id: challengeId, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
        if (attempt.count !== 1) return false;
        const pending = await tx.emailRegistration.findUnique({ where: { id: challengeId } });
        if (!pending || pending.expiresAt <= new Date()) return false;
        const expected = digest(`${pending.id}:${pending.email}:${code}`);
        if (!/^[a-f0-9]{64}$/.test(pending.codeHash) || !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(pending.codeHash, "hex"))) return false;
        const claimed = await tx.emailRegistration.updateMany({ where: { id: challengeId, consumedAt: null, codeHash: expected, expiresAt: { gt: new Date() } }, data: { consumedAt: now, passwordHash: "", codeHash: "" } });
        if (claimed.count !== 1) return false;
        const existing = await tx.user.findFirst({ where: { email: { equals: pending.email, mode: "insensitive" } }, select: { id: true } });
        if (!existing) await tx.user.create({ data: { email: pending.email, emailVerified: now, name: pending.name,
          passwordCredential: { create: { passwordHash: pending.passwordHash } }, profile: { create: { fullName: pending.name, role: "USER" } } } });
        // Existing accounts are never overwritten or privilege-changed.
        return true;
      });
      return verified ? reply({ verified: true }) : reply({ error: "Code invalid, expired or already used. Request a new code." }, 400);
    }
    let email: string, name: string, passwordHash: string;
    let previous: { id: string; codeHash: string } | undefined;
    let deliveryClaims: BudgetClaim[];
    if (action === "start") {
      const parsed = signup.safeParse(input);
      if (!parsed.success) return reply({ error: "Check name, email and password requirements." }, 400);
      ({ email, name } = parsed.data);
      deliveryClaims = await admitDelivery(email);
      passwordHash = await hashPassword(parsed.data.password);
    } else {
      const parsed = resend.safeParse(input);
      if (!parsed.success) return restart();
      const pending = await db.emailRegistration.findUnique({ where: { id: parsed.data.challengeId } });
      if (!pending || pending.consumedAt || pending.expiresAt <= new Date()) return restart();
      ({ email, name, passwordHash } = pending);
      previous = { id: pending.id, codeHash: pending.codeHash };
      deliveryClaims = await admitDelivery(email);
    }
    const id = randomBytes(32).toString("hex");
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = digest(`${id}:${email}:${code}`);
    const expiresAt = new Date(Date.now() + TTL);
    const issued = await db.$transaction(async (tx) => {
      // Bind publication to THIS delivery admission, even if hashing was delayed.
      // A later admission changes the cooldown deadline and revokes this grant.
      const grant = deliveryClaims[2];
      const owned = await tx.registrationBudget.updateMany({ where: { key: grant.key, resetAt: grant.resetAt, count: { gt: 0 } }, data: { count: { increment: 0 } } });
      if (owned.count !== 1) return false;
      if (previous) {
        const changed = await tx.emailRegistration.updateMany({ where: { id: previous.id, codeHash: previous.codeHash,
          consumedAt: null, expiresAt: { gt: new Date() } },
          data: { id, codeHash, expiresAt, attempts: 0, createdAt: new Date() } });
        return changed.count === 1;
      }
      await tx.emailRegistration.upsert({ where: { email }, create: { id, email, name, passwordHash, codeHash, expiresAt },
        update: { id, name, passwordHash, codeHash, expiresAt, attempts: 0, consumedAt: null, createdAt: new Date() } });
      return true;
    });
    if (!issued) return restart();
    // Do not dispatch a code already superseded/consumed before delivery starts.
    const current = await db.emailRegistration.findUnique({ where: { id } });
    if (!current || current.consumedAt || current.codeHash !== codeHash || current.expiresAt <= new Date()) return restart();
    if (!(await sendRegistrationEmail(email, code)).sent) {
      await db.emailRegistration.deleteMany({ where: { id, codeHash } });
      return reply({ error: "Email delivery could not be confirmed. Please restart registration after the cooldown.", restartRequired: true }, 503);
    }
    const delivered = await db.emailRegistration.findUnique({ where: { id } });
    if (!delivered || delivered.consumedAt || delivered.codeHash !== codeHash || expiresAt.getTime() <= Date.now()) return restart();
    const resendAt = new Date(Math.max(...[...requestClaims, ...deliveryClaims].filter((v) => v.count >= v.max).map((v) => v.resetAt.getTime())));
    return reply({ challengeId: id, expiresAt: expiresAt.toISOString(), expiresIn: Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
      resendAt: resendAt.toISOString(), resendAfter: Math.max(0, Math.ceil((resendAt.getTime() - Date.now()) / 1000)),
      message: "Check your email for a verification code. Existing accounts can use sign-in or password recovery." }, 202);
  } catch (error) {
    if (error instanceof AdmissionDenied) {
      const seconds = Math.max(1, Math.ceil((Math.max(error.until.getTime(), requestBlockedUntil) - Date.now()) / 1000));
      return Response.json({ error: "Too many attempts. Please try later.", retryAfterSeconds: seconds },
        { status: 429, headers: { "Retry-After": String(seconds), "Cache-Control": "no-store" } });
    }
    if (error instanceof SyntaxError) return reply({ error: "Invalid registration request." }, 400);
    // Database/provider errors may contain personal data: never propagate/log them.
    return reply({ error: "Registration is temporarily unavailable." }, 503);
  }
}
