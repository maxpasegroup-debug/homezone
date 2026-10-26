-- Additive only. Review capacity, keys, backup and retention before deployment.
CREATE TABLE "PrivateFile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "propertyId" TEXT,
  "leadId" TEXT,
  "studioRequestId" TEXT,
  "uploadedById" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "keyId" TEXT NOT NULL,
  "ciphertext" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivateFile_scope_check" CHECK (
    ("scope" = 'property' AND "propertyId" IS NOT NULL AND "leadId" IS NULL AND "studioRequestId" IS NULL) OR
    ("scope" = 'lead' AND "propertyId" IS NULL AND "leadId" IS NOT NULL AND "studioRequestId" IS NULL) OR
    ("scope" = 'studio' AND "propertyId" IS NULL AND "leadId" IS NULL AND "studioRequestId" IS NOT NULL)
  ),
  CONSTRAINT "PrivateFile_size_check" CHECK ("bytes" > 0 AND "bytes" <= 524288 AND octet_length("ciphertext") = "bytes" + 28),
  CONSTRAINT "PrivateFile_property_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PrivateFile_lead_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PrivateFile_studio_fkey" FOREIGN KEY ("studioRequestId") REFERENCES "StudioRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PrivateFile_propertyId_createdAt_idx" ON "PrivateFile"("propertyId", "createdAt");
CREATE INDEX "PrivateFile_leadId_createdAt_idx" ON "PrivateFile"("leadId", "createdAt");
CREATE INDEX "PrivateFile_studioRequestId_createdAt_idx" ON "PrivateFile"("studioRequestId", "createdAt");

-- Review records do not authorize destructive actions or financial execution.
CREATE TABLE "AccountServiceRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('DELETION_REVIEW', 'REFUND_REVIEW')),
  "target" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'REVIEWING', 'REVIEWED', 'CLOSED')),
  "reviewNote" TEXT,
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountServiceRequest_profile_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccountServiceRequest_profileId_kind_target_key" ON "AccountServiceRequest"("profileId", "kind", "target");
CREATE INDEX "AccountServiceRequest_status_createdAt_idx" ON "AccountServiceRequest"("status", "createdAt");
