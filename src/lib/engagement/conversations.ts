import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/platform/notifications";
import { pairBlockState } from "./blocks";
import { admitEngagement, engagementId, EngagementError, listingOwnerRoles, lockEngagementProfiles, type EngagementActor } from "./http";

export const conversationCreateSchema = z.object({ propertyId: engagementId }).strict();
export const messageSchema = z.object({ body: z.string().trim().min(1).max(2000),
  clientMessageId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/) }).strict();
export const blockSchema = z.object({ blocked: z.boolean() }).strict();
export const reportSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

function unavailable(): never { throw new EngagementError(404, "This conversation is no longer available."); }
const participantSelect = { id: true, role: true, verificationStatus: true, fullName: true } as const;

/** Every operation rechecks current property ownership and both participants. */
async function lockConversation(tx: Prisma.TransactionClient, actor: EngagementActor, id: string) {
  const snapshot = await tx.propertyConversation.findUnique({ where: { id },
    select: { id: true, propertyId: true, buyerId: true, ownerId: true } });
  if (!snapshot || (snapshot.buyerId !== actor.id && snapshot.ownerId !== actor.id)) unavailable();
  const profiles = await lockEngagementProfiles(tx, actor, [snapshot.buyerId, snapshot.ownerId]);
  await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${snapshot.propertyId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "PropertyConversation" WHERE id=${id} FOR UPDATE`;
  const conversation = await tx.propertyConversation.findUnique({ where: { id },
    select: { id: true, propertyId: true, buyerId: true, ownerId: true, buyerBlocked: true, ownerBlocked: true,
      property: { select: { ownerId: true, title: true, status: true } } } });
  const buyer = profiles.find(profile => profile.id === snapshot.buyerId);
  const owner = profiles.find(profile => profile.id === snapshot.ownerId);
  if (!conversation || conversation.buyerId !== snapshot.buyerId || conversation.ownerId !== snapshot.ownerId ||
    conversation.propertyId !== snapshot.propertyId || conversation.property.ownerId !== snapshot.ownerId || conversation.property.status !== "PUBLISHED" ||
    !buyer || buyer.role !== "USER" || buyer.verificationStatus === "SUSPENDED" || !owner ||
    !listingOwnerRoles.has(owner.role) || owner.verificationStatus === "SUSPENDED") unavailable();
  const mine = actor.id === conversation.buyerId;
  return { conversation, buyer, owner, mine, ...await pairBlockState(tx, buyer.id, owner.id, actor.id) };
}

export async function conversationInbox(actor: EngagementActor) {
  await admitEngagement(actor.id, "inbox-read", 60);
  const rows = await db.propertyConversation.findMany({ where: { OR: [{ buyerId: actor.id }, { ownerId: actor.id }] },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 100,
    select: { id: true, propertyId: true, buyerId: true, ownerId: true, buyerBlocked: true, ownerBlocked: true,
      updatedAt: true, buyer: { select: participantSelect }, owner: { select: participantSelect },
      property: { select: { ownerId: true, title: true, status: true } } } });
  const blocks = rows.length ? await db.buyerOwnerBlock.findMany({
    where: { OR: rows.map(row => ({ buyerId: row.buyerId, ownerId: row.ownerId })) },
    select: { buyerId: true, ownerId: true, buyerBlocked: true, ownerBlocked: true }, take: 100
  }) : [];
  const byPair = new Map(blocks.map(row => [`${row.buyerId}:${row.ownerId}`, row]));
  return { conversations: rows.filter(row => row.property.ownerId === row.ownerId && row.property.status === "PUBLISHED" && row.buyer.role === "USER" &&
    row.buyer.verificationStatus !== "SUSPENDED" && row.owner.verificationStatus !== "SUSPENDED" && listingOwnerRoles.has(row.owner.role))
    .map(row => { const mine = row.buyerId === actor.id, block = byPair.get(`${row.buyerId}:${row.ownerId}`); return {
      id: row.id, propertyId: row.propertyId, propertyTitle: row.property.title,
      peerName: (mine ? row.owner.fullName : row.buyer.fullName) || (mine ? "Property owner" : "Buyer"),
      blockedByMe: !!block && (mine ? block.buyerBlocked : block.ownerBlocked), blocked: !!block && (block.buyerBlocked || block.ownerBlocked),
      updatedAt: row.updatedAt
    }; }) };
}

export async function startConversation(actor: EngagementActor, propertyId: string) {
  if (actor.role !== "USER") throw new EngagementError(403, "Sign in as a Buyer to contact a listing owner.");
  await admitEngagement(actor.id, "conversation-start", 10);
  return db.$transaction(async tx => {
    const snapshot = await tx.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
    if (!snapshot?.ownerId || snapshot.ownerId === actor.id) unavailable();
    const profiles = await lockEngagementProfiles(tx, actor, [snapshot.ownerId]);
    await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${propertyId} FOR UPDATE`;
    const property = await tx.property.findUnique({ where: { id: propertyId }, select: { id: true, title: true, ownerId: true, status: true } });
    const owner = profiles.find(profile => profile.id === snapshot.ownerId);
    if (!property || property.status !== "PUBLISHED" || property.ownerId !== snapshot.ownerId || !owner ||
      owner.verificationStatus === "SUSPENDED" || !listingOwnerRoles.has(owner.role)) unavailable();
    if ((await pairBlockState(tx, actor.id, owner.id, actor.id)).blocked) {
      throw new EngagementError(403, "Messaging is blocked for this owner.");
    }
    const conversation = await tx.propertyConversation.upsert({ where: { propertyId_buyerId: { propertyId, buyerId: actor.id } },
      create: { propertyId, buyerId: actor.id, ownerId: owner.id }, update: {},
      select: { id: true, ownerId: true, buyerBlocked: true, ownerBlocked: true, updatedAt: true } });
    // A property transfer never hands an old private conversation to its new owner.
    if (conversation.ownerId !== owner.id) unavailable();
    return { conversation: { id: conversation.id, propertyId, propertyTitle: property.title,
      peerName: owner.fullName || "Property owner", blockedByMe: conversation.buyerBlocked,
      blocked: conversation.buyerBlocked || conversation.ownerBlocked, updatedAt: conversation.updatedAt } };
  });
}

export async function readMessages(actor: EngagementActor, id: string, after?: string) {
  await admitEngagement(actor.id, "messages-read", 60);
  return db.$transaction(async tx => {
    const access = await lockConversation(tx, actor, id);
    let position: { id: string; createdAt: Date } | null = null;
    if (after) {
      position = await tx.chatMessage.findFirst({ where: { id: after, conversationId: id }, select: { id: true, createdAt: true } });
      if (!position) throw new EngagementError(400, "Refresh the conversation before continuing.");
    }
    const rows = await tx.chatMessage.findMany({ where: { conversationId: id,
      ...(position ? { OR: [{ createdAt: { gt: position.createdAt } }, { createdAt: position.createdAt, id: { gt: position.id } }] } : {}) },
      orderBy: [{ createdAt: position ? "asc" : "desc" }, { id: position ? "asc" : "desc" }], take: 51,
      select: { id: true, senderId: true, body: true, createdAt: true } });
    const messages = position ? rows.slice(0, 50) : rows.slice(0, 50).reverse();
    return { messages: messages.map(row => ({ id: row.id, body: row.body, mine: row.senderId === actor.id, createdAt: row.createdAt })),
      nextCursor: messages.at(-1)?.id ?? after ?? null, hasMore: !!position && rows.length > 50,
      blocked: access.blocked, blockedByMe: access.blockedByMe, propertyTitle: access.conversation.property.title };
  });
}

export async function sendMessage(actor: EngagementActor, id: string, input: z.infer<typeof messageSchema>) {
  await admitEngagement(actor.id, "messages-send", 30);
  return db.$transaction(async tx => {
    const access = await lockConversation(tx, actor, id);
    const previous = await tx.chatMessage.findUnique({ where: {
      conversationId_senderId_clientMessageId: { conversationId: id, senderId: actor.id, clientMessageId: input.clientMessageId }
    }, select: { id: true, body: true, createdAt: true } });
    if (previous) {
      if (previous.body !== input.body) throw new EngagementError(409, "This message changed. Start a new message before sending.");
      return { message: { ...previous, mine: true } };
    }
    if (access.blocked) throw new EngagementError(403, "Messaging is blocked for this conversation.");
    if (access.conversation.property.status !== "PUBLISHED") throw new EngagementError(409, "This listing is unavailable. New messages cannot be sent.");
    const message = await tx.chatMessage.create({ data: { conversationId: id, senderId: actor.id,
      clientMessageId: input.clientMessageId, body: input.body }, select: { id: true, body: true, createdAt: true } });
    await tx.propertyConversation.update({ where: { id }, data: { updatedAt: new Date() } });
    await createNotification({ recipientId: access.mine ? access.conversation.ownerId : access.conversation.buyerId,
      module: "PROPERTY", type: "PROPERTY_CHAT_MESSAGE", title: "New property message",
      message: "You have a new message in HomeZone.", metadata: { conversationId: id } }, tx);
    return { message: { ...message, mine: true } };
  });
}

export async function setConversationBlocked(actor: EngagementActor, id: string, blocked: boolean) {
  await admitEngagement(actor.id, "conversation-block", 20);
  return db.$transaction(async tx => {
    const access = await lockConversation(tx, actor, id);
    await tx.buyerOwnerBlock.upsert({ where: { buyerId_ownerId: { buyerId: access.buyer.id, ownerId: access.owner.id } },
      create: { buyerId: access.buyer.id, ownerId: access.owner.id, buyerBlocked: access.mine && blocked, ownerBlocked: !access.mine && blocked },
      update: access.mine ? { buyerBlocked: blocked } : { ownerBlocked: blocked }, select: { buyerId: true } });
    if (blocked) {
      await tx.propertyConversation.update({ where: { id }, data: access.mine ? { buyerBlocked: true } : { ownerBlocked: true } });
    } else {
      // Unblock this person's flag across the pair, never the other participant's.
      await tx.propertyConversation.updateMany({ where: { buyerId: access.buyer.id, ownerId: access.owner.id },
        data: access.mine ? { buyerBlocked: false } : { ownerBlocked: false } });
    }
    return { ok: true, ...await pairBlockState(tx, access.buyer.id, access.owner.id, actor.id) };
  });
}

export async function reportConversation(actor: EngagementActor, id: string, reason: string) {
  await admitEngagement(actor.id, "conversation-report", 10, 3_600_000);
  return db.$transaction(async tx => {
    const access = await lockConversation(tx, actor, id);
    const existing = await tx.conversationReport.findUnique({ where: {
      conversationId_reporterId: { conversationId: id, reporterId: actor.id }
    }, select: { id: true } });
    if (!existing) {
      await tx.conversationReport.create({ data: { conversationId: id, reporterId: actor.id, reason }, select: { id: true } });
      // Feed the existing protected Admin reports queue in the same commit.
      await tx.report.create({ data: { entityType: "USER", entityId: access.mine ? access.owner.id : access.buyer.id,
        reporterId: actor.id, reason, metadata: { conversationId: id, source: "PROPERTY_CHAT" } }, select: { id: true } });
    }
    return { ok: true, reported: true };
  });
}
