-- Additive keyset-pagination support. Not applied by this implementation pass.
-- Owner must review table sizes, index-build locks, disk capacity and recovery
-- before authorizing the existing deployment migration runner.
CREATE INDEX "SavedProperty_userId_createdAt_propertyId_idx" ON "SavedProperty"("userId", "createdAt", "propertyId");
CREATE INDEX "PropertyShortlist_userId_createdAt_id_idx" ON "PropertyShortlist"("userId", "createdAt", "id");
CREATE INDEX "ShortlistProperty_shortlistId_createdAt_propertyId_idx" ON "ShortlistProperty"("shortlistId", "createdAt", "propertyId");
CREATE INDEX "Lead_userId_createdAt_id_idx" ON "Lead"("userId", "createdAt", "id");
