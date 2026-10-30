/** Region dispatch is explicit: adding a country requires its own reviewed rules.
 * This validates syntax, not allocation, reachability or number ownership.
 */
export function normalizeMobileNumber(value: unknown, region = "IN"): string | null {
  if (region !== "IN" || typeof value !== "string" || value.length > 32 ||
      /[^+0-9 ()\-]/.test(value)) return null;
  const compact = value.replace(/[ ()\-]/g, "");
  const national = compact.startsWith("+91") ? compact.slice(3)
    : compact.length === 12 && compact.startsWith("91") ? compact.slice(2) : compact;
  return national.length === 10 && /^[6-9][0-9]{9}$/.test(national) ? `+91${national}` : null;
}

export function isMobilePin(value: unknown): value is string {
  // JavaScript's $ anchor can match before a final line break: require exact length.
  return typeof value === "string" && value.length === 6 && /^[0-9]{6}$/.test(value);
}
