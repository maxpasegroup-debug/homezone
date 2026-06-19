-- Phase 4 Property Reels + Lead Generation Engine

CREATE TYPE "LeadSource" AS ENUM ('PROPERTY', 'REEL', 'SEARCH', 'DASHBOARD');
CREATE TYPE "ContactAction" AS ENUM ('CALL', 'WHATSAPP', 'INQUIRY');

ALTER TABLE "Property"
  ADD COLUMN "callClicks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "whatsappClicks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "inquirySubmissions" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PropertyReel"
  ADD COLUMN "viewsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sharesCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "leadsCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Lead"
  ADD COLUMN "reelId" TEXT,
  ADD COLUMN "source_new" "LeadSource" NOT NULL DEFAULT 'PROPERTY',
  ADD COLUMN "contactAction" "ContactAction";

UPDATE "Lead"
SET "source_new" = CASE
  WHEN upper("source") = 'REEL' THEN 'REEL'::"LeadSource"
  WHEN upper("source") = 'SEARCH' THEN 'SEARCH'::"LeadSource"
  WHEN upper("source") = 'DASHBOARD' THEN 'DASHBOARD'::"LeadSource"
  ELSE 'PROPERTY'::"LeadSource"
END;

ALTER TABLE "Lead" DROP COLUMN "source";
ALTER TABLE "Lead" RENAME COLUMN "source_new" TO "source";

CREATE TABLE "ReelLike" (
  "userId" TEXT NOT NULL,
  "reelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReelLike_pkey" PRIMARY KEY ("userId", "reelId")
);

CREATE TABLE "SavedReel" (
  "userId" TEXT NOT NULL,
  "reelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedReel_pkey" PRIMARY KEY ("userId", "reelId")
);

CREATE TABLE "ProfileFollow" (
  "followerId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProfileFollow_pkey" PRIMARY KEY ("followerId", "targetId")
);

CREATE INDEX "Property_callClicks_idx" ON "Property"("callClicks");
CREATE INDEX "Property_whatsappClicks_idx" ON "Property"("whatsappClicks");
CREATE INDEX "Property_inquirySubmissions_idx" ON "Property"("inquirySubmissions");
CREATE INDEX "PropertyReel_viewsCount_idx" ON "PropertyReel"("viewsCount");
CREATE INDEX "PropertyReel_likesCount_idx" ON "PropertyReel"("likesCount");
CREATE INDEX "PropertyReel_savesCount_idx" ON "PropertyReel"("savesCount");
CREATE INDEX "PropertyReel_sharesCount_idx" ON "PropertyReel"("sharesCount");
CREATE INDEX "PropertyReel_leadsCount_idx" ON "PropertyReel"("leadsCount");
CREATE INDEX "Lead_reelId_idx" ON "Lead"("reelId");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE INDEX "Lead_contactAction_idx" ON "Lead"("contactAction");
CREATE INDEX "ReelLike_reelId_idx" ON "ReelLike"("reelId");
CREATE INDEX "ReelLike_createdAt_idx" ON "ReelLike"("createdAt");
CREATE INDEX "SavedReel_reelId_idx" ON "SavedReel"("reelId");
CREATE INDEX "SavedReel_createdAt_idx" ON "SavedReel"("createdAt");
CREATE INDEX "ProfileFollow_targetId_idx" ON "ProfileFollow"("targetId");
CREATE INDEX "ProfileFollow_createdAt_idx" ON "ProfileFollow"("createdAt");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "PropertyReel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReelLike" ADD CONSTRAINT "ReelLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReelLike" ADD CONSTRAINT "ReelLike_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "PropertyReel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedReel" ADD CONSTRAINT "SavedReel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedReel" ADD CONSTRAINT "SavedReel_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "PropertyReel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileFollow" ADD CONSTRAINT "ProfileFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileFollow" ADD CONSTRAINT "ProfileFollow_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
