-- Phase 3 Monetization & Payments

CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentProduct" AS ENUM (
  'FEATURED_LISTING',
  'PREMIUM_LISTING',
  'BROKER_MONTHLY',
  'BROKER_YEARLY',
  'BUILDER_MONTHLY',
  'BUILDER_YEARLY',
  'STUDIO_PHOTOGRAPHY',
  'STUDIO_VIDEOGRAPHY',
  'STUDIO_DRONE',
  'STUDIO_REELS'
);
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

ALTER TABLE "Property"
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "featuredUntil" TIMESTAMP(3),
  ADD COLUMN "premium" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "premiumUntil" TIMESTAMP(3);

ALTER TABLE "StudioRequest"
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "profileId" TEXT,
  "product" "PaymentProduct" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "payerId" TEXT,
  "propertyId" TEXT,
  "studioRequestId" TEXT,
  "subscriptionId" TEXT,
  "product" "PaymentProduct" NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "description" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "invoiceMetadata" JSONB NOT NULL DEFAULT '{}',
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "razorpayWebhookEventId" TEXT,
  "failureReason" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_invoiceNumber_key" ON "Payment"("invoiceNumber");
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
CREATE UNIQUE INDEX "Payment_razorpayWebhookEventId_key" ON "Payment"("razorpayWebhookEventId");

CREATE INDEX "Property_featured_featuredUntil_idx" ON "Property"("featured", "featuredUntil");
CREATE INDEX "Property_premium_premiumUntil_idx" ON "Property"("premium", "premiumUntil");
CREATE INDEX "StudioRequest_paymentStatus_idx" ON "StudioRequest"("paymentStatus");
CREATE INDEX "Payment_payerId_idx" ON "Payment"("payerId");
CREATE INDEX "Payment_propertyId_idx" ON "Payment"("propertyId");
CREATE INDEX "Payment_studioRequestId_idx" ON "Payment"("studioRequestId");
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");
CREATE INDEX "Payment_product_idx" ON "Payment"("product");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "Subscription_profileId_idx" ON "Subscription"("profileId");
CREATE INDEX "Subscription_product_idx" ON "Subscription"("product");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_endsAt_idx" ON "Subscription"("endsAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studioRequestId_fkey" FOREIGN KEY ("studioRequestId") REFERENCES "StudioRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
