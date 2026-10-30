import { normalizeMobileNumber, isMobilePin } from "@/lib/auth/mobile-number";
import { verifyMobilePin } from "@/lib/auth/mobile-pin-hash";
import { withMobilePinLogin } from "@/lib/auth/mobile-pin-admission";

const credentialSelect = {
  id: true, userId: true, pinHash: true,
  user: { select: { id: true, email: true, name: true, image: true, sessionVersion: true,
    profile: { select: { verificationStatus: true } } } },
} as const;

export async function authorizeMobilePin(credentials: Partial<Record<string, unknown>>) {
  if (process.env.AUTH_MOBILE_PIN_ENABLED !== "true") return null;
  const mobile = normalizeMobileNumber(credentials.phone);
  return withMobilePinLogin(mobile, async tx => {
    // A valid number with malformed PIN is a failure, without expensive hashing.
    if (!mobile || !isMobilePin(credentials.pin)) return null;
    const credential = await tx.mobilePinCredential.findUnique({
      where: { normalizedMobile: mobile }, select: credentialSelect,
    });
    const valid = await verifyMobilePin(credentials.pin, mobile, credential?.pinHash ?? null);
    if (!valid || !credential || !credential.user.profile || credential.user.profile.verificationStatus === "SUSPENDED") return null;
    // Recheck binding/version after expensive work; no contact-phone lookup/linking.
    const current = await tx.mobilePinCredential.findUnique({
      where: { normalizedMobile: mobile }, select: credentialSelect,
    });
    if (!current || current.id !== credential.id || current.userId !== credential.userId ||
        current.pinHash !== credential.pinHash || current.user.sessionVersion !== credential.user.sessionVersion ||
        !current.user.profile || current.user.profile.verificationStatus === "SUSPENDED") return null;
    return { id: current.user.id, email: current.user.email, name: current.user.name,
      image: current.user.image, sessionVersion: current.user.sessionVersion };
  });
}
