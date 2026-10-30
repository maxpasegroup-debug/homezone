type Stage = "configuration" | "admission" | "authentication" | "hash";
type Category = "configuration" | "storage" | "capacity" | "operation";
const last = new Map<string, number>();

/** Fixed labels only; never accept raw errors, identifiers or request metadata.
 * Local log suppression is not authentication enforcement.
 */
export function reportMobilePinFailure(stage: Stage, category: Category) {
  const key = `${stage}:${category}`, now = Date.now();
  if (last.has(key) && now - last.get(key)! < 60_000) return;
  last.set(key, now);
  try { console.warn("HOMEZONE mobile PIN unavailable", { stage, category }); }
  catch { /* Diagnostics must not change authentication behavior. */ }
}

export class MobilePinHashUnavailable extends Error {
  constructor() { super("Mobile PIN unavailable"); }
}
