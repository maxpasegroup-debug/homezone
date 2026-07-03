ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'BUILDER_ENTERPRISE';

ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "floorPlanUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "masterPlanUrl" TEXT;
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "constructionStatus" TEXT NOT NULL DEFAULT 'PLANNING';
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "completionDate" TIMESTAMP(3);
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "landingPageSlug" TEXT;
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "brochureUrl" TEXT;
ALTER TABLE "BuilderProject" ADD COLUMN IF NOT EXISTS "qrCodeUrl" TEXT;

UPDATE "BuilderProject"
SET "campaignStatus" = upper("campaignStatus")
WHERE "campaignStatus" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "BuilderProject_landingPageSlug_key" ON "BuilderProject"("landingPageSlug");
CREATE INDEX IF NOT EXISTS "BuilderProject_status_idx" ON "BuilderProject"("status");
CREATE INDEX IF NOT EXISTS "BuilderProject_campaignStatus_idx" ON "BuilderProject"("campaignStatus");
CREATE INDEX IF NOT EXISTS "BuilderProject_city_idx" ON "BuilderProject"("city");

CREATE TABLE IF NOT EXISTS "BuilderTower" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "floors" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuilderTower_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BuilderTower_projectId_idx" ON "BuilderTower"("projectId");
CREATE INDEX IF NOT EXISTS "BuilderTower_status_idx" ON "BuilderTower"("status");
ALTER TABLE "BuilderTower" ADD CONSTRAINT "BuilderTower_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BuilderUnit" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "towerId" TEXT,
  "unitNumber" TEXT NOT NULL,
  "floor" INTEGER,
  "unitType" TEXT NOT NULL,
  "areaValue" DECIMAL(65,30),
  "areaUnit" TEXT NOT NULL DEFAULT 'sqft',
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "facing" TEXT,
  "price" DECIMAL(65,30),
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "floorPlanUrl" TEXT,
  "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuilderUnit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BuilderUnit_projectId_unitNumber_key" ON "BuilderUnit"("projectId", "unitNumber");
CREATE INDEX IF NOT EXISTS "BuilderUnit_projectId_idx" ON "BuilderUnit"("projectId");
CREATE INDEX IF NOT EXISTS "BuilderUnit_towerId_idx" ON "BuilderUnit"("towerId");
CREATE INDEX IF NOT EXISTS "BuilderUnit_status_idx" ON "BuilderUnit"("status");
CREATE INDEX IF NOT EXISTS "BuilderUnit_floor_idx" ON "BuilderUnit"("floor");
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "BuilderTower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BuilderTeamMember" (
  "id" TEXT NOT NULL,
  "builderId" TEXT NOT NULL,
  "profileId" TEXT,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "role" TEXT NOT NULL DEFAULT 'SALES',
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuilderTeamMember_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BuilderTeamMember_builderId_idx" ON "BuilderTeamMember"("builderId");
CREATE INDEX IF NOT EXISTS "BuilderTeamMember_profileId_idx" ON "BuilderTeamMember"("profileId");
CREATE INDEX IF NOT EXISTS "BuilderTeamMember_projectId_idx" ON "BuilderTeamMember"("projectId");
CREATE INDEX IF NOT EXISTS "BuilderTeamMember_active_idx" ON "BuilderTeamMember"("active");
ALTER TABLE "BuilderTeamMember" ADD CONSTRAINT "BuilderTeamMember_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuilderTeamMember" ADD CONSTRAINT "BuilderTeamMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuilderTeamMember" ADD CONSTRAINT "BuilderTeamMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BuilderBooking" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "leadId" TEXT,
  "buyerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "bookingAmount" DECIMAL(65,30),
  "saleValue" DECIMAL(65,30),
  "notes" TEXT,
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "soldAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuilderBooking_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BuilderBooking_projectId_idx" ON "BuilderBooking"("projectId");
CREATE INDEX IF NOT EXISTS "BuilderBooking_unitId_idx" ON "BuilderBooking"("unitId");
CREATE INDEX IF NOT EXISTS "BuilderBooking_leadId_idx" ON "BuilderBooking"("leadId");
CREATE INDEX IF NOT EXISTS "BuilderBooking_buyerId_idx" ON "BuilderBooking"("buyerId");
CREATE INDEX IF NOT EXISTS "BuilderBooking_status_idx" ON "BuilderBooking"("status");
ALTER TABLE "BuilderBooking" ADD CONSTRAINT "BuilderBooking_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuilderBooking" ADD CONSTRAINT "BuilderBooking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BuilderUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuilderBooking" ADD CONSTRAINT "BuilderBooking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuilderBooking" ADD CONSTRAINT "BuilderBooking_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BuilderCampaign" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "budget" DECIMAL(65,30),
  "leadsCount" INTEGER NOT NULL DEFAULT 0,
  "qrCodeUrl" TEXT,
  "landingPageUrl" TEXT,
  "brochureDownloads" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuilderCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BuilderCampaign_projectId_idx" ON "BuilderCampaign"("projectId");
CREATE INDEX IF NOT EXISTS "BuilderCampaign_channel_idx" ON "BuilderCampaign"("channel");
CREATE INDEX IF NOT EXISTS "BuilderCampaign_status_idx" ON "BuilderCampaign"("status");
ALTER TABLE "BuilderCampaign" ADD CONSTRAINT "BuilderCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BuilderActivityLog" (
  "id" TEXT NOT NULL,
  "builderId" TEXT NOT NULL,
  "projectId" TEXT,
  "teamMemberId" TEXT,
  "action" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BuilderActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BuilderActivityLog_builderId_idx" ON "BuilderActivityLog"("builderId");
CREATE INDEX IF NOT EXISTS "BuilderActivityLog_projectId_idx" ON "BuilderActivityLog"("projectId");
CREATE INDEX IF NOT EXISTS "BuilderActivityLog_teamMemberId_idx" ON "BuilderActivityLog"("teamMemberId");
CREATE INDEX IF NOT EXISTS "BuilderActivityLog_action_idx" ON "BuilderActivityLog"("action");
ALTER TABLE "BuilderActivityLog" ADD CONSTRAINT "BuilderActivityLog_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuilderActivityLog" ADD CONSTRAINT "BuilderActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BuilderProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuilderActivityLog" ADD CONSTRAINT "BuilderActivityLog_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "BuilderTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
