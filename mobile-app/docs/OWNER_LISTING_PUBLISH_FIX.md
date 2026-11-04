# Owner sale/rental form and photo publication correction

Date: 2026-11-04. Baseline: `main/6d07cc433dbd5332dbb7b55db608621f569e5902`.

## Confirmed causes

1. The Flutter Owner form uses a lazy ListView. Purpose, Category and Currency
   updated retained controllers without rebuilding the dropdown's initial value.
   Scrolling offscreen disposed those widgets, and rebuilding them showed an empty
   selection. BUY and RENT regression tests reproduced this before correction.
2. FormState.validate only covered mounted fields. Required fields above the
   visible Publish button could be missed when scrolling unregistered them.
3. Every failure after a saved private draft was reduced to the same photo-count
   message. Zero confirmed photos means the first upload did not return an accepted
   acknowledgment; it does not prove no provider-side write occurred.
4. Fresh read-only Railway saved-variable inspection of the explicitly scoped
   staging backend confirmed these requirements absent:

   | Name | Present |
   | --- | --- |
   | `CLOUDINARY_CLOUD_NAME` | No |
   | `CLOUDINARY_API_KEY` | No |
   | `CLOUDINARY_API_SECRET` | No |

   The returned service/environment IDs and public domain matched the requested
   staging target. Project `1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, environment
   `2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, service
   `ea6ca516-4063-4ed1-be95-bebcc0d1af00`, domain
   `homezone-staging.up.railway.app`. Only identity/presence booleans were displayed;
   no secret values were displayed, saved or changed. This is current configuration
   evidence, not a captured HTTP response from the user's particular failed upload.

## Implemented source corrections

- Dropdown changes rebuild their retained initial values; stable field keys keep
  choices aligned. Purpose/Category/Currency survive scrolling and validation.
- All retained controls use the same validation as mounted widgets. Missing fields
  block requests and show visible guidance beside the existing inline error.
- Before creating a listing with selected photos, Flutter reads the existing
  authenticated `/api/mobile/capabilities` endpoint. Its new
  `propertyPhotoUploadConfigured` boolean must be exactly true and the response
  must not contain a negative acknowledgment. Missing/false/malformed readiness or
  a failed read stops before any property POST, preserving inputs/photos on this
  screen and permitting a safe user retry. Older backends missing this field fail
  closed until the matching backend release.
- The capability reports configuration presence only, not provider health or
  valid credentials. The actual provider request still needs to succeed.
- The existing media upload service returns fixed, sanitized categories:
  HTTP503 `PROPERTY_PHOTO_STORAGE_UNAVAILABLE`, HTTP502
  `PROPERTY_PHOTO_UPLOAD_FAILED`, HTTP502
  `PROPERTY_PHOTO_CONFIRMATION_UNAVAILABLE`. Successful fields remain unchanged.
- The repository retains only allowlisted code/status combinations for that upload
  route. UI errors distinguish unavailable storage, provider failure, rate limits,
  network uncertainty and invalid confirmation. Raw response/provider details do
  not reach the UI or logs. Before any create, the UI explicitly says no listing
  was created. After a draft exists, it retains the draft and asks for readback;
  it never blindly retries non-idempotent create/upload/publication operations.

The four-photo requirement, private draft -> serial uploads -> independent stored
gallery read -> explicit PUBLISHED acknowledgment, ownership, suspension, roles,
TLS, media host restrictions and WebSocket invalidation remain in place. No new
API client, storage provider, schema, migration or account is introduced. Existing
drafts are neither deleted nor automatically published.

## Verification

Local fixtures cover sale/rental payloads, dropdown remounts, offscreen required
fields, blocked/unknown readiness without draft writes, retained details/photos,
manual retry after readiness recovery, safe upload errors, no duplicate creation,
session changes, galleries and the four-photo publication sequence.

Backend checks passed: 39 publication/photo/storage checks, 11 mobile API checks,
41 WebSocket checks and TypeScript checking. The final Flutter regression run
passed all 106 checks, including the negative-readiness-acknowledgment guard.
APK evidence is recorded in the integration status document. Focused analysis reported zero
errors/warnings and 38 informational lints (`--no-fatal-infos`, exit 0). No actual
Cloudinary upload, device/account/property mutation or deployed-runtime acceptance
was performed for this correction.

Updated staging debug APK build PASSED through
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
Artifact: `mobile-app/build/app/outputs/apk/debug/app-debug.apk`, 184939163 bytes,
SHA256 `829489e20f02fc1efef7c6638c8421d12b622565c40ae603fe9d5494cb77b3e6`.
Provenance: `mobile-app/build/android-source-builds/2026-11-04T03-17-26-583Z-22300/build-record.json`.
The prior APK is preserved as `previous-app-debug.apk` in that directory. This
candidate targets staging and was not installed or launched. It needs the matching
backend readiness contract; installation alone does not configure photo storage.

## Exact changed files

- `mobile-app/lib/features/workspace/workspace_screen.dart`: retained dropdown
  state, full field validation, preflight and stage-specific failure feedback.
- `mobile-app/lib/features/marketplace/marketplace_repository.dart`: allowlisted
  upload error categories without raw bodies/metadata.
- `src/app/api/mobile/capabilities/route.ts`: authenticated storage presence flag.
- `backend/api/media/upload/route.ts`: safe configuration/provider/ack errors.
- `mobile-app/test/workspace_form_state_test.dart` (new),
  `mobile-app/test/create_listing_photos_test.dart`,
  `tests/property-photo-storage.test.mjs` (new): regression coverage.
- `package.json`: focused property-photo test script included in normal tests.
- This document, `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`,
  `HOMEZONE_REMAINING_BLOCKERS.md`, `OWNER_DIRECT_PUBLICATION.md`: current evidence
  and release handover.

## Remaining live requirements

Provision the three existing Cloudinary settings privately in **staging**, with
separate approval for variable changes/restarts and backend deployment. Do not
paste credential values into chat or Git. Release this matching backend and APK
together; the new client deliberately blocks creation when an old backend cannot
confirm readiness. Review Railway's existing predeploy pending-migration set and
recoverability before a release; this change adds no migration.

After approval for one controlled staging mutation, verify four actual device
photos upload, stored URLs read back on the same draft, publication succeeds and
the matching images appear in Owner details and Buyer discovery. Test sale and
rental values against actual stored results. No bypass, fabricated image, direct
database insertion or approval-policy change is an acceptable substitute.

Existing limitation: the provider fetch has no server deadline, while Flutter has
a bounded HTTP deadline. An unknown upload outcome still requires draft readback
before retry; do not assume a client timeout cancelled the provider's operation.

No Railway variable/service change, database command, migration, deployment,
new account, property creation, production operation, commit or push was performed.
