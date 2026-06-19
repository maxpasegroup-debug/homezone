import crypto from "crypto";
import { env, isProduction } from "@/lib/env";

const OTP_LENGTH = 6;

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

export function createOtpCode() {
  const max = 10 ** OTP_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(phone: string, code: string) {
  const pepper = env.OTP_PEPPER ?? "development-only-otp-pepper";

  return crypto
    .createHash("sha256")
    .update(`${normalizePhone(phone)}:${code}:${pepper}`)
    .digest("hex");
}

export function shouldExposeOtpInResponse() {
  return !isProduction() && env.OTP_DEV_LOG_CODES === true;
}

export async function sendOtpMessage(phone: string, code: string) {
  void phone;
  void code;

  if (!env.WHATSAPP_OTP_PROVIDER || !env.WHATSAPP_OTP_API_KEY) {
    return {
      delivered: false,
      provider: "not_configured"
    };
  }

  return {
    delivered: false,
    provider: env.WHATSAPP_OTP_PROVIDER,
    reason: "provider_integration_pending"
  };
}
