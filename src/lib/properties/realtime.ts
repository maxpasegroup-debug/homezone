import type { Prisma } from "@prisma/client";

type PublicPropertyState = { status: string } | null;
type NotificationTransaction = Pick<Prisma.TransactionClient, "$executeRaw">;

/**
 * Invalidate public property and Builder-project reads without publishing an
 * account, resource ID or record. Both public catalogues reuse the established
 * anonymous properties.changed hint and fetch their own public projections.
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
