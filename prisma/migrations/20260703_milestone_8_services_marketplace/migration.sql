ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'SERVICE_BOOKING_DEPOSIT';
ALTER TYPE "PaymentProduct" ADD VALUE IF NOT EXISTS 'SERVICE_FINAL_PAYMENT';

ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "providerId" TEXT;
CREATE INDEX IF NOT EXISTS "ServiceRequest_providerId_idx" ON "ServiceRequest"("providerId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceRequest_providerId_fkey') THEN
    ALTER TABLE "ServiceRequest"
      ADD CONSTRAINT "ServiceRequest_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "portfolioUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "experienceYears" INTEGER;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "availability" TEXT;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "businessHours" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "ServiceProvider_suspended_idx" ON "ServiceProvider"("suspended");

CREATE TABLE IF NOT EXISTS "ServiceQuote" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "providerId" TEXT,
  "amount" DECIMAL(65,30),
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "message" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'sent',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceQuote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceQuote_requestId_idx" ON "ServiceQuote"("requestId");
CREATE INDEX IF NOT EXISTS "ServiceQuote_providerId_idx" ON "ServiceQuote"("providerId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceQuote_requestId_fkey') THEN
    ALTER TABLE "ServiceQuote"
      ADD CONSTRAINT "ServiceQuote_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceQuote_providerId_fkey') THEN
    ALTER TABLE "ServiceQuote"
      ADD CONSTRAINT "ServiceQuote_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ServiceQuote" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ServiceQuote" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);
ALTER TABLE "ServiceQuote" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "ServiceQuote" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "ServiceQuote" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "ServiceQuote_status_idx" ON "ServiceQuote"("status");

CREATE TABLE IF NOT EXISTS "ServiceBooking" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "quoteId" TEXT,
  "providerId" TEXT NOT NULL,
  "customerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'UPCOMING',
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "amount" DECIMAL(65,30),
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "depositAmount" DECIMAL(65,30),
  "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 10,
  "commissionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "providerPayout" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceBooking_requestId_key" ON "ServiceBooking"("requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceBooking_quoteId_key" ON "ServiceBooking"("quoteId");
CREATE INDEX IF NOT EXISTS "ServiceBooking_providerId_idx" ON "ServiceBooking"("providerId");
CREATE INDEX IF NOT EXISTS "ServiceBooking_customerId_idx" ON "ServiceBooking"("customerId");
CREATE INDEX IF NOT EXISTS "ServiceBooking_status_idx" ON "ServiceBooking"("status");
CREATE INDEX IF NOT EXISTS "ServiceBooking_scheduledAt_idx" ON "ServiceBooking"("scheduledAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceBooking_requestId_fkey') THEN
    ALTER TABLE "ServiceBooking"
      ADD CONSTRAINT "ServiceBooking_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceBooking_quoteId_fkey') THEN
    ALTER TABLE "ServiceBooking"
      ADD CONSTRAINT "ServiceBooking_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "ServiceQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceBooking_providerId_fkey') THEN
    ALTER TABLE "ServiceBooking"
      ADD CONSTRAINT "ServiceBooking_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceBooking_customerId_fkey') THEN
    ALTER TABLE "ServiceBooking"
      ADD CONSTRAINT "ServiceBooking_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ServiceReview" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceReview_bookingId_key" ON "ServiceReview"("bookingId");
CREATE INDEX IF NOT EXISTS "ServiceReview_providerId_idx" ON "ServiceReview"("providerId");
CREATE INDEX IF NOT EXISTS "ServiceReview_reviewerId_idx" ON "ServiceReview"("reviewerId");
CREATE INDEX IF NOT EXISTS "ServiceReview_status_idx" ON "ServiceReview"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceReview_bookingId_fkey') THEN
    ALTER TABLE "ServiceReview"
      ADD CONSTRAINT "ServiceReview_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "ServiceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceReview_providerId_fkey') THEN
    ALTER TABLE "ServiceReview"
      ADD CONSTRAINT "ServiceReview_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceReview_reviewerId_fkey') THEN
    ALTER TABLE "ServiceReview"
      ADD CONSTRAINT "ServiceReview_reviewerId_fkey"
      FOREIGN KEY ("reviewerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "serviceBookingId" TEXT;
CREATE INDEX IF NOT EXISTS "Payment_serviceBookingId_idx" ON "Payment"("serviceBookingId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_serviceBookingId_fkey') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_serviceBookingId_fkey"
      FOREIGN KEY ("serviceBookingId") REFERENCES "ServiceBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
