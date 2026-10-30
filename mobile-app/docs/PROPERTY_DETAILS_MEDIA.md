# Property detail and media integration — 2026-10-30

Source-only implementation; nonempty catalogue, detail retrieval and Android
presentation remain unverified at runtime. No backend/configuration changes.

## Contract and mapping

GET /api/mobile/properties/[id] is public and dynamically queries Property by id
and status PUBLISHED, using mobilePropertySelect. It returns HTTP 200
{property: {...}, source: "database"}, Cache-Control: no-store; unavailable or
unpublished properties return 404. Database failures use the shared error handler.
Public readers need not own the property. Owner contact information, review notes
and private documents are excluded. Authenticated listing edits/media management
have separate ownership and permission checks.

MarketplaceRepository.detail validates the ID, sends an unauthenticated public
GET, requires source database and checks the returned ID equals the requested ID.
Listing.parse maps:

| Fields | Representation |
|---|---|
| id, title, status | Required identity/title and PUBLISHED status |
| description, intent, category, propertyType | Existing string projection |
| price, currency | Nullable decimal number/string plus currency; price fallback |
| city, locality, country | Location strings, omitting absent optional values |
| areaValue, areaUnit, bedrooms, bathrooms | Nullable numeric facts/unit |
| latitude, longitude | Nullable decimals, range-validated |
| amenities | String array, null treated as empty |
| coverImageUrl, mediaUrls | Deduplicated gallery URL collection |
| videoUrl, virtualTourUrl | Nullable public HTTPS handoff links |

Prisma stores public image URLs directly in Property.coverImageUrl/mediaUrls,
not a separate photo relation. PropertyDocument and PrivateFile relations are
separate protected resources. Decimal JSON values may be strings; the mobile
parser accepts validated numeric strings without making nullable fields mandatory.

## Navigation and UI

Discovery opens AccountListingScreen with the real ID, which renders
LivePropertyScreen. Named /property and related listings reuse the same flow.
Detail starts its request on initialization and supports retry. The gallery is a
scrollable list with InteractiveViewer zoom, not a duplicate detail page. Missing
photos and failed image decoding use the existing unavailable fallback.

Changes: display the already-parsed category; show loading before retained
FutureBuilder data/error on detail retry or image URL change; reload when a detail
widget receives a new ID/repository; prevent an obsolete detail completion from
starting related-listing/history work for a different widget property.

## Media security

HOMEZONE_IMAGE_HOSTS and HOMEZONE_MEDIA_HOSTS remain exact-host lists. The staging
JSON currently leaves both empty: remote images and video/tour handoff are
intentionally unavailable. No hosts were added or inferred.

Images use a separate credential-free HttpClient: HTTPS, no URL user info or
fragment, port 443, exact approved host, redirects disabled, image MIME required,
8 MiB byte limit, 10-second connection and 20-second total timeout. Relative,
HTTP and disallowed URLs fall back; they are not resolved to the API origin.

Video/tour URLs require HTTPS, approved host, no credentials/fragment, port 443
and a maximum length of 2048. A confirmation precedes the existing native browser
handoff; no app credentials are attached. Host-list whitespace/case normalization
now matches the image policy. External browser redirects are browser/provider
controlled; the app allowlist validates the initial handoff, not subsequent pages.

Existing uploads use the Cloudinary-backed media route. Mobile photo upload
requires an authenticated nonsuspended OWNER/BROKER and an owned property; it
validates JPEG/PNG/WebP bytes and attaches the returned public URL transactionally.
Private documents are not public gallery images. Provider configuration and host
approval remain owner responsibilities; neither was exercised.

## Remaining verification

Owner must authorize an existing published staging property (or separately
authorize creation/publication through the supported website), approved media
hosts and later build/device/live-read verification. Verify real field rendering,
null values, unpublished/unknown IDs, retry/network failures, cover/additional
images, gallery zoom and confirmed browser handoff. Authentication and Android
black-screen verification remain separate tasks.

Files changed: marketplace_screen.dart, public_listing_media_button.dart and this
document. Git status/diff and source reads only; no tests, analysis, builds, device
commands, HTTP requests, database operations, publishing, migrations, production
changes, commits, pushes or deployments were performed.
