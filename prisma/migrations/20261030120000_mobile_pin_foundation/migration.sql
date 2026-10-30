-- Additive foundation only. No enrollment, account linking or data backfill.
-- Review target identity, pending migrations, backup and capacity before deployment.
CREATE TABLE "MobilePinCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "normalizedMobile" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobilePinCredential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MobilePinCredential_mobile_check" CHECK ("normalizedMobile" ~ '^\+91[6-9][0-9]{9}$'),
  CONSTRAINT "MobilePinCredential_hash_check" CHECK ("pinHash" ~ '^scrypt:v1:n32768:r8:p1:[a-f0-9]{32}:[a-f0-9]{128}$')
);
CREATE UNIQUE INDEX "MobilePinCredential_userId_key" ON "MobilePinCredential"("userId");
CREATE UNIQUE INDEX "MobilePinCredential_normalizedMobile_key" ON "MobilePinCredential"("normalizedMobile");
ALTER TABLE "MobilePinCredential" ADD CONSTRAINT "MobilePinCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MobilePinLoginBudget" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobilePinLoginBudget_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "MobilePinLoginBudget_count_check" CHECK ("count" >= 0)
);
CREATE INDEX "MobilePinLoginBudget_resetAt_idx" ON "MobilePinLoginBudget"("resetAt");
