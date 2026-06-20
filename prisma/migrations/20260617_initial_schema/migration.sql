-- Initial HomeZone schema baseline.
-- Phase migrations after this file harden and extend these base tables.

CREATE TYPE "UserRole" AS ENUM (
  'BUYER',
  'OWNER',
  'BROKER',
  'BUILDER',
  'SERVICE_PROVIDER',
  'ADMIN',
  'SUPER_ADMIN'
);

CREATE TYPE "ListingStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE "LeadStage" AS ENUM (
  'NEW',
  'QUALIFIED',
  'SITE_VISIT',
  'NEGOTIATION',
  'WON',
  'LOST',
  'NURTURE'
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,

  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fullName" TEXT,
  "phone" TEXT,
  "whatsappVerified" BOOLEAN NOT NULL DEFAULT false,
  "role" "UserRole" NOT NULL DEFAULT 'BUYER',
  "country" TEXT NOT NULL DEFAULT 'India',
  "city" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Property" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "intent" TEXT NOT NULL,
  "propertyType" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'India',
  "state" TEXT,
  "city" TEXT NOT NULL,
  "locality" TEXT,
  "address" TEXT,
  "latitude" DECIMAL(65,30),
  "longitude" DECIMAL(65,30),
  "price" DECIMAL(65,30),
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "areaValue" DECIMAL(65,30),
  "areaUnit" TEXT NOT NULL DEFAULT 'sqft',
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "mediaUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "videoUrl" TEXT,
  "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "aiSummary" TEXT,
  "propertyScore" INTEGER,
  "riskScore" INTEGER,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedProperty" (
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedProperty_pkey" PRIMARY KEY ("userId", "propertyId")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT,
  "assignedTo" TEXT,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "message" TEXT,
  "source" TEXT NOT NULL DEFAULT 'PROPERTY',
  "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
  "aiScore" INTEGER NOT NULL DEFAULT 0,
  "nextAction" TEXT,
  "followUpAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyReel" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT,
  "ownerId" TEXT,
  "title" TEXT NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "likesCount" INTEGER NOT NULL DEFAULT 0,
  "savesCount" INTEGER NOT NULL DEFAULT 0,
  "status" "ListingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PropertyReel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT,
  "propertyId" TEXT,
  "serviceType" TEXT NOT NULL,
  "city" TEXT,
  "budget" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudioRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT,
  "category" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "budget" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceProvider" (
  "id" TEXT NOT NULL,
  "profileId" TEXT,
  "businessName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "city" TEXT,
  "rating" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "priceLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuilderProject" (
  "id" TEXT NOT NULL,
  "builderId" TEXT,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "locality" TEXT,
  "description" TEXT,
  "unitsCount" INTEGER,
  "availableUnits" INTEGER,
  "mediaUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "campaignStatus" TEXT NOT NULL DEFAULT 'draft',
  "aiReport" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BuilderProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "propertyId" TEXT,
  "reportType" TEXT NOT NULL,
  "input" JSONB NOT NULL DEFAULT '{}',
  "output" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Profile_phone_key" ON "Profile"("phone");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PropertyReel" ADD CONSTRAINT "PropertyReel_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioRequest" ADD CONSTRAINT "StudioRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioRequest" ADD CONSTRAINT "StudioRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuilderProject" ADD CONSTRAINT "BuilderProject_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
