import { db } from "@/lib/db";

export async function getOrCreateProfile(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
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
