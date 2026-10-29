import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { passwordSignUpSchema } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { authOrigin } from "@/lib/auth/redirect";
import { AdmissionDenied, boundedJson, budgets } from "@/lib/auth/registration-admission";
import { logger } from "@/lib/logging/logger";

const HOUR = 3_600_000;
const prefix = "web-registration:v1:";
const signup = passwordSignUpSchema.extend({
  email: z.string().trim().toLowerCase().max(254).email(),
  name: z.string().trim().min(2).max(120)
}).strict();
const acknowledgment = { message: "Continue with secure sign-in." };
function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Only the User email constraints represent a harmless concurrent duplicate.
// Never swallow an unrelated profile/credential constraint or storage failure.
function duplicateEmail(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const target = error.meta?.target;
  return error.meta?.modelName === "User" &&
    ((Array.isArray(target) && target.length === 1 &&
        ["email", "User_email_key", "User_email_normalized_key", "lower(email)"].includes(String(target[0]))) ||
      target === "User_email_key" || target === "User_email_normalized_key");
}

export async function webRegistration(request: Request) {
  let stage = "origin";
  let requestBlockedUntil = 0;
  try {
    if (request.headers.get("origin") !== authOrigin() ||
        request.headers.get("sec-fetch-site") === "cross-site") {
      return reply({ error: "Request not permitted." }, 403);
    }
    stage = "request-admission";
    const requestClaims = await db.$transaction((tx) => budgets(tx, [
      { key: `${prefix}requests`, max: 5000, duration: HOUR }
    ]));
    requestBlockedUntil = Math.max(0, ...requestClaims.filter((claim) => claim.count >= claim.max).map((claim) => claim.resetAt.getTime()));
    stage = "validation";
    const parsed = signup.safeParse(await boundedJson(request));
    if (!parsed.success) return reply({ error: "Check name, email and password requirements." }, 400);
    const { email, name, password } = parsed.data;
    stage = "attempt-admission";
    // Reuse the already required shared sign-in HMAC secret with purpose separation.
    // No email/OTP provider dependency and no raw email in quota keys.
    const secret = process.env.PASSWORD_SIGNIN_HMAC_KEY;
    if (!secret || secret.length < 32 || secret.length > 256) throw new Error("Unavailable");
    const key = prefix + createHmac("sha256", secret).update(`account:${email}`).digest("hex");
    await db.$transaction(async (tx) => {
      await budgets(tx, [
        { key: `${prefix}attempts`, max: 100, duration: HOUR },
        { key: `${key}:hour`, max: 3, duration: HOUR },
        { key: `${key}:cooldown`, max: 1, duration: 60_000 }
      ]);
      // Only this namespace, bounded, expired enforcement state only.
      const cutoff = new Date(Date.now() - HOUR);
      const expired = await tx.registrationBudget.findMany({
        where: { key: { startsWith: prefix }, resetAt: { lt: cutoff } }, select: { key: true }, take: 100
      });
      if (expired.length) await tx.registrationBudget.deleteMany({
        where: { key: { in: expired.map((row) => row.key) }, resetAt: { lt: cutoff } }
      });
    });
    stage = "password-hash";
    const passwordHash = await hashPassword(password);
    stage = "account-create";
    try {
      await db.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } }, select: { id: true }
        });
        if (existing) return;
        await tx.user.create({ data: {
          email, name, emailVerified: null,
          passwordCredential: { create: { passwordHash } },
          profile: { create: { fullName: name, role: "USER" } }
        } });
      });
    } catch (error) {
      if (!duplicateEmail(error)) throw error;
    }
    return reply(acknowledgment);
  } catch (error) {
    if (error instanceof AdmissionDenied) {
      const seconds = Math.max(1, Math.ceil((Math.max(error.until.getTime(), requestBlockedUntil) - Date.now()) / 1000));
      return Response.json({ error: "Too many attempts. Please try later.", retryAfterSeconds: seconds }, {
        status: 429, headers: { "Retry-After": String(seconds), "Cache-Control": "no-store" }
      });
    }
    if (error instanceof SyntaxError) return reply({ error: "Invalid registration request." }, 400);
    // Fixed labels only: never serialize the exception, request or account data.
    logger.error("Web registration unavailable", { stage });
    return reply({ error: "Registration is temporarily unavailable." }, 503);
  }
}
