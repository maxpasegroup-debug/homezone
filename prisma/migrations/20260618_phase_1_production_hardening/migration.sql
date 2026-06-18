-- Phase 1 production hardening.
-- Safely maps legacy BUYER roles to USER and constrains property intent.

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM (
  'USER',
  'OWNER',
  'BROKER',
  'BUILDER',
  'SERVICE_PROVIDER',
  'ADMIN',
  'SUPER_ADMIN'
);

ALTER TABLE "Profile" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Profile"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (
    CASE "role"::text
      WHEN 'BUYER' THEN 'USER'
      ELSE "role"::text
    END
  )::"UserRole";
ALTER TABLE "Profile" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "UserRole_old";

CREATE TYPE "PropertyIntent" AS ENUM ('BUY', 'RENT', 'LEASE', 'INVEST');

ALTER TABLE "Property"
  ALTER COLUMN "intent" TYPE "PropertyIntent"
  USING (
    CASE lower("intent"::text)
      WHEN 'rent' THEN 'RENT'
      WHEN 'lease' THEN 'LEASE'
      WHEN 'invest' THEN 'INVEST'
      ELSE 'BUY'
    END
  )::"PropertyIntent";

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'PHONE_VERIFICATION',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Property_country_city_idx" ON "Property"("country", "city");
CREATE INDEX "Property_intent_idx" ON "Property"("intent");
CREATE INDEX "Property_status_createdAt_idx" ON "Property"("status", "createdAt");
CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");
CREATE INDEX "Lead_propertyId_idx" ON "Lead"("propertyId");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "PropertyReel_propertyId_idx" ON "PropertyReel"("propertyId");
CREATE INDEX "PropertyReel_ownerId_idx" ON "PropertyReel"("ownerId");
CREATE INDEX "PropertyReel_status_idx" ON "PropertyReel"("status");
CREATE INDEX "PropertyReel_createdAt_idx" ON "PropertyReel"("createdAt");
CREATE INDEX "StudioRequest_requesterId_idx" ON "StudioRequest"("requesterId");
CREATE INDEX "StudioRequest_propertyId_idx" ON "StudioRequest"("propertyId");
CREATE INDEX "StudioRequest_status_idx" ON "StudioRequest"("status");
CREATE INDEX "ServiceRequest_requesterId_idx" ON "ServiceRequest"("requesterId");
CREATE INDEX "ServiceRequest_category_idx" ON "ServiceRequest"("category");
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");
CREATE INDEX "ServiceProvider_profileId_idx" ON "ServiceProvider"("profileId");
CREATE INDEX "ServiceProvider_category_idx" ON "ServiceProvider"("category");
CREATE INDEX "ServiceProvider_verified_idx" ON "ServiceProvider"("verified");
CREATE INDEX "AiReport_userId_idx" ON "AiReport"("userId");
CREATE INDEX "AiReport_propertyId_idx" ON "AiReport"("propertyId");
CREATE INDEX "AiReport_reportType_idx" ON "AiReport"("reportType");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "OtpChallenge_userId_idx" ON "OtpChallenge"("userId");
CREATE INDEX "OtpChallenge_phone_idx" ON "OtpChallenge"("phone");
CREATE INDEX "OtpChallenge_phone_purpose_idx" ON "OtpChallenge"("phone", "purpose");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
