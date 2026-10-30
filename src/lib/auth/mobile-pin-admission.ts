import { createHmac } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MobilePinHashUnavailable, reportMobilePinFailure } from "@/lib/auth/mobile-pin-diagnostics";

const globalKey = "mobile-pin:v1:global";
const accountPrefix = "mobile-pin:v2:failures:";
function validBudget(row: { key: string; count: number; resetAt: Date }, key: string) {
  if (row.key !== key || !Number.isSafeInteger(row.count) || row.count < 0 ||
      !(row.resetAt instanceof Date) || !Number.isFinite(row.resetAt.getTime())) throw new Error("Admission unavailable");
}
function integer(value: string | undefined, fallback: number, max: number) {
  if (value === undefined) return fallback;
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error("Invalid mobile PIN policy");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) throw new Error("Invalid mobile PIN policy");
  return parsed;
}
export function mobilePinPolicy(values: Record<string, string | undefined>) {
  return {
    accountWindowMs: integer(values.MOBILE_PIN_ACCOUNT_WINDOW_MS, 900_000, 86_400_000),
    accountAttempts: integer(values.MOBILE_PIN_ACCOUNT_ATTEMPTS, 5, 20),
    globalWindowMs: integer(values.MOBILE_PIN_GLOBAL_WINDOW_MS, 300_000, 3_600_000),
    globalAttempts: integer(values.MOBILE_PIN_GLOBAL_ATTEMPTS, 300, 10_000),
    maxAccounts: integer(values.MOBILE_PIN_MAX_ACCOUNTS, 10_000, 100_000),
  };
}
async function databaseTime(tx: Prisma.TransactionClient) {
  const [time] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  if (!(time?.now instanceof Date) || !Number.isFinite(time.now.getTime())) throw new Error("Admission unavailable");
  return time.now;
}

/** Aggregate counts all attempts; per-number lock spans verification so only
 * failed authentications consume the allowance, without concurrent overshoot.
 */
export async function withMobilePinLogin<T>(normalizedMobile: string | null,
  authenticate: (tx: Prisma.TransactionClient) => Promise<T | null>): Promise<T | null> {
  let policy: ReturnType<typeof mobilePinPolicy>, key: string;
  try {
    const secret = process.env.MOBILE_PIN_RATE_LIMIT_KEY;
    if (!secret || secret.length < 32 || secret.length > 256 || secret.trim() !== secret) throw new Error();
    policy = mobilePinPolicy(process.env);
    key = accountPrefix + createHmac("sha256", secret)
      .update(`homezone:mobile-pin:failures:v2:${normalizedMobile ?? "invalid"}`).digest("hex");
  } catch {
    reportMobilePinFailure("configuration", "configuration");
    return null;
  }
  try {
    const admitted = await db.$transaction(async tx => {
      let total = await tx.mobilePinLoginBudget.upsert({ where: { key: globalKey },
        create: { key: globalKey, count: 0, resetAt: new Date(0) }, update: { count: { increment: 0 } } });
      validBudget(total, globalKey);
      const now = await databaseTime(tx);
      if (total.resetAt <= now) total = await tx.mobilePinLoginBudget.update({ where: { key: globalKey },
        data: { count: 0, resetAt: new Date(now.getTime() + policy.globalWindowMs) } });
      if (total.count >= policy.globalAttempts) return false;
      await tx.mobilePinLoginBudget.update({ where: { key: globalKey }, data: { count: { increment: 1 } } });
      // Never wait for an account doing KDF work while holding the global lock.
      const expired = await tx.$queryRaw<Array<{ key: string }>>`
        SELECT "key" FROM "MobilePinLoginBudget"
        WHERE "key" LIKE ${accountPrefix + "%"} AND "resetAt" <= ${now}
        ORDER BY "resetAt", "key" LIMIT 100 FOR UPDATE SKIP LOCKED`;
      if (expired.length) await tx.mobilePinLoginBudget.deleteMany({ where: {
        key: { in: expired.map(row => row.key) }, resetAt: { lte: now } } });
      if (!normalizedMobile) return false;
      // MVCC read avoids waiting on verification's per-account row lock.
      const account = await tx.mobilePinLoginBudget.findUnique({ where: { key } });
      if (account) { validBudget(account, key); return true; }
      const count = await tx.mobilePinLoginBudget.count({ where: { key: { startsWith: accountPrefix } } });
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("Admission unavailable");
      if (count >= policy.maxAccounts) return false;
      await tx.mobilePinLoginBudget.create({ data: { key, count: 0,
        resetAt: new Date(now.getTime() + policy.accountWindowMs) } });
      return true;
    }, { maxWait: 2000, timeout: 3000 });
    if (!admitted) return null;
  } catch {
    reportMobilePinFailure("admission", "storage");
    return null;
  }
  try {
    return await db.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{ key: string }>>`
        SELECT "key" FROM "MobilePinLoginBudget" WHERE "key" = ${key} FOR UPDATE`;
      // Cleanup may win between stages: deny, never recreate outside capacity lock.
      if (rows.length !== 1) return null;
      const account = await tx.mobilePinLoginBudget.findUnique({ where: { key } });
      if (!account) return null;
      validBudget(account, key);
      const now = await databaseTime(tx);
      if (account.resetAt > now && account.count >= policy.accountAttempts) return null;
      const result = await authenticate(tx);
      const finished = await databaseTime(tx);
      if (result !== null) {
        // Success never increments failures or erases unexpired failures.
        if (account.resetAt <= finished) await tx.mobilePinLoginBudget.update({ where: { key },
          data: { count: 0, resetAt: new Date(finished.getTime() + policy.accountWindowMs) } });
        return result;
      }
      const fresh = account.count === 0 || account.resetAt <= finished;
      await tx.mobilePinLoginBudget.update({ where: { key }, data: {
        count: fresh ? 1 : account.count + 1,
        resetAt: fresh ? new Date(finished.getTime() + policy.accountWindowMs) : account.resetAt,
      } });
      return null;
    }, { maxWait: 2000, timeout: 10_000 });
  } catch (error) {
    // Operational failure rolls back the failure counter, not aggregate admission.
    if (!(error instanceof MobilePinHashUnavailable)) reportMobilePinFailure("authentication", "storage");
    return null;
  }
}
