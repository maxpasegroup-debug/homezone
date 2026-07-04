-- HomeZone platform consolidation: unified notifications, reports, webhook events, and status enums.

DO $$ BEGIN CREATE TYPE "NotificationModule" AS ENUM ('PROPERTY','LEAD','STUDIO','BROKER','BUILDER','SERVICE','PAYMENT','AI','ADMIN','SYSTEM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationPriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP','EMAIL','WHATSAPP','SMS','PUSH'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING','SENT','FAILED','SKIPPED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportEntityType" AS ENUM ('PROPERTY','USER','SERVICE_PROVIDER','BUILDER','BROKER','STUDIO','REVIEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportStatus" AS ENUM ('PENDING','UNDER_REVIEW','RESOLVED','DISMISSED','ESCALATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WebhookProvider" AS ENUM ('RAZORPAY','WHATSAPP','SYSTEM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED','PROCESSING','PROCESSED','FAILED','IGNORED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ServiceRequestStatus" AS ENUM ('requested','quoted','accepted','booked','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ServiceQuoteStatus" AS ENUM ('sent','accepted','rejected','revised','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ServiceBookingStatus" AS ENUM ('UPCOMING','IN_PROGRESS','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED','UNDER_REVIEW','HIDDEN','REMOVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BuilderProjectStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED','COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BuilderConstructionStatus" AS ENUM ('PLANNING','FOUNDATION','STRUCTURE','FINISHING','READY','COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BuilderTowerStatus" AS ENUM ('ACTIVE','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BuilderUnitStatus" AS ENUM ('AVAILABLE','RESERVED','SOLD','BLOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BuilderBookingStatus" AS ENUM ('RESERVED','CONFIRMED','RELEASED','SOLD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT','ACTIVE','PAUSED','COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CampaignChannel" AS ENUM ('HOMEZONE','META','GOOGLE','YOUTUBE','WHATSAPP','OFFLINE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CommissionStatus" AS ENUM ('PENDING','PAID','OUTSTANDING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AutomationChannel" AS ENUM ('WHATSAPP','EMAIL','SMS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AutomationTrigger" AS ENUM ('NEW_LEAD','FOLLOW_UP_DUE','VISIT_SCHEDULED','DEAL_WON'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT,
  "module" "NotificationModule" NOT NULL,
  "type" TEXT NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actionUrl" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "channels" "NotificationChannel"[] NOT NULL DEFAULT ARRAY['IN_APP']::"NotificationChannel"[],
  "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Report" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT,
  "entityType" "ReportEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "adminNotes" TEXT,
  "assignedTo" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "WebhookProvider" NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "retries" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_recipientId_idx" ON "Notification"("recipientId");
CREATE INDEX IF NOT EXISTS "Notification_module_idx" ON "Notification"("module");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");
CREATE INDEX IF NOT EXISTS "Notification_priority_idx" ON "Notification"("priority");
CREATE INDEX IF NOT EXISTS "Notification_deliveryStatus_idx" ON "Notification"("deliveryStatus");
CREATE INDEX IF NOT EXISTS "Notification_readAt_idx" ON "Notification"("readAt");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Report_reporterId_idx" ON "Report"("reporterId");
CREATE INDEX IF NOT EXISTS "Report_entityType_entityId_idx" ON "Report"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");
CREATE INDEX IF NOT EXISTS "Report_assignedTo_idx" ON "Report"("assignedTo");
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_idx" ON "WebhookEvent"("provider");
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx" ON "WebhookEvent"("status");
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "ServiceRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ServiceRequest" ALTER COLUMN "status" TYPE "ServiceRequestStatus" USING "status"::"ServiceRequestStatus";
ALTER TABLE "ServiceRequest" ALTER COLUMN "status" SET DEFAULT 'requested';
ALTER TABLE "ServiceQuote" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ServiceQuote" ALTER COLUMN "status" TYPE "ServiceQuoteStatus" USING "status"::"ServiceQuoteStatus";
ALTER TABLE "ServiceQuote" ALTER COLUMN "status" SET DEFAULT 'sent';
ALTER TABLE "ServiceBooking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ServiceBooking" ALTER COLUMN "status" TYPE "ServiceBookingStatus" USING "status"::"ServiceBookingStatus";
ALTER TABLE "ServiceBooking" ALTER COLUMN "status" SET DEFAULT 'UPCOMING';
ALTER TABLE "ServiceReview" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ServiceReview" ALTER COLUMN "status" TYPE "ReviewStatus" USING "status"::"ReviewStatus";
ALTER TABLE "ServiceReview" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
ALTER TABLE "BuilderProject" ALTER COLUMN "constructionStatus" DROP DEFAULT;
ALTER TABLE "BuilderProject" ALTER COLUMN "constructionStatus" TYPE "BuilderConstructionStatus" USING "constructionStatus"::"BuilderConstructionStatus";
ALTER TABLE "BuilderProject" ALTER COLUMN "constructionStatus" SET DEFAULT 'PLANNING';
ALTER TABLE "BuilderProject" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BuilderProject" ALTER COLUMN "status" TYPE "BuilderProjectStatus" USING "status"::"BuilderProjectStatus";
ALTER TABLE "BuilderProject" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "BuilderProject" ALTER COLUMN "campaignStatus" DROP DEFAULT;
ALTER TABLE "BuilderProject" ALTER COLUMN "campaignStatus" TYPE "CampaignStatus" USING "campaignStatus"::"CampaignStatus";
ALTER TABLE "BuilderProject" ALTER COLUMN "campaignStatus" SET DEFAULT 'DRAFT';
ALTER TABLE "BuilderTower" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BuilderTower" ALTER COLUMN "status" TYPE "BuilderTowerStatus" USING "status"::"BuilderTowerStatus";
ALTER TABLE "BuilderTower" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "BuilderUnit" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BuilderUnit" ALTER COLUMN "status" TYPE "BuilderUnitStatus" USING "status"::"BuilderUnitStatus";
ALTER TABLE "BuilderUnit" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
ALTER TABLE "BuilderBooking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BuilderBooking" ALTER COLUMN "status" TYPE "BuilderBookingStatus" USING "status"::"BuilderBookingStatus";
ALTER TABLE "BuilderBooking" ALTER COLUMN "status" SET DEFAULT 'RESERVED';
ALTER TABLE "BuilderCampaign" ALTER COLUMN "channel" DROP DEFAULT;
ALTER TABLE "BuilderCampaign" ALTER COLUMN "channel" TYPE "CampaignChannel" USING "channel"::"CampaignChannel";
ALTER TABLE "BuilderCampaign" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BuilderCampaign" ALTER COLUMN "status" TYPE "CampaignStatus" USING "status"::"CampaignStatus";
ALTER TABLE "BuilderCampaign" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "BrokerCommission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BrokerCommission" ALTER COLUMN "status" TYPE "CommissionStatus" USING "status"::"CommissionStatus";
ALTER TABLE "BrokerCommission" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "BrokerAutomationRule" ALTER COLUMN "channel" DROP DEFAULT;
ALTER TABLE "BrokerAutomationRule" ALTER COLUMN "channel" TYPE "AutomationChannel" USING "channel"::"AutomationChannel";
ALTER TABLE "BrokerAutomationRule" ALTER COLUMN "trigger" DROP DEFAULT;
ALTER TABLE "BrokerAutomationRule" ALTER COLUMN "trigger" TYPE "AutomationTrigger" USING "trigger"::"AutomationTrigger";
