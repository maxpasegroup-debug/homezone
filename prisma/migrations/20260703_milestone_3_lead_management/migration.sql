ALTER TYPE "LeadStage" ADD VALUE IF NOT EXISTS 'CONTACTED';
ALTER TYPE "LeadStage" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "firstRespondedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "dealValue" DECIMAL(65,30);

CREATE TABLE IF NOT EXISTS "LeadNote" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "authorId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadNote_leadId_idx" ON "LeadNote"("leadId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadNote_leadId_fkey'
  ) THEN
    ALTER TABLE "LeadNote"
      ADD CONSTRAINT "LeadNote_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadNote_authorId_fkey'
  ) THEN
    ALTER TABLE "LeadNote"
      ADD CONSTRAINT "LeadNote_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LeadTask" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "assignedTo" TEXT,
  "title" TEXT NOT NULL,
  "taskType" TEXT NOT NULL DEFAULT 'CALL',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadTask_leadId_idx" ON "LeadTask"("leadId");
CREATE INDEX IF NOT EXISTS "LeadTask_assignedTo_idx" ON "LeadTask"("assignedTo");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadTask_leadId_fkey'
  ) THEN
    ALTER TABLE "LeadTask"
      ADD CONSTRAINT "LeadTask_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadSiteVisit_leadId_fkey'
  ) THEN
    ALTER TABLE "LeadSiteVisit"
      ADD CONSTRAINT "LeadSiteVisit_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadSiteVisit_propertyId_fkey'
  ) THEN
    ALTER TABLE "LeadSiteVisit"
      ADD CONSTRAINT "LeadSiteVisit_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadTimelineEvent_leadId_fkey'
  ) THEN
    ALTER TABLE "LeadTimelineEvent"
      ADD CONSTRAINT "LeadTimelineEvent_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadNotification_leadId_fkey'
  ) THEN
    ALTER TABLE "LeadNotification"
      ADD CONSTRAINT "LeadNotification_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LeadNotification_recipientId_fkey'
  ) THEN
    ALTER TABLE "LeadNotification"
      ADD CONSTRAINT "LeadNotification_recipientId_fkey"
      FOREIGN KEY ("recipientId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
