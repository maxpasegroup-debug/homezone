import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeMobileNumber } from "@/lib/auth/mobile-number";
import { pairBlockState } from "./blocks";
import { buyerPlusPlan } from "./membership";
import { admitEngagement, EngagementError, listingOwnerRoles, lockEngagementProfiles, type EngagementActor } from "./http";

export const CONTACT_CONSENT_VERSION = "owner-contact-v1";
export const preferenceSchema = z.object({ phone: z.string().max(32), sharingEnabled: z.boolean(),
  consentAccepted: z.boolean() }).strict();

export async function contactPreferences(actor: EngagementActor) {
  const preference = await db.ownerContactPreference.findUnique({ where: { profileId: actor.id },
    select: { phone: true, sharingEnabled: true, consentVersion: true } });
  return preference ?? { phone: null, sharingEnabled: false, consentVersion: null };
}

export async function updateContactPreferences(actor: EngagementActor, input: z.infer<typeof preferenceSchema>) {
  if (!listingOwnerRoles.has(actor.role)) throw new EngagementError(403, "Only listing owners can share contact details.");
  const phone = input.phone.trim() ? normalizeMobileNumber(input.phone) : null;
  if ((input.phone.trim() && !phone) || (input.sharingEnabled && (!phone || !input.consentAccepted))) {
    throw new EngagementError(400, "Enter a valid Indian mobile number and agree to share it, or turn sharing off.");
  }
  await admitEngagement(actor.id, "contact-preferences", 10);
  return db.$transaction(async tx => {
    await lockEngagementProfiles(tx, actor, []);
    const data = { phone, sharingEnabled: input.sharingEnabled,
      consentVersion: input.sharingEnabled ? CONTACT_CONSENT_VERSION : null };
    return tx.ownerContactPreference.upsert({ where: { profileId: actor.id },
      create: { profileId: actor.id, ...data }, update: data,
      select: { phone: true, sharingEnabled: true, consentVersion: true } });
  });
}

/** Never copies the editable profile/login number, and never snapshots a phone in the ledger. */
export async function propertyContact(actor: EngagementActor, propertyId: string, unlock: boolean) {
  await admitEngagement(actor.id, unlock ? "contact-unlock" : "contact-read", unlock ? 20 : 60);
  return db.$transaction(async tx => {
    const snapshot = await tx.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
    if (!snapshot?.ownerId) return { status: "unavailable" } as const;
    const profiles = await lockEngagementProfiles(tx, actor, [snapshot.ownerId]);
    await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${propertyId} FOR UPDATE`;
    const property = await tx.property.findUnique({ where: { id: propertyId }, select: { ownerId: true, status: true } });
    const owner = profiles.find(profile => profile.id === snapshot.ownerId);
    if (!property || property.status !== "PUBLISHED" || property.ownerId !== snapshot.ownerId ||
      !owner || owner.verificationStatus === "SUSPENDED" || !listingOwnerRoles.has(owner.role)) {
      return { status: "unavailable" } as const;
    }
    if (property.ownerId === actor.id) return { status: "self" } as const;
    if (actor.role !== "USER") throw new EngagementError(403, "Buyer contact plans are available to Buyer accounts.");
    if ((await pairBlockState(tx, actor.id, owner.id, actor.id)).blocked) return { status: "unavailable" } as const;
    const preference = await tx.ownerContactPreference.findUnique({ where: { profileId: owner.id },
      select: { phone: true, sharingEnabled: true, consentVersion: true } });
    if (!preference?.sharingEnabled || preference.consentVersion !== CONTACT_CONSENT_VERSION || !preference.phone ||
      normalizeMobileNumber(preference.phone) !== preference.phone) return { status: "unavailable" } as const;
    const now = new Date();
    const subscriptions = await tx.subscription.findMany({ where: { profileId: actor.id, product: "BUYER_PLUS", status: "ACTIVE",
      startsAt: { lte: now }, endsAt: { gt: now }, contactLimit: { gt: 0 },
      payments: { some: { status: "PAID", payerId: actor.id, product: "BUYER_PLUS", amount: buyerPlusPlan.amount, currency: buyerPlusPlan.currency } } },
      orderBy: [{ endsAt: "asc" }, { id: "asc" }], select: { id: true } });
    if (!subscriptions.length) return { status: "plan_required" } as const;
    const activePlans: { id: string; contactLimit: number; contactsUsed: number }[] = [];
    // Fixed expiry/ID order, also used by all contact requests. Refund updates
    // serialize on these subscription locks without exposing a cancelled plan.
    for (const subscription of subscriptions) {
      await tx.$queryRaw`SELECT id FROM "Subscription" WHERE id=${subscription.id} FOR UPDATE`;
      const active = await tx.subscription.findFirst({ where: { id: subscription.id, profileId: actor.id, product: "BUYER_PLUS",
        status: "ACTIVE", startsAt: { lte: new Date() }, endsAt: { gt: new Date() }, contactLimit: { gt: 0 },
        payments: { some: { status: "PAID", payerId: actor.id, product: "BUYER_PLUS", amount: buyerPlusPlan.amount, currency: buyerPlusPlan.currency } } },
        select: { id: true, contactLimit: true, contactsUsed: true } });
      if (active) activePlans.push(active);
    }
    if (!activePlans.length) return { status: "plan_required" } as const;
    const previous = await tx.ownerContactUnlock.findUnique({ where: { buyerId_ownerId: { buyerId: actor.id, ownerId: owner.id } }, select: { id: true } });
    const remaining = activePlans.reduce((sum, plan) => sum + Math.max(0, plan.contactLimit - plan.contactsUsed), 0);
    if (previous) return { status: "available", phone: preference.phone, alreadyUnlocked: true, remaining } as const;
    if (!remaining) return { status: "limit_reached", remaining: 0 } as const;
    if (!unlock) return { status: "available", alreadyUnlocked: false, remaining } as const;
    const active = activePlans.find(plan => plan.contactsUsed < plan.contactLimit)!;
    // Actor/subscription row locks serialize different owners and concurrent duplicate requests.
    await tx.subscription.update({ where: { id: active.id }, data: { contactsUsed: { increment: 1 } } });
    await tx.ownerContactUnlock.create({ data: { buyerId: actor.id, ownerId: owner.id, subscriptionId: active.id } });
    return { status: "available", phone: preference.phone, alreadyUnlocked: false, remaining: remaining - 1 } as const;
  });
}
