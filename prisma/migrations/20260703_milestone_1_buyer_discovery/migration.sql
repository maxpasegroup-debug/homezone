-- Buyer discovery persistence: recently viewed properties and named shortlists.

CREATE TABLE "PropertyView" (
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PropertyView_pkey" PRIMARY KEY ("userId", "propertyId")
);

CREATE TABLE "PropertyShortlist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PropertyShortlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShortlistProperty" (
  "shortlistId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShortlistProperty_pkey" PRIMARY KEY ("shortlistId", "propertyId")
);

CREATE INDEX "PropertyView_userId_viewedAt_idx" ON "PropertyView"("userId", "viewedAt");
CREATE INDEX "PropertyView_propertyId_idx" ON "PropertyView"("propertyId");

CREATE UNIQUE INDEX "PropertyShortlist_userId_name_key" ON "PropertyShortlist"("userId", "name");
CREATE INDEX "PropertyShortlist_userId_updatedAt_idx" ON "PropertyShortlist"("userId", "updatedAt");

CREATE INDEX "ShortlistProperty_propertyId_idx" ON "ShortlistProperty"("propertyId");
CREATE INDEX "ShortlistProperty_createdAt_idx" ON "ShortlistProperty"("createdAt");

ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyShortlist" ADD CONSTRAINT "PropertyShortlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShortlistProperty" ADD CONSTRAINT "ShortlistProperty_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "PropertyShortlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortlistProperty" ADD CONSTRAINT "ShortlistProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
