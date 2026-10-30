import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { db } from "@/lib/db";
import { authOrigin } from "@/lib/auth/redirect";
import { boundedJson } from "@/lib/auth/registration-admission";
import { normalizeMobileNumber, isMobilePin } from "@/lib/auth/mobile-number";
import { hashMobilePin } from "@/lib/auth/mobile-pin-hash";
import { reportMobilePinFailure } from "@/lib/auth/mobile-pin-diagnostics";

const hour = 3_600_000;
const prefix = "mobile-pin:registration:v1:";
const inputSchema = z.object({ mobileNumber: z.string().max(32),
  pin: z.string().refine(isMobilePin), confirmPin: z.string().refine(isMobilePin),
  role: z.enum(["USER", "OWNER", "BROKER", "BUILDER", "SERVICE_PROVIDER"]),
}).strict().refine(value => value.pin === value.confirmPin);
const acknowledgment = { message: "Registration submitted. Sign in with your mobile number and PIN." };
function reply(body: object, status = 200, retry?: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store",
    ...(retry ? { "Retry-After": String(retry) } : {}) } });
}
function limit(name: string, fallback: number, maximum: number) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > maximum) throw new Error();
  return Number(raw);
}

// One fixed global lock orders all registration budget changes. No hashes or
// account creation inside this short transaction; login budgets remain separate.
async function admit(specs: Array<{ key: string; max: number }>): Promise<number | null> {
  return db.$transaction(async tx => {
    await tx.mobilePinLoginBudget.upsert({ where: { key: prefix + "lock" },
      create: { key: prefix + "lock", count: 0, resetAt: new Date(0) }, update: { count: { increment: 0 } } });
    const [time] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    const now = time?.now;
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error();
    // Fixed-cardinality request/attempt rows aren't deleted. Bounded expired identifier cleanup.
    const expired = await tx.mobilePinLoginBudget.findMany({ where: {
      key: { startsWith: prefix + "identity:" }, resetAt: { lte: now } }, select: { key: true }, take: 100 });
    if (expired.length) await tx.mobilePinLoginBudget.deleteMany({ where: {
      key: { in: expired.map(row => row.key) }, resetAt: { lte: now } } });
    const claims = [];
    for (const spec of specs) {
      let row = await tx.mobilePinLoginBudget.upsert({ where: { key: spec.key },
        create: { key: spec.key, count: 0, resetAt: new Date(now.getTime() + hour) },
        update: { count: { increment: 0 } } });
      if (!Number.isSafeInteger(row.count) || row.count < 0 || !(row.resetAt instanceof Date) || !Number.isFinite(row.resetAt.getTime())) throw new Error();
      if (row.resetAt <= now) row = await tx.mobilePinLoginBudget.update({ where: { key: spec.key },
        data: { count: 0, resetAt: new Date(now.getTime() + hour) } });
      claims.push({ ...row, max: spec.max });
    }
    const blocked = claims.filter(row => row.count >= row.max);
    if (blocked.length) return Math.max(...blocked.map(row => Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000))));
    for (const row of claims) await tx.mobilePinLoginBudget.update({ where: { key: row.key }, data: { count: { increment: 1 } } });
    return null;
  }, { maxWait: 2000, timeout: 3000 });
}

export async function mobilePinRegistration(request: Request) {
  let stage: "configuration" | "admission" | "authentication" | "hash" = "configuration";
  try {
    const origin = request.headers.get("origin");
    if ((origin !== null && origin !== authOrigin()) || request.headers.get("sec-fetch-site") === "cross-site") {
      return reply({ error: "Request not permitted." }, 403);
    }
    if (process.env.AUTH_MOBILE_PIN_ENABLED !== "true") return reply({ error: "Registration is unavailable." }, 503);
    const secret = process.env.MOBILE_PIN_RATE_LIMIT_KEY;
    const pepper = process.env.MOBILE_PIN_PEPPER_V1;
    if (!secret || secret.length < 32 || secret.length > 256 || secret.trim() !== secret ||
        !pepper || pepper.length < 32 || pepper.length > 256 || pepper.trim() !== pepper) throw new Error();
    const requests = limit("MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR", 5000, 10000);
    const attempts = limit("MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR", 100, 1000);
    const perMobile = limit("MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR", 3, 10);
    const perIp = limit("MOBILE_PIN_REGISTRATION_IP_PER_HOUR", 10, 100);
    // Owner must explicitly select an ingress-overwritten single-IP header.
    // Without approved proxy configuration all requests share one conservative bucket.
    const header = process.env.MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER;
    let ip = "unverified-ingress";
    if (header !== undefined) {
      if (!["x-real-ip", "x-forwarded-for"].includes(header)) throw new Error();
      const raw = request.headers.get(header)?.trim();
      if (!raw || raw.length > 64 || !isIP(raw)) throw new Error();
      ip = raw;
    }
    const digest = (purpose: string, value: string) => createHmac("sha256", secret)
      .update(`homezone:mobile-pin:registration:v1:${purpose}:${value}`).digest("hex");
    stage = "admission";
    const rawWait = await admit([{ key: prefix + "requests", max: requests }]);
    if (rawWait) return reply({ error: "Too many attempts. Please try later." }, 429, rawWait);
    let input;
    try { input = inputSchema.safeParse(await boundedJson(request)); }
    catch { return reply({ error: "Enter a valid mobile number and matching six-digit PINs." }, 400); }
    const mobile = input.success ? normalizeMobileNumber(input.data.mobileNumber) : null;
    if (!input.success || !mobile) return reply({ error: "Enter a valid mobile number and matching six-digit PINs." }, 400);
    const wait = await admit([
      { key: prefix + "attempts", max: attempts },
      { key: prefix + "identity:ip:" + digest("ip", ip), max: perIp },
      { key: prefix + "identity:mobile:" + digest("mobile", mobile), max: perMobile },
    ]);
    if (wait) return reply({ error: "Too many attempts. Please try later." }, 429, wait);
    stage = "hash";
    const pinHash = await hashMobilePin(input.data.pin, mobile);
    stage = "authentication";
    await db.$transaction(async tx => {
      if (await tx.mobilePinCredential.findUnique({ where: { normalizedMobile: mobile }, select: { id: true } })) return;
      // Existing contact-only accounts aren't enrolled or merged by public signup.
      const national = mobile.slice(3);
      const collisions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Profile" WHERE regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g')
        IN (${national}, ${"91" + national}, ${"0" + national}, ${"0091" + national}) LIMIT 1`;
      if (collisions.length) return;
      await tx.user.create({ data: { emailVerified: null,
        profile: { create: { role: input.data.role, whatsappVerified: false, verificationStatus: "PENDING" } },
        mobilePinCredential: { create: { normalizedMobile: mobile, pinHash } },
      } });
    });
    return reply(acknowledgment);
  } catch (error) {
    // Only the new canonical-mobile uniqueness race is a harmless duplicate.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002" && "meta" in error) {
      const target = (error.meta as { target?: unknown } | undefined)?.target;
      if ((Array.isArray(target) && target.length === 1 && target[0] === "normalizedMobile") ||
          target === "MobilePinCredential_normalizedMobile_key") return reply(acknowledgment);
    }
    reportMobilePinFailure(stage, stage === "configuration" ? "configuration" : stage === "hash" ? "operation" : "storage");
    return reply({ error: "Registration is unavailable. Try signing in before submitting again." }, 503);
  }
}
