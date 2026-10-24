// Registration timing is display/admission feedback, never proof of a session.
export function registrationChallenge(value: unknown, now = Date.now()) {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const ttl = data.expiresIn, delay = data.resendAfter;
  const expiry = typeof data.expiresAt === "string" ? Date.parse(data.expiresAt) : NaN;
  const resend = typeof data.resendAt === "string" ? Date.parse(data.resendAt) : NaN;
  if (typeof data.challengeId !== "string" || !/^[a-f0-9]{64}$/.test(data.challengeId) ||
      typeof ttl !== "number" || !Number.isInteger(ttl) || ttl < 1 || ttl > 600 ||
      typeof delay !== "number" || !Number.isInteger(delay) || delay < 0 || delay > 86400 ||
      !Number.isFinite(expiry) || !Number.isFinite(resend) || !Number.isFinite(now)) return null;
  return { challengeId: data.challengeId, expiresAt: Math.min(expiry, now + ttl * 1000),
    resendAt: Math.max(resend, now + delay * 1000) };
}

export function registrationRetry(value: string | null, now = Date.now()) {
  if (!value || !/^[1-9][0-9]*$/.test(value) || !Number.isFinite(now)) return null;
  const seconds = Number(value);
  // An unrepresentable/unexpected delay must disable automatic retry, not shorten it.
  return Number.isSafeInteger(seconds) && seconds <= 86400 ? now + seconds * 1000 : null;
}
