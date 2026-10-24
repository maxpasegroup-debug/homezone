-- Review legacy case-insensitive duplicates before applying; never auto-merge accounts.
-- Prisma cannot express this PostgreSQL functional index in schema.prisma.
CREATE UNIQUE INDEX "User_email_normalized_key" ON "User" (lower("email")) WHERE "email" IS NOT NULL;

CREATE TABLE "EmailRegistration" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailRegistration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailRegistration_email_key" ON "EmailRegistration"("email");
CREATE INDEX "EmailRegistration_expiresAt_idx" ON "EmailRegistration"("expiresAt");
CREATE TABLE "RegistrationBudget" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationBudget_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RegistrationBudget_resetAt_idx" ON "RegistrationBudget"("resetAt");
