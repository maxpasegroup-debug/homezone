import { db } from "@/lib/db";
import { normalizeMobileNumber, isMobilePin } from "@/lib/auth/mobile-number";
import { verifyMobilePin } from "@/lib/auth/mobile-pin-hash";
import { admitMobilePinLogin } from "@/lib/auth/mobile-pin-admission";

export async function authorizeMobilePin(credentials: Partial<Record<string, unknown>>) {
  try {
    if (process.env.AUTH_MOBILE_PIN_ENABLED !== "true") return null;
    const mobile = normalizeMobileNumber(credentials.phone);
    // Invalid shapes also consume aggregate admission, but never start a KDF.
    if (!await admitMobilePinLogin(mobile)) return null;
    if (!mobile || !isMobilePin(credentials.pin)) return null;
    const credential = await db.mobilePinCredential.findUnique({
      where: { normalizedMobile: mobile }, include: { user: { include: { profile: true } } },
    });
    const valid = await verifyMobilePin(credentials.pin, mobile, credential?.pinHash ?? null);
    if (!valid || !credential || !credential.user.profile || credential.user.profile.verificationStatus === "SUSPENDED") return null;
    // Recheck binding/version after expensive work; no contact-phone lookup/linking.
    const current = await db.mobilePinCredential.findUnique({
      where: { normalizedMobile: mobile }, include: { user: { include: { profile: true } } },
    });
    if (!current || current.id !== credential.id || current.userId !== credential.userId ||
        current.pinHash !== credential.pinHash || current.user.sessionVersion !== credential.user.sessionVersion ||
        !current.user.profile || current.user.profile.verificationStatus === "SUSPENDED") return null;
    return { id: current.user.id, email: current.user.email, name: current.user.name,
      image: current.user.image, sessionVersion: current.user.sessionVersion };
  } catch { return null; } // No credential/number/raw error diagnostics.
}
