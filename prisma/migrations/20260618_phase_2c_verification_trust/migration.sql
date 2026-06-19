-- Phase 2C Verification & Trust Foundation

CREATE TYPE "PropertyVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ProfileVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

ALTER TABLE "Property"
  ADD COLUMN "verificationStatus" "PropertyVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedBy" TEXT,
  ADD COLUMN "verificationNotes" TEXT;

ALTER TABLE "Profile"
  ADD COLUMN "verificationStatus" "ProfileVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedBy" TEXT,
  ADD COLUMN "verificationNotes" TEXT;

UPDATE "Property"
SET "verificationStatus" = 'VERIFIED'
WHERE "verified" = true;

CREATE INDEX "Property_verificationStatus_idx" ON "Property"("verificationStatus");
CREATE INDEX "Property_verifiedBy_idx" ON "Property"("verifiedBy");
CREATE INDEX "Profile_role_verificationStatus_idx" ON "Profile"("role", "verificationStatus");
CREATE INDEX "Profile_verificationStatus_idx" ON "Profile"("verificationStatus");
CREATE INDEX "Profile_verifiedBy_idx" ON "Profile"("verifiedBy");
