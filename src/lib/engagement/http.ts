import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { authOrigin } from "@/lib/auth/redirect";
import { AdmissionDenied, budgets } from "@/lib/auth/registration-admission";
import { db } from "@/lib/db";

export type EngagementActor = { id: string; role: string; verificationStatus: string };
export class EngagementError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export const engagementId = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
const publicRoles = new Set(["USER", "OWNER", "BROKER", "BUILDER", "SERVICE_PROVIDER"]);
export const listingOwnerRoles = new Set(["OWNER", "BROKER", "BUILDER"]);

export function engagementResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function engagementBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new SyntaxError();
    const reader = request.body?.getReader();
    if (!reader) throw new SyntaxError();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > 12_288) { await reader.cancel(); throw new SyntaxError(); }
        chunks.push(value);
      }
      return schema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } finally { reader.releaseLock(); }
  }
  catch { throw new EngagementError(400, "Check the information and try again."); }
}

/** Uses the existing Auth.js identity and registry; never creates a demo/profile. */
export async function withEngagement(request: Request, stage: string,
  handler: (actor: EngagementActor) => Promise<Response>): Promise<Response> {
  try {
    if (process.env.HOMEZONE_ENGAGEMENT_ENABLED !== "true") {
      return engagementResponse({ error: "Chat and contact plans are not available yet." }, 503);
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if ((origin !== null && origin !== authOrigin()) || request.headers.get("sec-fetch-site") === "cross-site") {
        throw new EngagementError(403, "Request not permitted.");
      }
    }
    const session = await auth();
    if (!session?.user?.id) throw new EngagementError(401, "Sign in to continue.");
    const actor = await db.profile.findUnique({ where: { userId: session.user.id },
      select: { id: true, role: true, verificationStatus: true } });
    if (!actor || actor.verificationStatus === "SUSPENDED" || !publicRoles.has(actor.role)) {
      throw new EngagementError(403, "This account cannot use this feature.");
    }
    return await handler(actor);
  } catch (error) {
    if (error instanceof EngagementError) return engagementResponse({ error: error.message }, error.status);
    if (error instanceof AdmissionDenied) return Response.json({ error: "Too many requests. Please try again later." }, {
      status: 429, headers: { "Cache-Control": "private, no-store",
        "Retry-After": String(Math.max(1, Math.ceil((error.until.getTime() - Date.now()) / 1000))) }
    });
    // Fixed route-stage labels only: never log exceptions, message text or numbers.
    console.error(JSON.stringify({ event: "engagement_unavailable", stage }));
    return engagementResponse({ error: "This service is temporarily unavailable. Please try again later." }, 503);
  }
}

export async function admitEngagement(actorId: string, action: string, limit: number, windowMs = 60_000) {
  const prefix = "engagement:v1:";
  await db.$transaction(async tx => {
    await budgets(tx, [
      { key: `${prefix}${action}:global`, max: Math.max(1000, limit * 100), duration: windowMs },
      { key: `${prefix}${action}:${actorId}`, max: limit, duration: windowMs }
    ]);
    const cutoff = new Date(Date.now() - 3_600_000);
    const expired = await tx.registrationBudget.findMany({
      where: { key: { startsWith: prefix }, resetAt: { lt: cutoff } }, select: { key: true }, take: 50
    });
    if (expired.length) await tx.registrationBudget.deleteMany({
      where: { key: { in: expired.map(row => row.key) }, resetAt: { lt: cutoff } }
    });
  });
}

/** Match the existing Profile -> Property mutation lock order. */
export async function lockEngagementProfiles(tx: Prisma.TransactionClient, actor: EngagementActor, ids: string[]) {
  for (const id of [...new Set([actor.id, ...ids])].sort()) {
    await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${id} FOR UPDATE`;
  }
  const profiles = await tx.profile.findMany({ where: { id: { in: [...new Set([actor.id, ...ids])] } },
    select: { id: true, role: true, verificationStatus: true, fullName: true } });
  const current = profiles.find(profile => profile.id === actor.id);
  if (!current || current.role !== actor.role || current.verificationStatus === "SUSPENDED" || !publicRoles.has(current.role)) {
    throw new EngagementError(403, "Your account changed. Sign in again before continuing.");
  }
  return profiles;
}
