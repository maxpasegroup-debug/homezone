import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

const globalKey = "mobile-pin:v1:global";
const accountPrefix = "mobile-pin:v1:account:";

function validBudget(row: { key: string; count: number; resetAt: Date }, key: string) {
  if (row.key !== key || !Number.isSafeInteger(row.count) || row.count < 0 ||
      !(row.resetAt instanceof Date) || !Number.isFinite(row.resetAt.getTime())) {
    throw new Error("Admission unavailable");
  }
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

/** Shared admission counts ALL attempts (including successful ones); it never
 * resets on success. Fixed windows provide temporary protection, not permanent
 * lockout. The global row serializes replicas; only expired rows can be removed.
 */
export async function admitMobilePinLogin(normalizedMobile: string | null): Promise<boolean> {
  try {
    const secret = process.env.MOBILE_PIN_RATE_LIMIT_KEY;
    if (!secret || secret.length < 32 || secret.length > 256 || secret.trim() !== secret) return false;
    const policy = mobilePinPolicy(process.env);
    const key = accountPrefix + createHmac("sha256", secret)
      .update(`homezone:mobile-pin:admission:v1:${normalizedMobile ?? "invalid"}`).digest("hex");
    return await db.$transaction(async tx => {
      let total = await tx.mobilePinLoginBudget.upsert({ where: { key: globalKey },
        create: { key: globalKey, count: 0, resetAt: new Date(0) },
        update: { count: { increment: 0 } } });
      validBudget(total, globalKey);
      const [time] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
      if (!(time?.now instanceof Date) || !Number.isFinite(time.now.getTime())) throw new Error("Admission unavailable");
      const now = time.now;
      if (total.resetAt <= now) total = await tx.mobilePinLoginBudget.update({ where: { key: globalKey },
        data: { count: 0, resetAt: new Date(now.getTime() + policy.globalWindowMs) } });
      if (total.count >= policy.globalAttempts) return false;
      await tx.mobilePinLoginBudget.update({ where: { key: globalKey }, data: { count: { increment: 1 } } });
      const expired = await tx.mobilePinLoginBudget.findMany({ where: { key: { startsWith: accountPrefix }, resetAt: { lte: now } },
        select: { key: true }, take: 100 });
      if (expired.length) await tx.mobilePinLoginBudget.deleteMany({ where: { key: { in: expired.map(row => row.key) }, resetAt: { lte: now } } });
      let account = await tx.mobilePinLoginBudget.findUnique({ where: { key } });
      if (account) validBudget(account, key);
      if (!account || account.resetAt <= now) {
        const live = await tx.mobilePinLoginBudget.count({ where: { key: { startsWith: accountPrefix }, resetAt: { gt: now } } });
        if (!Number.isSafeInteger(live) || live < 0) throw new Error("Admission unavailable");
        if (live >= policy.maxAccounts) return false;
        account = await tx.mobilePinLoginBudget.upsert({ where: { key },
          create: { key, count: 0, resetAt: new Date(now.getTime() + policy.accountWindowMs) },
          update: { count: 0, resetAt: new Date(now.getTime() + policy.accountWindowMs) } });
      }
      if (account.count >= policy.accountAttempts) return false;
      await tx.mobilePinLoginBudget.update({ where: { key }, data: { count: { increment: 1 } } });
      return true;
    }, { maxWait: 2000, timeout: 3000 });
  } catch { return false; } // No process-local or unthrottled fallback.
}
