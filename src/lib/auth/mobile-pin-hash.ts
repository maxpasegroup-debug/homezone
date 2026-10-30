import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { isMobilePin, normalizeMobileNumber } from "@/lib/auth/mobile-number";
import { MobilePinHashUnavailable, reportMobilePinFailure } from "@/lib/auth/mobile-pin-diagnostics";

const prefix = "scrypt:v1:n32768:r8:p1";
const format = /^scrypt:v1:n32768:r8:p1:([a-f0-9]{32}):([a-f0-9]{128})$/;
let activeDerivations = 0;

function pepper() {
  const key = process.env.MOBILE_PIN_PEPPER_V1;
  if (!key || key.length < 32 || key.length > 256 || key.trim() !== key) {
    reportMobilePinFailure("hash", "configuration");
    throw new MobilePinHashUnavailable();
  }
  return key;
}

async function derive(pin: string, mobile: string, salt: string) {
  // No unbounded in-process KDF queue. Distributed admission is enforced separately.
  if (activeDerivations >= 2) {
    reportMobilePinFailure("hash", "capacity");
    throw new MobilePinHashUnavailable();
  }
  const key = pepper();
  activeDerivations++;
  let input: Buffer | undefined;
  try {
    input = createHmac("sha256", key)
      .update(`homezone:mobile-pin:hash:v1:${mobile}:${pin}`).digest();
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(input!, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (error, result) => error ? reject(new MobilePinHashUnavailable()) : resolve(result));
    });
  } catch {
    reportMobilePinFailure("hash", "operation");
    throw new MobilePinHashUnavailable();
  } finally {
    input?.fill(0);
    activeDerivations--;
  }
}

/** Foundation helper only: callers must admit before hashing and create atomically.
 * No account creation or enrollment is exposed in this milestone.
 */
export async function hashMobilePin(pin: string, normalizedMobile: string): Promise<string> {
  if (!isMobilePin(pin) || normalizeMobileNumber(normalizedMobile) !== normalizedMobile) {
    throw new Error("Invalid mobile PIN credential");
  }
  const salt = randomBytes(16).toString("hex");
  const key = await derive(pin, normalizedMobile, salt);
  try { return `${prefix}:${salt}:${key.toString("hex")}`; }
  finally { key.fill(0); }
}

export async function verifyMobilePin(pin: string, normalizedMobile: string, storedHash: string | null) {
  if (!isMobilePin(pin) || normalizeMobileNumber(normalizedMobile) !== normalizedMobile) return false;
  // Unknown users and malformed/unsupported hashes still perform one admitted KDF.
  const match = typeof storedHash === "string" && storedHash.length <= 256 ? format.exec(storedHash) : null;
  const actual = await derive(pin, normalizedMobile, match ? match[1] : "0".repeat(32));
  const expected = match ? Buffer.from(match[2], "hex") : Buffer.alloc(64);
  try { return timingSafeEqual(actual, expected) && match !== null; }
  finally { actual.fill(0); expected.fill(0); }
}
