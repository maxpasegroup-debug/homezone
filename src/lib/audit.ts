import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";

type AuditInput = {
  action: string;
  actorId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown>;
};

export async function auditLog({
  action,
  actorId,
  entityId,
  entityType,
  metadata = {}
}: AuditInput) {
  try {
    await db.auditLog.create({
      data: {
        action,
        actorId,
        entityId,
        entityType,
        metadata: metadata as Prisma.InputJsonValue
      }
    });
  } catch (error) {
    logger.error("Audit log write failed", {
      action,
      actorId,
      entityId,
      entityType,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
