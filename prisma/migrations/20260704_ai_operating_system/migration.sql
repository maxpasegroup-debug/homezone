-- HomeZone AI Operating System foundation.

DO $$ BEGIN CREATE TYPE "AIProvider" AS ENUM ('OPENAI','GEMINI','ANTHROPIC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AIMessageRole" AS ENUM ('SYSTEM','USER','ASSISTANT','TOOL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AIRequestStatus" AS ENUM ('SUCCESS','FAILED','BLOCKED','FALLBACK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AIMemoryScope" AS ENUM ('SHORT_TERM','CONVERSATION','USER_PREFERENCE','SESSION','LONG_TERM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AIPrompt" (
  "id" TEXT NOT NULL,
  "promptId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "module" "NotificationModule" NOT NULL,
  "promptText" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "provider" "AIProvider",
  "model" TEXT,
  "temperature" DECIMAL(65,30) NOT NULL DEFAULT 0.4,
  "maxTokens" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "module" "NotificationModule" NOT NULL,
  "sessionId" TEXT,
  "title" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT,
  "role" "AIMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIMemory" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "conversationId" TEXT,
  "scope" "AIMemoryScope" NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIUsageLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "conversationId" TEXT,
  "promptRecordId" TEXT,
  "promptId" TEXT,
  "promptVersion" INTEGER,
  "module" "NotificationModule" NOT NULL,
  "provider" "AIProvider" NOT NULL,
  "model" TEXT NOT NULL,
  "status" "AIRequestStatus" NOT NULL DEFAULT 'SUCCESS',
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "latencyMs" INTEGER NOT NULL DEFAULT 0,
  "context" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AISetting" (
  "id" TEXT NOT NULL,
  "module" "NotificationModule" NOT NULL,
  "provider" "AIProvider" NOT NULL DEFAULT 'OPENAI',
  "model" TEXT NOT NULL,
  "temperature" DECIMAL(65,30) NOT NULL DEFAULT 0.4,
  "maxTokens" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 30,
  "dailyCostLimit" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "featureFlags" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AISetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AIPrompt_promptId_version_key" ON "AIPrompt"("promptId", "version");
CREATE INDEX IF NOT EXISTS "AIPrompt_promptId_idx" ON "AIPrompt"("promptId");
CREATE INDEX IF NOT EXISTS "AIPrompt_module_idx" ON "AIPrompt"("module");
CREATE INDEX IF NOT EXISTS "AIPrompt_active_idx" ON "AIPrompt"("active");
CREATE INDEX IF NOT EXISTS "AIConversation_userId_idx" ON "AIConversation"("userId");
CREATE INDEX IF NOT EXISTS "AIConversation_module_idx" ON "AIConversation"("module");
CREATE INDEX IF NOT EXISTS "AIConversation_sessionId_idx" ON "AIConversation"("sessionId");
CREATE INDEX IF NOT EXISTS "AIConversation_createdAt_idx" ON "AIConversation"("createdAt");
CREATE INDEX IF NOT EXISTS "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "AIMessage_userId_idx" ON "AIMessage"("userId");
CREATE INDEX IF NOT EXISTS "AIMessage_role_idx" ON "AIMessage"("role");
CREATE INDEX IF NOT EXISTS "AIMessage_createdAt_idx" ON "AIMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "AIMemory_userId_idx" ON "AIMemory"("userId");
CREATE INDEX IF NOT EXISTS "AIMemory_conversationId_idx" ON "AIMemory"("conversationId");
CREATE INDEX IF NOT EXISTS "AIMemory_scope_idx" ON "AIMemory"("scope");
CREATE INDEX IF NOT EXISTS "AIMemory_key_idx" ON "AIMemory"("key");
CREATE INDEX IF NOT EXISTS "AIMemory_expiresAt_idx" ON "AIMemory"("expiresAt");
CREATE INDEX IF NOT EXISTS "AIUsageLog_userId_idx" ON "AIUsageLog"("userId");
CREATE INDEX IF NOT EXISTS "AIUsageLog_conversationId_idx" ON "AIUsageLog"("conversationId");
CREATE INDEX IF NOT EXISTS "AIUsageLog_promptId_idx" ON "AIUsageLog"("promptId");
CREATE INDEX IF NOT EXISTS "AIUsageLog_module_idx" ON "AIUsageLog"("module");
CREATE INDEX IF NOT EXISTS "AIUsageLog_provider_idx" ON "AIUsageLog"("provider");
CREATE INDEX IF NOT EXISTS "AIUsageLog_status_idx" ON "AIUsageLog"("status");
CREATE INDEX IF NOT EXISTS "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AISetting_module_key" ON "AISetting"("module");
CREATE INDEX IF NOT EXISTS "AISetting_provider_idx" ON "AISetting"("provider");
CREATE INDEX IF NOT EXISTS "AISetting_enabled_idx" ON "AISetting"("enabled");

DO $$ BEGIN ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_promptRecordId_fkey" FOREIGN KEY ("promptRecordId") REFERENCES "AIPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
