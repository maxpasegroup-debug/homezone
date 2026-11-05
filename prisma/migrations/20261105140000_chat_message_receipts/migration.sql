-- Historical messages remain unacknowledged; delivery/read state is never inferred.
ALTER TABLE "ChatMessage"
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "readAt" TIMESTAMP(3);

ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_receipt_order_check"
  CHECK ("readAt" IS NULL OR ("deliveredAt" IS NOT NULL AND "readAt" >= "deliveredAt"));
