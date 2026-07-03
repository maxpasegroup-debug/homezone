ALTER TYPE "PropertyVerificationStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "PropertyVerificationStatus" ADD VALUE IF NOT EXISTS 'NEEDS_CHANGES';

CREATE TYPE "PropertyDocumentType" AS ENUM (
  'SALE_DEED',
  'ENCUMBRANCE_CERTIFICATE',
  'TAX_RECEIPT',
  'APPROVAL_DOCUMENT',
  'FLOOR_PLAN',
  'OWNERSHIP_PROOF',
  'OTHER'
);

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "virtualTourUrl" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "comparisonCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PropertyDocument" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "documentType" "PropertyDocumentType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyDocument_propertyId_idx" ON "PropertyDocument"("propertyId");
CREATE INDEX "PropertyDocument_uploadedById_idx" ON "PropertyDocument"("uploadedById");
CREATE INDEX "PropertyDocument_documentType_idx" ON "PropertyDocument"("documentType");

ALTER TABLE "PropertyDocument"
  ADD CONSTRAINT "PropertyDocument_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyDocument"
  ADD CONSTRAINT "PropertyDocument_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
