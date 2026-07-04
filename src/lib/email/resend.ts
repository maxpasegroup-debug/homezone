import { env } from "@/lib/env";

export async function sendPasswordResetEmail({
  email,
  resetUrl
}: {
  email: string;
  resetUrl: string;
}) {
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
