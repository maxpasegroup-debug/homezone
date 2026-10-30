# Property catalogue integration

Source inspection only in this task; no service requests, database access, builds
or device tests. Earlier device evidence is in STAGING_DEVICE_CONNECTION_EVIDENCE.md.

GET /api/mobile/properties accepts page 1–1000 and pageSize 1–24 (default 12).
The mobile repository requests 12, checks source=database, page and hasMore, then
parses properties. The backend selects PUBLISHED Property records, applies optional
filters, sorts with an id tie-breaker, and fetches pageSize+1 to calculate hasMore.
GET /api/mobile/properties/[id] returns the same public projection for a published
record only; other records return not found. Neither public route requires login.

## Field mapping

- id, title, status: required by Listing.parse; status must equal PUBLISHED.
- description, intent, category, propertyType: string fields used by cards/details.
- city, locality, country: optional strings forming the location label.
- price, areaValue, bedrooms, bathrooms, latitude, longitude: nullable numeric
  fields; the parser accepts finite numeric/string representations and validates
  coordinates, nonnegative amounts and integer room counts.
- currency, areaUnit: optional strings accompanying amounts/area.
- coverImageUrl, mediaUrls: deduplicated image candidates; network loading still
  requires exact HOMEZONE_IMAGE_HOSTS approval.
- amenities: string list, consumed by property details.
- videoUrl, virtualTourUrl: public browser handoff only with exact
  HOMEZONE_MEDIA_HOSTS approval and user confirmation.

No private documents, owner contact details or moderation notes are in this public
projection. Empty image/media allowlists remain unchanged. Unapproved, missing or
failed images show Image unavailable; no remote images are implicitly trusted.

## Pagination and UI

Flutter replaces page one on refresh, appends/deduplicates further rows by id,
guards stale responses and uses hasMore for Load more. It stops at the server's
1000-page bound. Offset pagination is not a consistent snapshot: publication,
edits or removals between requests can shift rows; deduplication cannot recover
all skipped records. No cursor-contract rewrite was introduced.

Removed the misleading 120-result message: there is no corresponding 120-result
cap. Successful empty responses use the published-listings empty state; transport,
HTTP and parsing failures follow the error/retry path. API mode does not populate
offline sample listings. The prior public-read cookie-lifecycle correction remains
preserved in marketplace_repository.dart.

## Meaning of the earlier empty response

The unfiltered page-one request returned properties=[], hasMore=false and
source=database. Against the inspected query, that means no PUBLISHED Property
matched in the queried database at that moment. It does not establish whether
the database has no Property rows, only unpublished rows, or an unintended target.
No database records or publication status counts were inspected in this task.

## Authorized staging publication workflow (not executed)

1. Owner confirms the staging application/database identity and authorizes a
   specific listing and its public contents. Do not use production/customer data.
2. An approved account uses /dashboard/listings/new, or edits its own listing
   under /dashboard/listings/[id]/edit. Save a draft and submit for review using
   the existing listing controls. Owner creation is subject to existing validation,
   account suspension and ownership checks; do not self-assign an admin role.
3. A separately authorized ADMIN/SUPER_ADMIN reviews through the existing website
   administration, including /admin/marketplace and property verification controls.
   Existing admin moderation/verification endpoints can publish the listing;
   owner-side publication requires VERIFIED listing status. No direct SQL, seed
   script, API-security bypass or mobile admin implementation is required.
4. Public catalogue/detail visibility requires status=PUBLISHED. The default
   catalogue does not additionally require verified=true, although verifiedOnly
   filtering does. Do not silently change this existing visibility policy.
5. After separate runtime authorization, refresh mobile discovery, open the
   published listing and verify field/media behavior. Any remote media hosts must
   first receive explicit approval; the current empty allowlists disable loading.

No listing was created, edited, verified or published here. Nonempty-row parsing,
multi-page behavior, property details and media remain runtime-unverified.
