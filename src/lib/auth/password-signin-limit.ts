import { createHmac, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type Policy = { windowMs: number; accountAttempts: number; totalAttempts: number; maxAccounts: number };
type Bucket = { count: number; expires: number };

function integer(value: string | undefined, fallback: number, maximum: number) {
  if (value === undefined) return fallback;
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error("Invalid password sign-in limit configuration");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) throw new Error("Invalid password sign-in limit configuration");
  return parsed;
}

export function passwordSigninPolicy(values: Record<string, string | undefined>): Policy {
  return {
    windowMs: integer(values.PASSWORD_SIGNIN_WINDOW_MS, 300_000, 3_600_000),
    accountAttempts: integer(values.PASSWORD_SIGNIN_ACCOUNT_ATTEMPTS, 10, 10_000),
    totalAttempts: integer(values.PASSWORD_SIGNIN_TOTAL_ATTEMPTS, 1_000, 100_000),
    maxAccounts: integer(values.PASSWORD_SIGNIN_MAX_ACCOUNTS, 10_000, 100_000)
  };
}

/** Synchronous atomic admission in one Node process; never trusts request headers. */
export function createPasswordSigninLimiter(policy: Policy, clock = Date.now) {
  if (Object.values(policy).some((v) => !Number.isSafeInteger(v) || v <= 0)) {
    throw new Error("Invalid password sign-in limit configuration");
  }
  const accounts = new Map<string, Bucket>();
  const salt = randomBytes(32);
  let total: Bucket = { count: 0, expires: 0 };
  return {
    allow(identifier: string) {
      const now = clock();
      if (!Number.isFinite(now)) return false;
      for (const [key, bucket] of accounts) if (bucket.expires <= now) accounts.delete(key);
      if (total.expires <= now) total = { count: 0, expires: now + policy.windowMs };
      if (total.count >= policy.totalAttempts) return false;
      total.count++;
      const key = createHmac("sha256", salt).update(identifier.trim().toLowerCase()).digest("hex");
      let bucket = accounts.get(key);
      if (!bucket) {
        // Never evict a live bucket: eviction would allow limit bypass.
        if (accounts.size >= policy.maxAccounts) return false;
        bucket = { count: 0, expires: now + policy.windowMs };
        accounts.set(key, bucket);
      }
      if (bucket.count >= policy.accountAttempts) return false;
      bucket.count++;
      return true;
    }
  };
}

const globalKey = "password-signin:v1:global";
const accountPrefix = "password-signin:v1:account:";

/** Existing PostgreSQL counter table; one global row serializes admission/capacity.
 * Never accepts client headers. Database time is sampled AFTER acquiring the lock.
 * Returning false commits aggregate consumption; storage errors roll back and deny.
 */
export function createSharedPasswordSigninLimiter(store: Pick<PrismaClient, "$transaction">, policy: Policy, secret: string) {
  if (Object.values(policy).some((v) => !Number.isSafeInteger(v) || v <= 0) ||
      typeof secret !== "string" || secret.length < 32 || secret.length > 256) throw new Error("Invalid shared sign-in configuration");
  function valid(row: { key: string; count: number; resetAt: Date }, key: string) {
    if (!row || row.key !== key || !Number.isSafeInteger(row.count) || row.count < 0 ||
        !(row.resetAt instanceof Date) || !Number.isFinite(row.resetAt.getTime())) throw new Error("Shared sign-in unavailable");
  }
  return {
    async allow(identifier: string): Promise<boolean> {
      try {
        const key = accountPrefix + createHmac("sha256", secret).update(identifier.trim().toLowerCase()).digest("hex");
        return await store.$transaction(async (tx) => {
          let total = await tx.registrationBudget.upsert({ where: { key: globalKey },
            create: { key: globalKey, count: 0, resetAt: new Date(0) }, update: { count: { increment: 0 } } });
          valid(total, globalKey);
          const [time] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
          if (!(time?.now instanceof Date) || !Number.isFinite(time.now.getTime())) throw new Error("Shared sign-in unavailable");
          const now = time.now, resetAt = new Date(now.getTime() + policy.windowMs);
          if (total.resetAt <= now) total = await tx.registrationBudget.update({ where: { key: globalKey }, data: { count: 0, resetAt } });
          if (total.count >= policy.totalAttempts) return false;
          await tx.registrationBudget.update({ where: { key: globalKey }, data: { count: { increment: 1 } } });
          // Bounded physical cleanup; live capacity is independently counted below.
          const expired = await tx.registrationBudget.findMany({ where: { key: { startsWith: accountPrefix }, resetAt: { lte: now } }, select: { key: true }, take: 100 });
          if (expired.length) await tx.registrationBudget.deleteMany({ where: { key: { in: expired.map((v) => v.key) }, resetAt: { lte: now } } });
          let account = await tx.registrationBudget.findUnique({ where: { key } });
          if (account) valid(account, key);
          if (!account || account.resetAt <= now) {
            const live = await tx.registrationBudget.count({ where: { key: { startsWith: accountPrefix }, resetAt: { gt: now } } });
            if (!Number.isSafeInteger(live) || live < 0) throw new Error("Shared sign-in unavailable");
            if (live >= policy.maxAccounts) return false;
            account = await tx.registrationBudget.upsert({ where: { key }, create: { key, count: 0, resetAt }, update: { count: 0, resetAt } });
            valid(account, key);
          }
          if (account.count >= policy.accountAttempts) return false;
          await tx.registrationBudget.update({ where: { key }, data: { count: { increment: 1 } } });
          return true;
        }, { maxWait: 2000, timeout: 3000 });
      } catch { return false; } // No raw storage exceptions or unrestricted fallback.
    }
  };
}

export async function allowPasswordSignin(identifier: string): Promise<boolean> {
  try {
    return await createSharedPasswordSigninLimiter(db, passwordSigninPolicy(process.env), process.env.PASSWORD_SIGNIN_HMAC_KEY ?? "").allow(identifier);
  } catch {
    return false; // Configuration/storage failure must not bypass admission.
  }
}
