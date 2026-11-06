// Public project image attachments only. PDFs retain the separate private-file
// architecture and are deliberately not accepted by the native image uploader.
export const builderProjectImageUploadFields = [
  "mediaUrls", "floorPlanUrls", "masterPlanUrl", "brochureUrl"
] as const;

export const builderProjectMediaSelect = {
  id: true,
  status: true,
  mediaUrls: true,
  floorPlanUrls: true,
  masterPlanUrl: true,
  brochureUrl: true,
  updatedAt: true
} as const;
