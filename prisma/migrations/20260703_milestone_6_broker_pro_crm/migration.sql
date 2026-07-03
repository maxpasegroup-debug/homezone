ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'BROKER_ENTERPRISE';

CREATE TABLE IF NOT EXISTS "BrokerTeamMember" (
  "id" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "profileId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "role" TEXT NOT NULL DEFAULT 'AGENT',
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrokerTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrokerTeamMember_brokerId_idx" ON "BrokerTeamMember"("brokerId");
CREATE INDEX IF NOT EXISTS "BrokerTeamMember_profileId_idx" ON "BrokerTeamMember"("profileId");
CREATE INDEX IF NOT EXISTS "BrokerTeamMember_active_idx" ON "BrokerTeamMember"("active");

ALTER TABLE "BrokerTeamMember" ADD CONSTRAINT "BrokerTeamMember_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrokerTeamMember" ADD CONSTRAINT "BrokerTeamMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BrokerLeadAssignment" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "assignedById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrokerLeadAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrokerLeadAssignment_leadId_idx" ON "BrokerLeadAssignment"("leadId");
CREATE INDEX IF NOT EXISTS "BrokerLeadAssignment_brokerId_idx" ON "BrokerLeadAssignment"("brokerId");
CREATE INDEX IF NOT EXISTS "BrokerLeadAssignment_assigneeId_idx" ON "BrokerLeadAssignment"("assigneeId");
CREATE INDEX IF NOT EXISTS "BrokerLeadAssignment_createdAt_idx" ON "BrokerLeadAssignment"("createdAt");

ALTER TABLE "BrokerLeadAssignment" ADD CONSTRAINT "BrokerLeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrokerLeadAssignment" ADD CONSTRAINT "BrokerLeadAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "BrokerTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrokerLeadAssignment" ADD CONSTRAINT "BrokerLeadAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BrokerCommission" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "brokerId" TEXT NOT NULL,
  "agentId" TEXT,
  "dealValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "commissionPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "commissionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrokerCommission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrokerCommission_leadId_idx" ON "BrokerCommission"("leadId");
CREATE INDEX IF NOT EXISTS "BrokerCommission_brokerId_idx" ON "BrokerCommission"("brokerId");
CREATE INDEX IF NOT EXISTS "BrokerCommission_agentId_idx" ON "BrokerCommission"("agentId");
CREATE INDEX IF NOT EXISTS "BrokerCommission_status_idx" ON "BrokerCommission"("status");

ALTER TABLE "BrokerCommission" ADD CONSTRAINT "BrokerCommission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrokerCommission" ADD CONSTRAINT "BrokerCommission_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrokerCommission" ADD CONSTRAINT "BrokerCommission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BrokerAutomationRule" (
  "id" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "provider" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrokerAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrokerAutomationRule_brokerId_idx" ON "BrokerAutomationRule"("brokerId");
CREATE INDEX IF NOT EXISTS "BrokerAutomationRule_channel_idx" ON "BrokerAutomationRule"("channel");
CREATE INDEX IF NOT EXISTS "BrokerAutomationRule_enabled_idx" ON "BrokerAutomationRule"("enabled");

ALTER TABLE "BrokerAutomationRule" ADD CONSTRAINT "BrokerAutomationRule_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BrokerClientDocument" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "documentType" TEXT NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrokerClientDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrokerClientDocument_leadId_idx" ON "BrokerClientDocument"("leadId");
CREATE INDEX IF NOT EXISTS "BrokerClientDocument_brokerId_idx" ON "BrokerClientDocument"("brokerId");
CREATE INDEX IF NOT EXISTS "BrokerClientDocument_documentType_idx" ON "BrokerClientDocument"("documentType");

ALTER TABLE "BrokerClientDocument" ADD CONSTRAINT "BrokerClientDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrokerClientDocument" ADD CONSTRAINT "BrokerClientDocument_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
