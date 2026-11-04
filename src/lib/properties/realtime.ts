import type { Prisma } from "@prisma/client";

type PublicPropertyState = { status: string } | null;
type NotificationTransaction = Pick<Prisma.TransactionClient, "$executeRaw">;

/**
 * Invalidate public reads without publishing an account, property ID or record.
 * Call after the mutation inside its transaction: PostgreSQL only delivers the
 * notification after commit and discards it when that transaction rolls back.
 */
export async function notifyPublicPropertyChange(
  transaction: NotificationTransaction,
  before: PublicPropertyState,
  after: PublicPropertyState
): Promise<void> {
  if (process.env.HOMEZONE_REALTIME_ENABLED !== "true" ||
      (before?.status !== "PUBLISHED" && after?.status !== "PUBLISHED")) return;

  await transaction.$executeRaw`SELECT pg_notify(${"homezone_public_properties_v1"}, ${'{"v":1,"type":"properties.changed"}'})`;
}
