import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const sessionMaxAge = 30 * 24 * 60 * 60;
type Claims = { id?: unknown; sid?: unknown; sessionVersion?: unknown; sessionExpires?: unknown };

function sessionKey(sid: string) {
  return createHash("sha256").update(sid).digest("hex");
}

export async function issueSession(userId: string, verifiedVersion?: number) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } });
  if (!user || (verifiedVersion !== undefined && verifiedVersion !== user.sessionVersion)) return null;
  const sid = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionMaxAge * 1000);
  await db.authSession.create({ data: { id: sessionKey(sid), userId, version: user.sessionVersion, expiresAt } });
  return { id: userId, sid, sessionVersion: user.sessionVersion, sessionExpires: expiresAt.toISOString() };
}

// Called after Auth.js cryptographic verification, also by middleware getToken.
export async function validateSession(claims: Claims) {
  if (typeof claims.id !== "string" || typeof claims.sid !== "string" || !/^[a-f0-9]{64}$/.test(claims.sid) ||
      !Number.isInteger(claims.sessionVersion) || typeof claims.sessionExpires !== "string" ||
      !Number.isFinite(Date.parse(claims.sessionExpires)) || Date.parse(claims.sessionExpires) <= Date.now()) return false;
  try {
    const session = await db.authSession.findUnique({
      where: { id: sessionKey(claims.sid) }, include: { user: { select: { sessionVersion: true, profile: { select: { verificationStatus: true } } } } }
    });
    return Boolean(session && session.user.profile?.verificationStatus !== "SUSPENDED" && session.userId === claims.id && !session.revokedAt &&
      session.expiresAt.getTime() > Date.now() && session.version === claims.sessionVersion &&
      session.user.sessionVersion === claims.sessionVersion);
  } catch {
    return false; // Missing migration or unavailable DB must never authenticate.
  }
}

export async function revokeSession(claims: Claims) {
  if (typeof claims.id !== "string" || typeof claims.sid !== "string" || !/^[a-f0-9]{64}$/.test(claims.sid)) return;
  await db.authSession.updateMany({
    where: { id: sessionKey(claims.sid), userId: claims.id, revokedAt: null }, data: { revokedAt: new Date() }
  });
}

export async function changePassword(tx: Prisma.TransactionClient, userId: string, passwordHash: string) {
  await tx.passwordCredential.upsert({
    where: { userId }, create: { userId, passwordHash }, update: { passwordHash }
  });
  await tx.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
}
