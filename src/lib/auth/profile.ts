import { db } from "@/lib/db";
import { env } from "@/lib/env";

const DEMO_USER_ID = "homezone-demo-user";
const MOBILE_DEMO_USER_ID = "homezone-mobile-demo-user";

export function isDemoUserId(id: string) {
  return id === DEMO_USER_ID || id === MOBILE_DEMO_USER_ID;
}

export function getDemoProfile(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const now = new Date();

  return {
    avatarUrl: user.image ?? null,
    city: "Kochi",
    country: "India",
    createdAt: now,
    fullName: user.name ?? "HomeZone Mobile Demo User",
    id: user.id,
    phone: user.id === MOBILE_DEMO_USER_ID ? "8089239823" : "+919999999999",
    role: "USER" as const,
    updatedAt: now,
    userId: user.id,
    verificationNotes: null,
    verificationStatus: "VERIFIED" as const,
    verifiedAt: now,
    verifiedBy: null,
    whatsappVerified: true
  };
}

export async function getOrCreateProfile(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  if (isDemoUserId(user.id) && !env.DATABASE_URL) {
    return getDemoProfile(user);
  }

  const existing = await db.profile.findUnique({
    where: {
      userId: user.id
    }
  });

  if (existing) {
    return existing;
  }

  return db.profile.create({
    data: {
      userId: user.id,
      fullName: user.name ?? user.email ?? "HomeZone User",
      avatarUrl: user.image
    }
  });
}
