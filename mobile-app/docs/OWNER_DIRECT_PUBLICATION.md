# Owner direct publication

Date: 2026-11-03. Source baseline: main,
`f023f42a07d0ac7f0f2ec82221b7e49fdb6ba5a9`, with preserved working-tree changes.

## Minimum four photographs - source update - 2026-11-03

The founder now requires at least four property images before publication. This
section supersedes the earlier create-first/upload-after-publication sequence
for new Owner listings. Direct publication still needs no approval.

- New publication requires four distinct public HTTPS image references across
  cover and gallery. Repeating the cover in the gallery counts once; equivalent
  host/default-port/fragment URL variants do not inflate the count. Video and
  virtual-tour fields never count. This is reference validation, not a remote
  image-content/availability inspection or byte-level duplicate detector.
- Mobile Owner creation requires at least four distinct selected photos. The
  existing ten-photo picker, 6 MiB per-photo and 24 MiB batch limits remain.
  Identical selected file bytes are rejected locally. The app creates one private
  DRAFT, uploads all selected photos sequentially, independently reads the stored
  gallery and then PATCHes PUBLISHED. Exact property ID/status acknowledgment is
  required before claiming publication. Upload failure leaves the draft private;
  uncertain creation/publication never blindly repeats creation.
- Web creation/edit forms show the distinct-photo count and minimum guidance.
  New Publish is disabled below four; private draft saving remains possible.
  Existing content-only autosave and gallery preservation remain. Publish actions
  in Owner listings/dashboard receive a server-derived photo count.
- The server checks new creation, locked property updates and media removals or
  reorders. It validates the final merged gallery under Profile -> Property locks.
  Both administrator moderation and verification publication entry points apply
  the same minimum, without removing existing authorization or review powers.
- Existing published records with fewer photos remain visible and may improve;
  edits cannot further reduce their count. Once four are present they cannot drop
  below four while published. Saving privately permits gallery changes; later
  republication requires four. The prior one-image staging test was not changed.

No schema, migration, authentication or environment-variable change is needed.
The photo upload provider and exact-host/TLS restrictions are unchanged. The
last known missing Cloudinary configuration remains a separate native-upload
prerequisite; this source change does not provision storage.

Local checks: 105 Flutter fixture/regression tests and 42 backend tests passed;
TypeScript checking passed. The new minimum-message fixture caught an off-screen
error after an existing-draft Publish rejection; the app now also shows that
guidance in a visible snackbar. Focused Flutter analysis reported zero errors or
warnings and 39 informational lints (nonzero command exit for those infos).
No full Next.js production build or browser runtime test is claimed. No live property/account
mutation, deployment, migration, Railway change or production operation was
performed for this minimum-photo source slice.

Files changed for this rule: `src/lib/properties/photos.ts` (new), existing
property create/update/media routes, admin property moderate/verify routes,
`owner-listing-editor.tsx`, `owner-listing-actions.tsx`, web Owner dashboard and
listings pages, mobile `workspace_screen.dart`, `listing_photo_picker.dart`,
`create_listing_photos_test.dart`, `tests/owner-publication.test.mjs`, new
`tests/property-photo-admin.test.mjs` and these three integration documents.

Release the backend and matching new APK together under separate staging release
approval: an old mobile client tries to publish before attaching photos and will
be rejected by the new server. Railway predeploy still runs all pending
migrations; this change adds none but does not authorize an unknown pending set.
The installed, previously verified app remains unchanged until that release.
The new four-upload publication workflow is not yet verified against staging.

Candidate build PASSED using the explicit staging configuration:
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
Build record:
`mobile-app/build/android-source-builds/2026-11-03T11-51-04-206Z-25992/build-record.json`.
The APK is `mobile-app/build/app/outputs/apk/debug/app-debug.apk`, 184939163 bytes,
SHA256 `ccc221340bd197caf8c7fcc447981640be7208ebb00de3d545b2a3f49ebc9b64`.
The previous working APK is preserved in that record directory as
`previous-app-debug.apk`. The candidate was not installed or launched; this build
does not establish live four-file upload/publication success. Independent source
review found no additional blocking issue in the private-upload-then-publish,
web autosave or locked administrator checks. Git diff whitespace check passed.

## Live acceptance - 2026-11-03

RUNTIME VERIFIED for **Owner website publication to already-open Android Buyer
public discovery**. The user supplied the Owner credentials and explicitly
authorized one property creation and Buyer update verification. Credentials were
used only for the existing staging sign-in UI and were not saved in project
files or included in evidence.

The supplied account reached the Owner dashboard. Exactly one labelled property,
`STAGING TEST - Owner live update 20261103`, was published through the existing
Owner form. The single observed `POST /api/properties` returned HTTP 200 and
property `cmw0jtf930003nw0x97xdmy4n`, status PUBLISHED, verified false,
verificationStatus PENDING and publishedAt. The UI opened that exact record's
Owner edit page with its saved title, price, cover URL and other values. There
was no admin approval action or review submission.

The matching staging APK (`25b8d899...`) was installed on emulator-5554 without
clearing app data. Buyer public discovery was opened and showed the genuine empty
catalogue before publication. It remained open during the Owner Publish click.
Without the agent sending Refresh, reopening discovery or touching Android after
publication, the catalogue displayed the new title, actual house photograph,
INR 50 lakh price, Kochi, three beds, two baths and 1500 sqft. The normal Android
screenshot proves actual display presentation, not just internal Flutter render.
The corresponding detail page opened with the matching title/fields and the
explicit staging-test description. The app was returned to discovery afterward.

Process-scoped sanitized Flutter logs show repeated staging catalogue HTTP 200
responses at about 5.25-second intervals. Independent public catalogue and detail
GETs both returned HTTP 200, database source and the same PUBLISHED property ID,
title and cover reference; the catalogue contained exactly one record. Request
IDs: `aiin_cNbTlGRNqm3ss7a6g`, `-pe-Fuv3Sga4A4emN8N_Fg`.

Evidence in ignored `mobile-app/build/staging-auth-verification/`:
`direct-publication-buyer-before.png`, `direct-publication-buyer-after.png`,
`direct-publication-buyer-detail.png`, `direct-publication-catalogue.log` and
`direct-publication-verification.json`. Host and server/device clocks differ by
about 16 minutes; timestamps retain their source labels. An exact cross-system
delivery latency is not claimed. This is foreground polling, not WebSocket push.

The first Android attempt had a confirmed DNS failure: the emulator could not
resolve staging while the host browser could. Wi-Fi cycling did not recover it.
The same Pixel_6 AVD was cold-booted with the documented emulator startup option
`-dns-server 8.8.8.8,8.8.4.4` and `-no-snapshot-load`. App/user data was retained;
no wipe, renderer, TLS, backend or Railway configuration change was made.
Hostname resolution and actual Flutter HTTP requests then recovered.

Scope limits: this proves the web Owner-to-Android public Buyer flow, not native
Owner form creation or authenticated Buyer saved/enquiry actions. The image was
an approved hosted Pexels URL reference, not a device-file/Cloudinary upload.
Those upload prerequisites remain separate. Exactly one synthetic, clearly
labelled staging test property remains published; old drafts were not changed.
No application source change, direct database command, migration, Railway
variable change, deployment, new account, commit, push or production operation
was performed. Normal staging authentication/property/view/audit API writes were
part of the authorized workflow.

## Verification update - 2026-11-03, 09:15 UTC

The implementation is now committed on clean `main` at
`a357eee327c8597d43ed8352c84b67562fc10b20`. The following fresh observations
supersede the earlier unreleased-backend statement below. This check did not
trigger a deployment or change Railway configuration.

| Check | Result and evidence |
| --- | --- |
| Current backend tests | PASS: `node --test --test-isolation=none tests/owner-publication.test.mjs tests/mobile-api.test.mjs`, 24 passed. Fixtures replace external services. |
| Current Flutter tests | PASS: the four-file command below passed 96 tests. It covers Owner PUBLISHED request/acknowledgment, empty-to-new Buyer results, multi-page insertion/removal and stale-session protection. |
| Current TypeScript check | PASS: `npx tsc --noEmit --incremental false`, exit 0. |
| Staging identity | CONFIRMED read-only through Railway CLI: project `1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, environment `staging` / `2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, backend HomeZone / `ea6ca516-4063-4ed1-be95-bebcc0d1af00`. |
| Active backend artifact | CONFIRMED: active/latest deployment `5246bf68-f4bb-4079-ac12-cb4c86420d20`, SUCCESS, source SHA `a357eee327c8597d43ed8352c84b67562fc10b20`, created `2026-11-03T09:09:20.752Z`. Observed active at `09:15:11.8248812Z`; created time is not an inferred completion time. |
| Public domain | CONFIRMED: the same service instance maps `homezone-staging.up.railway.app`. No production domain was contacted. |
| Fresh staging catalogue read | HTTP 200 at `09:13:55.386Z`, source `database`, 0 properties, page 1, hasMore false, no redirect. Request ID `K8263u11Stu_buv4m3z_FQ`. This read was from Node, not Flutter. |
| Installed emulator APK | OLD VERSION: emulator-5554 is available, HomeZone process running; read-only device APK SHA256 is `58cbdf9f839a22c64d95cda539befdfd7999e5051e3ecd08edea447d8789c738`, matching the previous APK, not candidate `25b8d899569361c02cc4d34e73e6494769734838d0fdfbbe4a713e67d973ed11`. |
| Live Owner-to-Buyer publication | NOT VERIFIED: no property was created or published, no APK installed or app launched. Zero public results cannot demonstrate a publication/update. |

The remaining device prerequisite is installation of the matching staging
candidate, followed by one explicitly authorized genuine staging publication
and independent Buyer observation. Do not publish the existing fictional drafts
as real offers. Source tests and deployment identity support the implementation,
but do not replace that end-to-end acceptance. Cloudinary upload configuration
was not inspected or changed during this check. No database command, migration,
account mutation, commit, push or production operation was performed.

## Result and scope

The founder approved new Owner properties appearing in Buyer discovery without
approval. Implementation uses the existing property API, Prisma models and
foreground refresh. No new API, authentication mechanism, schema, migration or
WebSocket service was introduced.

| Action | Source behavior |
| --- | --- |
| Mobile Owner creates a property | Explicit `POST /api/properties` with `status: PUBLISHED`; publish button and confirmation reflect the returned status. |
| Website Owner creates a property | Publish directly, or explicitly save a private draft. |
| Owner publishes an eligible owned draft/review record | Existing `PATCH /api/properties/{id}` accepts `PUBLISHED` without a verification requirement. |
| Explicit draft | Remains private; old drafts are never automatically published. |
| Other public roles | Previous draft/review/verified-publication policy remains. |
| Rejected, archived, needs-changes or expired record | Existing moderation remains effective; an Owner cannot reset status to bypass it. The schema cannot distinguish Owner archive from administrative archive, so republishing an archived record requires support/admin. |
| Verification | New publication has `verified: false`, `verificationStatus: PENDING` and a publication timestamp. Publishing an existing record preserves its actual verification metadata. |
| Buyer visibility | Existing public queries return `PUBLISHED`; optional filters, including verified-only, continue to apply. |

Creation rechecks the locked server profile role and suspension state before the
transaction writes. Updates lock profile then property, reread current ownership
and moderation state, and scope non-admin writes to the owner. The client cannot
assign ownership or verification. Website/admin authentication is unchanged.

Website content autosave omits status, skips untouched forms, prevents overlapping
saves and does not automatically retry an unchanged failed revision. Editing
retains existing gallery URLs. Explicit draft saving is the only draft transition.
New creation with an uncertain acknowledgment is not repeated automatically.

## Automatic updates

Buyer uses the existing public HTTPS GET, not push. Visible screens read about
five seconds after a completed request. A multi-page catalogue alternates page
one with later pages. If membership/order changes, it rebuilds from page one
instead of retaining stale page boundaries or asking for manual refresh. New
first-page publication is normally detected in one cycle, or at most two cycles
when multiple pages are loaded, plus request time. Failures back off and honor
Retry-After; background/covered screens pause. Stale session/filter generations
cannot replace newer results.

Photos are uploaded sequentially after the property creation acknowledgment.
The listing can become visible before all photos finish. Failed photo upload
does not fabricate a photo or repeat property creation. Owner inline galleries,
Buyer detail/gallery refresh, exact media host restrictions and TLS validation
are preserved. Previous staging evidence reported the three Cloudinary variables
missing, so successful native file upload is still unverified and blocked by
separate infrastructure configuration.

## Local verification

- Flutter: `flutter test --no-pub test/create_listing_photos_test.dart test/listing_live_refresh_test.dart test/owner_property_photos_test.dart test/marketplace_test.dart --timeout 45s` — 96 passed.
- Backend: `node --test --test-isolation=none tests/owner-publication.test.mjs` and the existing `tests/mobile-api.test.mjs` — 24 passed in total. Authentication, database, AI and logging boundaries use local fixtures; no live services were contacted.
- Focused Flutter analysis: zero errors, zero warnings, 48 informational lints. The command reports a nonzero status for those informational findings.
- TypeScript: `npx tsc --noEmit --incremental false` passed with exit 0. This is a typecheck, not a full Next.js production build or web runtime test.
- Android: `node scripts/build-android.mjs --mode service --config config/staging.local.json` passed. The existing workflow used cached offline Gradle dependencies, explicit API-enabled staging settings and `https://homezone-staging.up.railway.app`. Build evidence: `mobile-app/build/android-source-builds/2026-11-03T07-48-55-951Z-20752/build-record.json`. It did not install, launch or contact the API.
- Candidate APK: `mobile-app/build/app/outputs/apk/debug/app-debug.apk`, 184939163 bytes, SHA256 `25b8d899569361c02cc4d34e73e6494769734838d0fdfbbe4a713e67d973ed11`. It requires the matching backend release before installation.
- The previous working APK is preserved at `mobile-app/build/android-source-builds/2026-11-03T07-48-55-951Z-20752/previous-app-debug.apk`; its SHA256 is `58cbdf9f839a22c64d95cda539befdfd7999e5051e3ecd08edea447d8789c738`.
- Independent read-only review found no additional actionable correctness/security defect in the backend publication policy and web changes. This is source review, not runtime acceptance.
- Actual direct-publication cross-client behavior: NOT RUNTIME VERIFIED.

## Changed source

- `backend/api/properties/route.ts`: authorize direct creation and assign publication/verification fields under a profile lock.
- `backend/api/properties/[id]/route.ts`: authorize direct Owner publication against locked current rows.
- `src/lib/properties/publication.ts`: shared publication policy, without granting verification.
- `src/lib/api/validation.ts`: permit the new create status while preserving legacy defaults.
- `src/components/properties/owner-listing-editor.tsx`: direct Publish, status-preserving autosave, gallery preservation and checked acknowledgments.
- `src/components/properties/owner-listing-actions.tsx`: direct Owner Publish and checked status responses.
- `src/app/dashboard/listings/new/page.tsx`, `src/app/dashboard/listings/[id]/edit/page.tsx`, `src/app/dashboard/listings/page.tsx`, `src/components/dashboard/owner-dashboard.tsx`: derive Owner controls from the server profile and clarify public versus verified state.
- `mobile-app/lib/features/workspace/workspace_screen.dart`: Owner publication request/action, confirmed result and neutral verification labels.
- `mobile-app/lib/features/marketplace/marketplace_screen.dart`: automatic catalogue membership refresh.
- `tests/owner-publication.test.mjs`, `mobile-app/test/create_listing_photos_test.dart`, `mobile-app/test/listing_live_refresh_test.dart`: focused policy/UI regression coverage.
- `mobile-app/docs/HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`, `mobile-app/docs/HOMEZONE_REMAINING_BLOCKERS.md`, this document: source/release evidence.

Earlier photo-picker, inline-gallery, repository notification and related test
changes were preserved. They are separate existing working-tree work.

## Staging activation and rollback

No deployment, Railway variable change, migration, database command, account
creation or live property mutation was performed. No production was contacted.

1. Obtain approval for the reviewed staging backend release and read-only
   deployment/migration preflight. Verify exact project/environment/service,
   active artifact, pending migration set and recoverability. The slice needs no
   migration, but `railway.json` predeploy runs `npm run db:migrate`; do not let an
   unknown pending set run without separate approval.
2. Deploy the reviewed backend under the agreed gate. Confirm its deployed
   identity and publication contract using an approved staging record workflow.
3. Install the matching candidate staging APK after the backend release. The
   old backend rejects the new create status; do not mix the new client with it.
4. Obtain approval for one genuine staging Owner listing and another authorized
   Buyer session. Verify the publish acknowledgment, independent public read,
   actual Android Buyer display and automatic update. Existing synthetic test
   drafts are not suitable public inventory and were not published here.
5. Verify native photo upload separately after approved Cloudinary provisioning.

Rollback uses the preserved prior backend artifact and matching prior APK. Keep
existing stored properties/media; never delete records or claim publication was
undone automatically. Old public queries already understand `PUBLISHED`, so
previously published records remain visible unless separately archived through
an authorized operation. No secret or credential rotation is involved.
