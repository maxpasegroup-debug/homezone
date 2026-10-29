import type { Prisma } from "@prisma/client";

export class AdmissionDenied extends Error {
  constructor(readonly until: Date) { super("Registration quota exceeded"); }
}
type BudgetSpec = { key: string; max: number; duration: number };
type BudgetClaim = BudgetSpec & { resetAt: Date; count: number };
export async function boundedJson(request: Request) {
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
export async function budgets(tx: Prisma.TransactionClient, specs: BudgetSpec[]): Promise<BudgetClaim[]> {
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
