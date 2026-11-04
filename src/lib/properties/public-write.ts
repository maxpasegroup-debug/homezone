import type { Prisma } from "@prisma/client";

/** Keep public interactions on a published listing until their write commits. */
export async function publicPropertyForMutation(
  tx: Prisma.TransactionClient,
  propertyId: string,
  profileId: string,
  lockOwner = false
) {
  // Match listing mutation lock order so a concurrent archive cannot race the
  // visibility check, including when an Owner interacts with their own listing.
  const recipient = lockOwner ? await tx.property.findUnique({
    where: { id: propertyId, status: "PUBLISHED" }, select: { ownerId: true }
  }) : undefined;
  if (lockOwner && !recipient) return null;
  // Enquiries also insert notification foreign keys to the Owner. Lock both
  // profiles before the property to avoid reversing an Owner edit/upload's
  // Profile→Property lock order. Recheck the recipient after the property lock.
  const profiles = [...new Set([profileId, ...(recipient?.ownerId ? [recipient.ownerId] : [])])].sort();
  for (const id of profiles) await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${id} FOR UPDATE`;
  const actor = await tx.profile.findUnique({
    where: { id: profileId }, select: { verificationStatus: true }
  });
  if (!actor || actor.verificationStatus === "SUSPENDED") return null;

  await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${propertyId} FOR UPDATE`;
  const property = await tx.property.findUnique({
    where: { id: propertyId, status: "PUBLISHED" },
    select: { id: true, ownerId: true }
  });
  return lockOwner && property?.ownerId !== recipient?.ownerId ? null : property;
}
