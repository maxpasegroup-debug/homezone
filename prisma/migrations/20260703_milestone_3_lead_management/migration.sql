ALTER TYPE "LeadStage" ADD VALUE IF NOT EXISTS 'CONTACTED';
ALTER TYPE "LeadStage" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "firstRespondedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "dealValue" DECIMAL(65,30);

ALTER TABLE "LeadNote" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "LeadTask" ADD COLUMN IF NOT EXISTS "taskType" TEXT NOT NULL DEFAULT 'CALL';
ALTER TABLE "LeadTask" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "LeadTask_completedAt_idx" ON "LeadTask"("completedAt");
CREATE INDEX IF NOT EXISTS "LeadNote_authorId_idx" ON "LeadNote"("authorId");

CREATE TABLE IF NOT EXISTS "LeadSiteVisit" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "propertyId" TEXT,
  "scheduledBy" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeadSiteVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadSiteVisit_leadId_idx" ON "LeadSiteVisit"("leadId");
CREATE INDEX IF NOT EXISTS "LeadSiteVisit_propertyId_idx" ON "LeadSiteVisit"("propertyId");
CREATE INDEX IF NOT EXISTS "LeadSiteVisit_scheduledAt_idx" ON "LeadSiteVisit"("scheduledAt");
CREATE INDEX IF NOT EXISTS "LeadSiteVisit_status_idx" ON "LeadSiteVisit"("status");

ALTER TABLE "LeadSiteVisit"
  ADD CONSTRAINT "LeadSiteVisit_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadSiteVisit"
  ADD CONSTRAINT "LeadSiteVisit_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "LeadTimelineEvent" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "actorId" TEXT,
  "eventType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadTimelineEvent_leadId_idx" ON "LeadTimelineEvent"("leadId");
CREATE INDEX IF NOT EXISTS "LeadTimelineEvent_actorId_idx" ON "LeadTimelineEvent"("actorId");
CREATE INDEX IF NOT EXISTS "LeadTimelineEvent_eventType_idx" ON "LeadTimelineEvent"("eventType");
CREATE INDEX IF NOT EXISTS "LeadTimelineEvent_createdAt_idx" ON "LeadTimelineEvent"("createdAt");

ALTER TABLE "LeadTimelineEvent"
  ADD CONSTRAINT "LeadTimelineEvent_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "LeadNotification" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "recipientId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadNotification_leadId_idx" ON "LeadNotification"("leadId");
CREATE INDEX IF NOT EXISTS "LeadNotification_recipientId_idx" ON "LeadNotification"("recipientId");
CREATE INDEX IF NOT EXISTS "LeadNotification_type_idx" ON "LeadNotification"("type");
CREATE INDEX IF NOT EXISTS "LeadNotification_readAt_idx" ON "LeadNotification"("readAt");
CREATE INDEX IF NOT EXISTS "LeadNotification_createdAt_idx" ON "LeadNotification"("createdAt");

ALTER TABLE "LeadNotification"
  ADD CONSTRAINT "LeadNotification_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadNotification"
  ADD CONSTRAINT "LeadNotification_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
