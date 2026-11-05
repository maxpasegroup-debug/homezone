-- AlterEnum
ALTER TYPE "PaymentProduct" ADD VALUE 'BUYER_PLUS';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "contactLimit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contactsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OwnerContactPreference" (
    "profileId" TEXT NOT NULL,
    "phone" TEXT,
    "sharingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerContactPreference_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "OwnerContactUnlock" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerContactUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyConversation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "buyerBlocked" BOOLEAN NOT NULL DEFAULT false,
    "ownerBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationReport" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerContactUnlock_subscriptionId_idx" ON "OwnerContactUnlock"("subscriptionId");

-- CreateIndex
CREATE INDEX "OwnerContactUnlock_ownerId_idx" ON "OwnerContactUnlock"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerContactUnlock_buyerId_ownerId_key" ON "OwnerContactUnlock"("buyerId", "ownerId");

-- CreateIndex
CREATE INDEX "PropertyConversation_buyerId_updatedAt_idx" ON "PropertyConversation"("buyerId", "updatedAt");

-- CreateIndex
CREATE INDEX "PropertyConversation_ownerId_updatedAt_idx" ON "PropertyConversation"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyConversation_propertyId_buyerId_key" ON "PropertyConversation"("propertyId", "buyerId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_id_idx" ON "ChatMessage"("conversationId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_conversationId_senderId_clientMessageId_key" ON "ChatMessage"("conversationId", "senderId", "clientMessageId");

-- CreateIndex
CREATE INDEX "ConversationReport_createdAt_idx" ON "ConversationReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationReport_conversationId_reporterId_key" ON "ConversationReport"("conversationId", "reporterId");

-- AddForeignKey
ALTER TABLE "OwnerContactPreference" ADD CONSTRAINT "OwnerContactPreference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerContactUnlock" ADD CONSTRAINT "OwnerContactUnlock_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerContactUnlock" ADD CONSTRAINT "OwnerContactUnlock_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerContactUnlock" ADD CONSTRAINT "OwnerContactUnlock_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyConversation" ADD CONSTRAINT "PropertyConversation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyConversation" ADD CONSTRAINT "PropertyConversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyConversation" ADD CONSTRAINT "PropertyConversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PropertyConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PropertyConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defense in depth for allowances and explicit sharing permission. Existing
-- products receive zero allowance; this migration never grants a paid plan.
CREATE TABLE "BuyerOwnerBlock" (
    "buyerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "buyerBlocked" BOOLEAN NOT NULL DEFAULT false,
    "ownerBlocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BuyerOwnerBlock_pkey" PRIMARY KEY ("buyerId", "ownerId"),
    CONSTRAINT "BuyerOwnerBlock_participants_check" CHECK ("buyerId" <> "ownerId")
);
CREATE INDEX "BuyerOwnerBlock_ownerId_idx" ON "BuyerOwnerBlock"("ownerId");
ALTER TABLE "BuyerOwnerBlock" ADD CONSTRAINT "BuyerOwnerBlock_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyerOwnerBlock" ADD CONSTRAINT "BuyerOwnerBlock_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_contact_allowance_check"
  CHECK ("contactLimit" >= 0 AND "contactsUsed" >= 0 AND "contactsUsed" <= "contactLimit");
ALTER TABLE "OwnerContactPreference" ADD CONSTRAINT "OwnerContactPreference_permission_check"
  CHECK (NOT "sharingEnabled" OR ("phone" IS NOT NULL AND "consentVersion" IS NOT NULL AND "consentVersion" = 'owner-contact-v1'));
ALTER TABLE "OwnerContactPreference" ADD CONSTRAINT "OwnerContactPreference_phone_check"
  CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "OwnerContactUnlock" ADD CONSTRAINT "OwnerContactUnlock_participants_check"
  CHECK ("buyerId" <> "ownerId");
ALTER TABLE "PropertyConversation" ADD CONSTRAINT "PropertyConversation_participants_check"
  CHECK ("buyerId" <> "ownerId");
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_body_check"
  CHECK (char_length("body") BETWEEN 1 AND 2000);
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_reason_check"
  CHECK (char_length("reason") BETWEEN 1 AND 500);

