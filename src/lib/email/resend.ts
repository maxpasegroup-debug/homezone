import { env } from "@/lib/env";
import { z } from "zod";
import { authOrigin } from "@/lib/auth/redirect";

// Defense in depth at the actual dispatch boundary, for registration AND recovery.
// No wildcard/domain matching; missing or malformed staging policy denies sends.
function recipientAllowed(email: string) {
  try {
    authOrigin(); // Missing/conflicting production or staging origin must fail closed.
    const policy = env.STAGING_EMAIL_RECIPIENTS;
    if (process.env.AUTH_STAGING_ORIGIN === undefined && policy === undefined) return true;
    if (!policy || policy.length > 5100) return false;
    const parsed = z.array(z.string().max(254).email()).min(1).max(20)
      .safeParse(policy.split(",").map((value) => value.trim().toLowerCase()));
    return parsed.success && parsed.data.includes(email.trim().toLowerCase());
  } catch { return false; }
}

export async function sendRegistrationEmail(email: string, code: string) {
  const from = env.RESEND_FROM_EMAIL ?? env.EMAIL_FROM;
  if (!env.RESEND_API_KEY || !from || !recipientAllowed(email)) return { sent: false };
  // Only server-generated digits are interpolated; never log provider bodies.
  if (!/^\d{6}$/.test(code)) return { sent: false };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email, subject: "Verify your HOMEZONE email",
        text: `Your HOMEZONE verification code is ${code}. It expires in 10 minutes. Never share this code. If you did not request it, ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#163d32"><h1>Welcome to HOMEZONE</h1><p>Your verification code:</p><p style="font-size:28px;letter-spacing:6px">${code}</p><p>Expires in 10 minutes. Never share this code. If you did not request it, ignore this email.</p></div>` })
    });
    return { sent: response.ok };
  } catch {
    return { sent: false };
  }
}

export async function sendPasswordResetEmail({
  email,
  resetUrl
}: {
  email: string;
  resetUrl: string;
}) {
  if (!recipientAllowed(email)) return { sent: false, reason: "Email delivery is unavailable" };
  if (!env.RESEND_API_KEY) {
    return {
      reason: "RESEND_API_KEY is not configured",
      sent: false
    };
  }

  const from = env.RESEND_FROM_EMAIL ?? env.EMAIL_FROM ?? "HomeZone <noreply@homezone.ai>";
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:28px;margin-bottom:8px">Reset your HomeZone password</h1>
          <p>Use the secure link below to create a new password. This link expires in 30 minutes.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Reset Password</a></p>
          <p style="color:#6b7280;font-size:13px">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
      subject: "Reset your HomeZone password",
      to: email
    }),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return {
    reason: response.ok ? undefined : `Resend responded with ${response.status}`,
    sent: response.ok
  };
}
