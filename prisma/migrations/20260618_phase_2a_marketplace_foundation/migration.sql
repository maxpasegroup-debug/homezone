-- Phase 2A global marketplace foundation.
-- Keeps currency as a string for future expansion while validating allowed values in app code.

CREATE TYPE "PropertyCategory" AS ENUM (
  'RESIDENTIAL',
  'COMMERCIAL',
  'LAND',
  'INDUSTRIAL',
  'AGRICULTURAL',
  'HOSPITALITY',
  'LUXURY'
);

ALTER TABLE "Property"
  ADD COLUMN "category" "PropertyCategory" NOT NULL DEFAULT 'RESIDENTIAL',
  ADD COLUMN "timezone" TEXT;

UPDATE "Property"
SET "category" = CASE
  WHEN lower("propertyType") LIKE '%commercial%' THEN 'COMMERCIAL'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%office%' THEN 'COMMERCIAL'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%shop%' THEN 'COMMERCIAL'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%land%' THEN 'LAND'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%farm%' THEN 'AGRICULTURAL'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%industrial%' THEN 'INDUSTRIAL'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%warehouse%' THEN 'INDUSTRIAL'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%hotel%' THEN 'HOSPITALITY'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%resort%' THEN 'HOSPITALITY'::"PropertyCategory"
  WHEN lower("propertyType") LIKE '%luxury%' THEN 'LUXURY'::"PropertyCategory"
  ELSE 'RESIDENTIAL'::"PropertyCategory"
END;

UPDATE "Property"
SET "currency" = upper("currency")
WHERE "currency" IS NOT NULL;

UPDATE "Property"
SET "currency" = 'INR'
WHERE "currency" IS NULL
  OR "currency" NOT IN ('INR', 'AED', 'USD', 'GBP', 'EUR');

CREATE INDEX "Property_country_state_city_idx" ON "Property"("country", "state", "city");
CREATE INDEX "Property_category_idx" ON "Property"("category");
CREATE INDEX "Property_currency_idx" ON "Property"("currency");
CREATE INDEX "Property_price_idx" ON "Property"("price");
CREATE INDEX "Property_bedrooms_idx" ON "Property"("bedrooms");
CREATE INDEX "Property_bathrooms_idx" ON "Property"("bathrooms");
CREATE INDEX "Property_verified_idx" ON "Property"("verified");
CREATE INDEX "Property_latitude_longitude_idx" ON "Property"("latitude", "longitude");
