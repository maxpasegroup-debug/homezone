import { createHmac, randomBytes } from "node:crypto";

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

let limiter: ReturnType<typeof createPasswordSigninLimiter> | undefined;
export function allowPasswordSignin(identifier: string) {
  try {
    limiter ??= createPasswordSigninLimiter(passwordSigninPolicy(process.env));
    return limiter.allow(identifier);
  } catch {
    return false; // Configuration/storage failure must not bypass admission.
  }
}
