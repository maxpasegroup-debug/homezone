import type { Prisma } from "@prisma/client";

/** Call after sorted participant Profile locks so block/unlock/send cannot race. */
export async function pairBlockState(tx: Prisma.TransactionClient, buyerId: string, ownerId: string, actorId: string) {
  const row = await tx.buyerOwnerBlock.findUnique({ where: { buyerId_ownerId: { buyerId, ownerId } },
    select: { buyerBlocked: true, ownerBlocked: true } });
  return { blocked: !!row && (row.buyerBlocked || row.ownerBlocked),
    blockedByMe: !!row && (actorId === buyerId ? row.buyerBlocked : row.ownerBlocked) };
}
