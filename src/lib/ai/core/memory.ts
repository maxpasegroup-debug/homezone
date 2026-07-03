import type { AIMemoryScope, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function rememberAIValue({
  conversationId,
  expiresAt,
  key,
  metadata = {},
  scope,
  userId,
  value
}: {
  conversationId?: string | null;
  expiresAt?: Date | null;
  key: string;
  metadata?: Prisma.InputJsonValue;
  scope: AIMemoryScope;
  userId?: string | null;
  value: Prisma.InputJsonValue;
}) {
  return db.aIMemory.create({
    data: {
      conversationId,
      expiresAt,
      key,
      metadata,
      scope,
      userId,
      value
    }
  });
}

export async function getAIMemory({
  conversationId,
  userId
}: {
  conversationId?: string | null;
  userId?: string | null;
}) {
  const ownershipFilters = [
    userId ? { userId } : null,
    conversationId ? { conversationId } : null
  ].filter(Boolean) as Array<{ userId: string } | { conversationId: string }>;

  if (!ownershipFilters.length) {
    return [];
  }

  return db.aIMemory.findMany({
    orderBy: {
      updatedAt: "desc"
    },
    take: 40,
    where: {
      OR: ownershipFilters,
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      ]
    }
  });
}
