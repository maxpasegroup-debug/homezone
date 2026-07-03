ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'STUDIO_BROCHURE';
ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'STUDIO_DESIGN';
ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'STUDIO_ADS';
ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'STUDIO_VIRTUAL_STAGING';
ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'STUDIO_VOICEOVER';

CREATE TYPE "StudioOrderStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'PAYMENT_PENDING',
  'PAID',
  'ASSIGNED',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'DELIVERED',
  'CUSTOMER_APPROVED',
  'COMPLETED',
  'CANCELLED',
  'REVISION_REQUESTED'
);

ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "orderValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "customerRating" INTEGER;
ALTER TABLE "StudioRequest" ADD COLUMN IF NOT EXISTS "customerFeedback" TEXT;

ALTER TABLE "StudioRequest"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "StudioRequest"
  ALTER COLUMN "status" TYPE "StudioOrderStatus"
  USING (
    CASE lower("status"::text)
      WHEN 'requested' THEN 'SUBMITTED'
      WHEN 'payment_pending' THEN 'PAYMENT_PENDING'
      WHEN 'paid' THEN 'PAID'
      WHEN 'assigned' THEN 'ASSIGNED'
      WHEN 'in_production' THEN 'IN_PRODUCTION'
      WHEN 'quality_check' THEN 'QUALITY_CHECK'
      WHEN 'delivered' THEN 'DELIVERED'
      WHEN 'customer_approved' THEN 'CUSTOMER_APPROVED'
      WHEN 'completed' THEN 'COMPLETED'
      WHEN 'cancelled' THEN 'CANCELLED'
      WHEN 'revision_requested' THEN 'REVISION_REQUESTED'
      ELSE 'DRAFT'
    END
  )::"StudioOrderStatus";

ALTER TABLE "StudioRequest"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE "StudioAssignment" (
  "id" TEXT NOT NULL,
  "studioRequestId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "role" TEXT NOT NULL,
  "assignedBy" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioAssignment_studioRequestId_idx" ON "StudioAssignment"("studioRequestId");
CREATE INDEX "StudioAssignment_assigneeId_idx" ON "StudioAssignment"("assigneeId");
CREATE INDEX "StudioAssignment_role_idx" ON "StudioAssignment"("role");
ALTER TABLE "StudioAssignment" ADD CONSTRAINT "StudioAssignment_studioRequestId_fkey" FOREIGN KEY ("studioRequestId") REFERENCES "StudioRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioAssignment" ADD CONSTRAINT "StudioAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudioTimelineEvent" (
  "id" TEXT NOT NULL,
  "studioRequestId" TEXT NOT NULL,
  "actorId" TEXT,
  "eventType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioTimelineEvent_studioRequestId_idx" ON "StudioTimelineEvent"("studioRequestId");
CREATE INDEX "StudioTimelineEvent_actorId_idx" ON "StudioTimelineEvent"("actorId");
CREATE INDEX "StudioTimelineEvent_eventType_idx" ON "StudioTimelineEvent"("eventType");
CREATE INDEX "StudioTimelineEvent_createdAt_idx" ON "StudioTimelineEvent"("createdAt");
ALTER TABLE "StudioTimelineEvent" ADD CONSTRAINT "StudioTimelineEvent_studioRequestId_fkey" FOREIGN KEY ("studioRequestId") REFERENCES "StudioRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudioDeliveryFile" (
  "id" TEXT NOT NULL,
  "studioRequestId" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioDeliveryFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioDeliveryFile_studioRequestId_idx" ON "StudioDeliveryFile"("studioRequestId");
CREATE INDEX "StudioDeliveryFile_fileType_idx" ON "StudioDeliveryFile"("fileType");
CREATE INDEX "StudioDeliveryFile_version_idx" ON "StudioDeliveryFile"("version");
ALTER TABLE "StudioDeliveryFile" ADD CONSTRAINT "StudioDeliveryFile_studioRequestId_fkey" FOREIGN KEY ("studioRequestId") REFERENCES "StudioRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudioRevision" (
  "id" TEXT NOT NULL,
  "studioRequestId" TEXT NOT NULL,
  "requestedById" TEXT,
  "comments" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "StudioRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioRevision_studioRequestId_idx" ON "StudioRevision"("studioRequestId");
CREATE INDEX "StudioRevision_requestedById_idx" ON "StudioRevision"("requestedById");
CREATE INDEX "StudioRevision_status_idx" ON "StudioRevision"("status");
ALTER TABLE "StudioRevision" ADD CONSTRAINT "StudioRevision_studioRequestId_fkey" FOREIGN KEY ("studioRequestId") REFERENCES "StudioRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudioNotification" (
  "id" TEXT NOT NULL,
  "studioRequestId" TEXT NOT NULL,
  "recipientId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioNotification_studioRequestId_idx" ON "StudioNotification"("studioRequestId");
CREATE INDEX "StudioNotification_recipientId_idx" ON "StudioNotification"("recipientId");
CREATE INDEX "StudioNotification_type_idx" ON "StudioNotification"("type");
CREATE INDEX "StudioNotification_readAt_idx" ON "StudioNotification"("readAt");
ALTER TABLE "StudioNotification" ADD CONSTRAINT "StudioNotification_studioRequestId_fkey" FOREIGN KEY ("studioRequestId") REFERENCES "StudioRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioNotification" ADD CONSTRAINT "StudioNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
