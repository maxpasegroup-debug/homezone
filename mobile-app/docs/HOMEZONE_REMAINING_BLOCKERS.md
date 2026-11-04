# HOMEZONE remaining integration blockers

## Current native photo-upload blocker and Owner form correction - 2026-11-04

CONFIRMED: current saved-variable metadata for the explicitly matched staging
service/environment/domain has none of `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. No credential values were printed
or changed. Native photo upload cannot be accepted as working from the earlier
hosted-URL image display evidence. The user's particular failed request's HTTP
status remains uncaptured.

SOURCE FIXED: Purpose/Category/Currency no longer lose their displayed selection
after lazy scrolling; all retained required fields are validated. A new readiness
flag on existing capabilities prevents a new listing draft when upload setup
cannot be confirmed, retaining inputs/photos on the current screen. Safe upload
categories replace ambiguous zero-photo-only feedback, without replaying uncertain
writes. The four-photo rule and existing drafts are preserved.

Remaining actions: privately provision the three staging Cloudinary requirements;
approve any resulting service effects and the matching backend/APK release, then
authorize one real four-file upload/publication/readback test. New clients require
the backend readiness field and fail closed on an older server. This source slice
adds no schema/migration and does not authorize Railway predeploy's unknown pending
set. Full handover: `OWNER_LISTING_PUBLISH_FIX.md`.

## WebSocket staging activation and acceptance - 2026-11-04

SOURCE IMPLEMENTED and local-fixture checked: transaction-bound public property
notifications, same-port WebSocket gateway, Flutter listing subscriptions and
website Buyer/property subscriptions. No private records are sent over the
socket; existing APIs remain authoritative. No schema or migration is added.

Still required: separately approve the reviewed staging artifact, flag
`HOMEZONE_REALTIME_ENABLED=true` and selection of the unselected
`railway.staging-realtime.json` template (`npm run start:realtime`). Default
`railway.json` remains unchanged; its config-file command overrides dashboard
command fields, so verify the effective deployment configuration explicitly.
Confirm direct/session-pooled PostgreSQL connectivity, one extra connection per
replica, canonical staging origin and proxy/connection-limit capacity. Reconcile
Railway config-file start-command precedence and the full predeploy pending
migration set before any release. These actions were not performed.

Then verify a real staging WSS 101/ready, matching updated client and one separately
authorized Owner publication/photo change -> hint -> HTTP readback -> visible
Buyer result. Earlier five-second polling evidence is not WebSocket acceptance.
The updated staging debug APK has compiled (`2026-11-04T02-43-22-860Z-27896`)
and the previous APK is preserved; installation and actual device acceptance
remain pending. Artifact/hash are documented in `LISTING_WEBSOCKETS.md`.
Keep four-photo client/backend compatibility and Cloudinary prerequisites from
the existing release gate; this transport does not provision upload storage.
Fallback HTTP remains available if the socket is absent or disconnected.
Exact staged activation and rollback: [LISTING_WEBSOCKETS.md](LISTING_WEBSOCKETS.md).

## Minimum-four-photo release and acceptance - 2026-11-03

SOURCE IMPLEMENTED: new Owner publication requires four distinct photos in the
mobile/web UI and backend. Mobile now saves privately, uploads/confirms photos,
then publishes; there is still no approval step. 105 focused Flutter and 42
backend tests plus TypeScript checking passed. No live records were changed.
The explicit staging APK build passed and is ready as a candidate; it was not
installed. Build record/hash and the previous-APK recovery path are in
`OWNER_DIRECT_PUBLICATION.md`.

Remaining: approve and coordinate the matching staging backend/APK release, with
the existing predeploy migration gate checked separately; verify compliant
Cloudinary configuration and one authorized real four-file upload/publication.
The new backend rejects the old mobile create-before-upload request, so both
artifacts must be coordinated. This source slice adds no migration/environment
requirement and does not deploy, install, provision storage or touch production.
Existing one-photo published data is retained as legacy data, not automatically
hidden or filled with invented photos. Its earlier Buyer auto-update evidence
does not prove the new four-upload flow. See `OWNER_DIRECT_PUBLICATION.md`.

## Direct Owner publication acceptance closed for public Buyer discovery - 2026-11-03

RUNTIME VERIFIED: one explicitly authorized staging property was created through
the supplied Owner account's website form with PUBLISHED status and no approval.
The updated Android APK was installed, Buyer discovery was left open before the
create, and the same listing and actual hosted house photo appeared automatically
without an agent Refresh or reopening discovery. Public catalogue/detail API
reads independently returned database source, HTTP 200 and the matching property.
Record ID: `cmw0jtf930003nw0x97xdmy4n`. Evidence and scope are documented in
`OWNER_DIRECT_PUBLICATION.md`.

The emulator's DNS failure was recovered through a same-AVD cold boot with
explicit DNS, preserving user/app data and TLS/renderer configuration. No backend
deployment, Railway change, migration or direct database operation was performed
in this test. The earlier old-APK/empty-catalogue acceptance blocker below is
historical and superseded for this workflow.

Remaining separate checks: native Owner form publication; authenticated Buyer
saved/enquiry workflows; actual device-file photo upload after approved staging
Cloudinary provisioning; multi-page/live filtering cases. Local fixture tests
cover the latter but are not live cross-client evidence. This test used an
approved hosted Pexels image reference. The one clearly labelled synthetic test
listing remains published in staging; no existing drafts were published, no new
user account was created and production was untouched. No instantaneous push
delivery or exact cross-system latency is claimed.

## Current direct-publication acceptance blocker - 2026-11-03, 09:15 UTC

The backend release gate below is now closed by fresh read-only evidence:
staging's active deployment `5246bf68-f4bb-4079-ac12-cb4c86420d20` is SUCCESS
and uses current source `a357eee327c8597d43ed8352c84b67562fc10b20`. No release
or migration was initiated by this verification. Current local checks passed
24 backend tests, 96 Flutter tests and TypeScript typechecking.

The emulator is running the OLD APK, confirmed by its exact on-device SHA256
matching the preserved previous build. It therefore does not contain Owner
direct-publication creation. Install the matching staging candidate under the
device approval boundary, then verify one explicitly authorized genuine Owner
publication and automatic Buyer display on another session. The fresh staging
catalogue GET returned 200/database/empty; this cannot prove that workflow.
No properties, accounts, secrets, settings or production were changed. Detailed
metadata, hashes and remaining Cloudinary limitation are in
`OWNER_DIRECT_PUBLICATION.md`. Earlier sections retain historical observations.

## Direct Owner publication release gate - 2026-11-03

SOURCE IMPLEMENTED: New Owner creation now publishes directly through the existing
property API, with no approval queue. Buyer foreground refresh automatically picks
up catalogue membership changes, including after multiple pages were loaded.
Website Owner controls also publish directly; content autosave preserves status
and existing galleries. Publication does not grant a verification badge. Explicit
drafts and administrative moderation restrictions remain private/restricted.
See `OWNER_DIRECT_PUBLICATION.md` for the exact scope and release evidence.

LOCAL VERIFICATION: 96 focused Flutter tests and 24 backend tests passed without
live services. Flutter analysis found no errors or warnings (48 informational
lints). Local compilation is distinct from deployment and runtime acceptance.
TypeScript typechecking and the explicit staging APK build also passed. The
candidate was not installed; its matching backend is not yet released. The build
record and previous-APK recovery path are in `OWNER_DIRECT_PUBLICATION.md`.

Remaining, in dependency order:

1. Approve the exact staging-only backend release and read-only migration
   preflight. `railway.json` runs `npm run db:migrate` before deployment; although
   this slice adds no migration and the source has 21 migration directories, the
   current pending set is unknown. Do not trigger migration execution silently.
   Confirm active target/version and recoverability first; any pending migration
   requires separate explicit approval.
2. Deploy the reviewed backend only under that approval. Install the matching
   staging APK only after the backend accepts the new publication contract.
   Installing it against the old backend would make Owner creation fail.
3. Verify one authorized real staging Owner publication, a fresh public API
   read, and Buyer UI on another authorized client. No existing fictional/test
   draft may be published just to populate the catalogue. Capture actual Android
   presentation and automatic refresh evidence; source tests are insufficient.
4. Separately provision `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
   `CLOUDINARY_API_SECRET` under approved secret custody before verifying device
   photo upload. Their prior read-only staging presence check reported MISSING;
   values were not exposed. Publication alone does not fix uploads. Photos upload
   sequentially after publication and may appear later than the listing.
5. Optional verified-only Buyer filters intentionally exclude unverified
   publications. HTTP foreground polling normally discovers new first-page
   listings within one cycle, or two with multiple loaded pages, plus request
   time. This is not a push-delivery guarantee.

No schema or environment changes are needed for the publication policy itself.
No release, database operation or live property mutation was performed in this
slice. The installed working APK and previous live property evidence remain
separate from the unreleased direct-publication candidate.

## Original Owner gallery acceptance checkpoint - 2026-11-03

PASS / DEVICE VERIFIED: The original owner signed in through the actual Android
Auth.js UI and reached the backend-confirmed OWNER dashboard. Its existing
`STAGING CHECK - Owner photo 20261103 0950` draft opened in Owner details, where
the inline gallery displayed the actual house photograph and `1 of 1 photos`
without the unavailable-image fallback. Evidence:
`mobile-app/build/staging-auth-verification/supplied-owner-existing-gallery.png`.
The prior requirement to obtain original-owner access and verify this particular
stored Pexels URL on Android is closed; earlier sections retain historical facts.

PASS / RUNTIME VERIFIED: One authorized new sale test,
`STAGING TEST - Owner Sale 20261103`, was saved once through Flutter with one
native photo selected. Fresh owner Listings returned DRAFT/PENDING, Kochi and
price 5000000. Fresh details returned price 5000000, area 1500, three bedrooms,
two bathrooms and `No property photos`. The form showed BUY intent, INR and
House before Save. No publication or Buyer visibility is claimed.

FAIL / CONFIRMED CONFIGURATION BLOCKER: Read-only inspection of the explicitly
scoped Railway staging backend reported `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` all MISSING. No secret values
were displayed or stored. Native upload again reported zero of one photos
confirmed; its exact HTTP response was not captured, so a particular response
status or exception is not established. Provisioning the missing staging upload
configuration and any resulting deploy/restart require separate authorization.

PASS / RUNTIME VERIFIED: The approved Pexels photograph URL was attached to the
same new sale draft using the existing media PATCH form. The app acknowledged
the change. Independently returning to Listings and reopening that exact new
record displayed the actual house photograph, `1 of 1 photos`, its sale-test
title and saved property values on Android. The unavailable-image fallback was
absent. Evidence: `mobile-app/build/staging-auth-verification/owner-sale-with-photo.png`
and `owner-sale-verification.json`. The new draft's photo-reference/display
acceptance is closed; this must not be reported as successful native file upload.

Remaining: provision compliant staging Cloudinary configuration under approved
secret custody, approve any resulting restart/deployment effects, then verify
one authorized device-file upload and readback. Do not enable broad media hosts
or bypass publication to work around this. Published-property photo changes
reaching a Buyer on another authorized client remain runtime unverified. Exactly
one new sale test record was created, the earlier record was retained and neither
was published. No application source, migration, Railway configuration,
deployment or production change was made for this test.

## Automatic photo refresh acceptance - 2026-11-03

Owner inline detail photos and Buyer foreground catalogue/detail/gallery refresh
are SOURCE IMPLEMENTED. The six focused test files passed all 90 cases; analysis
reported zero errors/warnings and 51 existing informational findings. These are
local fixtures and regression evidence, not a claim of live upload or cross-client
delivery. The existing create-listing picker remains intact.

The explicit staging APK was built and installed successfully (build record
`2026-11-03T05-56-45-285Z-15016`). Android rendered onboarding and public discovery.
Actual app-process logs showed repeated HTTP 200 staging catalogue responses at
roughly five seconds plus network time, and the Android screenshot showed the
genuine empty published-catalogue state. Public read-only automatic refresh is
DEVICE/BACKEND VERIFIED. Live Owner photo display and cross-client photo mutation
remain unverified; no new records or uploads were used to manufacture acceptance.

Remaining acceptance requirements:

1. Open the original owner's existing test draft privately on the emulator. The
   available controlled Owner account has no records and cannot read another
   owner's private gallery. Confirm the new inline `Property photos` gallery and
   the actual Android house photograph, preserving ownership boundaries.
2. Diagnose the previous device-file upload's 0-of-1 acknowledgment separately.
   The existing Cloudinary adapter requires compliant `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`; effective staging compliance
   has not been established. No values were retrieved, printed or changed here.
   A stored URL reference is not proof of a successful device upload.
3. The staging build image allowlist now contains exactly `images.pexels.com` and
   the existing Cloudinary CDN `res.cloudinary.com`; video/tour hosts remain empty.
   A successful upload URL on another host remains blocked until that exact host
   is reviewed. Rebuild/install is required for compile-time allowlist changes.
4. Use an approved already-PUBLISHED property and two authorized client sessions
   to verify an actual Owner photo change reaches Buyer UI. Do not publish the
   current DRAFT/PENDING test record merely to populate discovery. Any new upload,
   listing/publication or test-data change needs its own authorized scope.
5. Refresh is near-real-time foreground HTTP, normally five seconds after the
   previous read plus network time, with backoff/Retry-After under failures. A
   multi-page catalogue refreshes one page each cycle; membership changes require
   explicit user refresh. This does not provide push delivery or an instantaneous
   cross-device guarantee. WebSocket infrastructure is not introduced by this
   source slice.

No additional property/account/photo mutation, backend deployment, database
command, migration, Railway change, commit, push or production operation was
performed. Earlier storage/session observations below remain historical and
unresolved unless explicitly superseded by fresh evidence.

## Stored staging photo display acceptance - 2026-11-03

The exact source/configuration cause of the saved test photo's fallback is
confirmed: the staging image-host allowlist was empty, and shared `ListingImage`
blocked its `images.pexels.com` URL before HTTP. The ignored local
`mobile-app/config/staging.local.json` now contains that one exact image hostname.
The staging API origin is unchanged and `HOMEZONE_MEDIA_HOSTS` remains empty.
HTTPS, no credentials/fragments, port 443, redirect rejection, credential-free
image transport, 8 MiB response limit and 20-second deadline remain intact.

Both existing focused exact-host and redirect-policy tests passed. The existing
`ListingMedia.load` also fetched the exact stored URL successfully as 139599 JPEG
bytes using its normal security policy. This proves the loader path on this
workstation, not the installed Flutter widget or Android display.

The explicit staging rebuild succeeded. Provenance:
`mobile-app/build/android-source-builds/2026-11-03T05-12-47-257Z-3968/build-record.json`.
APK SHA256:
`7cb03a89a29c4656b873ec2c4766e5386b61bd96b0dbc56c2e6d4029e97c0449`.
`adb install -r` succeeded; the app launched and rendered onboarding on Android.
The previous session was not restored after restart. A normal UI sign-in with an
existing authorized controlled OWNER account succeeded, but its owner-scoped
My listings response was `No records yet`: this is not the original owner of the
previous draft. Ownership boundaries remain intact; no foreign listing was
exposed or account created. Actual Android display of the existing draft's stored
photograph remains PENDING the original owner's private emulator sign-in.

Remaining gates:

1. Have the original owner sign in privately on the emulator, open that existing
   test draft and refresh Listing media. Confirm the house photograph in an Android
   screenshot and that `Image unavailable` is absent. Reuse the existing record;
   do not create or attach another property/photo for this display check.
2. Keep direct device-file upload unresolved. Its previous 0-of-1 acknowledgment
   remains UNKNOWN; this host correction neither repairs nor verifies Cloudinary
   upload or storage configuration. Cloudinary's eventual exact display host
   requires evidence and a separately justified allowlist decision.
3. Do not infer public catalogue visibility from owner gallery display. The test
   property remains DRAFT/PENDING and unpublished under existing policy.
4. Investigate the separate session-restoration observation in its own
   authentication slice. Reinstall/restart opened onboarding; successful explicit
   sign-in does not certify session restoration. No authentication logic was
   changed for the image-host correction.

No application-source/backend/schema/authentication/Cloudinary/Railway change, database
write, migration, account creation, deployment, commit, push or production action
was performed for this correction. Prior source, draft/reference and failed
upload observations remain below as historical evidence.

## Owner Create Listing photos acceptance - 2026-11-03

The requested placement is implemented in source: photos can be selected,
previewed and removed directly inside Owner Create Listing before Save. This
property-create-only feature also supports BROKER and leaves edit/generic forms
unchanged. It accepts local JPEG, PNG and WebP files up to 6 MiB each, 10 photos
and 24 MiB total, with canonical base64, signature and readable-image checks.
Both validation decoding and previews are bounded to 360 pixels in both axes
without upscaling. Picker cancellation and all selection changes are local and
make no API request.

Save creates one DRAFT through the existing API, retains its confirmed ID, then
uploads sequentially through `POST /api/mobile/upload` with raw base64. The upload
API already attaches photos; no duplicate media-add call is made. Acknowledgment
URLs and account/cookie generation are checked before continuing. Unknown or
partial results lock further Save attempts and direct the user back to Listings;
all returns from the create form refresh its parent, including normal Back.
There is no automatic create/upload retry. Local fixtures cover these safety
boundaries; later authorized device evidence below verifies draft and reference
persistence separately from file-upload success.

30 new local fixture tests and 40 existing regression tests passed: 70 total.
Final focused analysis found zero errors, zero warnings and 37 existing
informational `curly_braces_in_flow_control_structures` findings, all in
`workspace_screen.dart`. The picker and new test file had no diagnostics. Flutter
exits 1 for informational findings under its default behavior.
The implementation is in
`mobile-app/lib/features/workspace/listing_photo_picker.dart` and
`mobile-app/lib/features/workspace/workspace_screen.dart`, with new coverage in
`mobile-app/test/create_listing_photos_test.dart`.

The explicit staging APK build succeeded; provenance is
`mobile-app/build/android-source-builds/2026-11-03T03-40-35-216Z-30488/build-record.json`.
APK SHA256:
`0ed98d6f227fff50c1f3844eda0eba20494dfca965c0cc3671bce0b20d0c79a3`.
`adb install -r` succeeded and the actual Android app rendered onboarding after a
slow native splash. No renderer changes were made. Later authorized OWNER access
allowed actual Create Listing verification: native chooser selection, local photo
thumbnail and Remove control were visible on Android. The installed APK SHA256
matched the staging provenance. Earlier rejected controlled-account sign-ins are
historical observations, not a current proof that the photo screen is unreachable.

One Save at 2026-11-03 04:31:34 UTC created the test draft
`STAGING CHECK - Owner photo 20261103 0950` (DRAFT/PENDING, Kochi, INR,
RESIDENTIAL), but the app reported 0 of 1 photo uploads confirmed. Fresh Listings
and record views returned that same draft; the initial fresh gallery had zero
photographs. There was no creation or device-upload retry.

At 2026-11-03 05:01:24 UTC, the existing Attach property photograph form added
`https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=1200` to this
same draft. A fresh Listing media view returned `Photograph 1` with the expected
`Image unavailable` display fallback. Its authenticated no-store GET reads Prisma
directly. Draft persistence and one image URL reference are therefore RUNTIME
VERIFIED; Cloudinary/device-file upload and remote image rendering are not.
Image bytes were not established as stored in PostgreSQL.

Final fresh gallery Refresh at 2026-11-03T05:05:49.9213655Z again confirmed the test
title, `Photograph 1`, no empty-gallery message and `Image unavailable`. Actual
Android capture: `mobile-app/build/staging-auth-verification/property-final-media.png`.

The selected property photograph is Binyamin Mellish's
https://www.pexels.com/photo/house-lights-turned-on-106399/, covered by the Pexels
License, not CC0. The downloaded file was 139599 bytes, SHA256
`b188d810dc048706cf189ad4364d781eeebfc336cc571e4a1b8d0561cc506b56`.

Remaining acceptance gates for this feature:

1. Diagnose the unconfirmed device-file upload before claiming the complete Save
   with photos workflow works. Source, route-deployment, storage-provider and
   sanitized request/error evidence are still needed to isolate the failure.
   Read-only Railway metadata identified active SUCCESS deployment
   `2a773275-a44b-4382-b00e-4ff7fdc3e794` on the staging domain; bounded application
   and HTTP log searches returned no matching records. They do not establish a
   missing route or provider/configuration cause. Do not recreate this draft or
   automatically retry its upload.
2. The earlier remote-display check found
   `mobile-app/config/staging.local.json` with `HOMEZONE_IMAGE_HOSTS=''` and
   `HOMEZONE_MEDIA_HOSTS=''`, with zero exact hosts in both allowlists. These
   security settings were kept unchanged during that check. The subsequent
   exact-host correction and its pending device acceptance are recorded above;
   local previews alone do not prove remote photographs can render.
3. After a justified correction and its required approval, verify a controlled
   device-file upload, fresh gallery readback and actual remote-image rendering.
   Stored URL-reference evidence alone does not verify provider upload. Removal
   and cancellation are source/fixture-covered; collect device evidence if full
   picker acceptance is required.

The founder authorized this one staging property/image check. Normal owner APIs
created one test draft, attempted one device-file upload and attached one image
URL to that same draft. No direct database command, migration, new account,
infrastructure write, application-code/configuration change, deployment, commit,
push or production action was performed during verification. Historical reports
below remain intact and must be read within their original scopes.

## Automatic registration-to-dashboard handoff acceptance - 2026-11-02

Source baseline: `main/b581d6ea1ea88c0c086281593ab8cf43f95600b5`.
The reported account-saved-but-still-on-signup behavior is explained in source:
`AuthFormScreen.register()` previously acknowledged the request and required a
separate sign-in action. It did not attempt automatic authentication or dashboard
navigation. Earlier successful separate-sign-in evidence remains valid; it does
not verify the new automatic journey requested by the founder.

### Source correction compiled; five-role automatic handoff verified

The Flutter-only change in
`mobile-app/lib/features/auth/auth_form_screen.dart` captures the submitted email,
password and selected public role, then passes them to the existing sign-in flow
after a validated generic acknowledgment. It resolves the repository-owned
controller for signup and preserves CSRF, independent session/profile checks,
backend-authoritative roles, mismatch rejection, generation ownership and route
cancellation. Acknowledgment alone never opens a protected dashboard or proves a
new account was created.

Registration remains blocked against accidental resubmission after acknowledgment.
Authentication failure presents a recoverable submitted-but-unconfirmed message
and an explicit sign-in route. Transport uncertainty never triggers automatic
account creation retries or a claim of successful authentication. Duplicate
acknowledgments preserve existing credentials and roles.

27 relevant local fixture tests passed, including five public-role paths and
security/navigation cases. The new test file is
`mobile-app/test/email_registration_navigation_test.dart`. Focused Flutter analysis
reported no issues. The explicit staging build succeeded with:

```text
node mobile-app/scripts/build-android.mjs --mode service --config config/staging.local.json
```

The debug APK is 184939163 bytes, SHA256
`591cc3c77fa249d181a4a8583a505fd1abfb5612b5da0add5b2e3d5b60f42b89`;
provenance is
`mobile-app/build/android-source-builds/2026-11-02T09-16-24-832Z-1744/build-record.json`.
It was installed using `adb install -r` on `emulator-5554`.

Actual Create Account actions reached BUYER/USER, OWNER, BROKER, BUILDER and
SERVICE_PROVIDER dashboards automatically, without a separate Sign In tap.
BUYER/USER opened the real marketplace Home; its My profile view then retrieved
the controlled account's name and Property Buyer role from the backend. Existing
controlled staging accounts were reused: generic duplicate acknowledgment, then
actual Auth.js/session/profile confirmation
and the correct dashboard. No new account records were created in this run; this
evidence must not be described as first-time account creation. Captures are
`mobile-app/build/staging-auth-verification/owner-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/broker-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/builder-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/service_provider-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/user-auto-signup-dashboard.png` and
`mobile-app/build/staging-auth-verification/user-auto-signup-profile.png`.
All five public-role automatic-navigation checks passed on the installed APK;
there are no pending role checks in that controlled set. First-time account
creation was not retested in this run.
Independent source review found no concrete new lifecycle/security defect.
Actual Android presentation was reviewed directly for Buyer Home, including the
valid empty database catalogue, and Owner; internal Flutter render captures were
not substituted for device evidence. Final Buyer sign-out returned to the
unauthenticated Who are you? screen with no controlled account logged in.

The first BUILDER automatic attempt displayed a recoverable Unable to connect
error, explained that signup was submitted but authentication was unconfirmed,
and offered Continue to Sign In. It did not repeat registration or open a
dashboard. Explicit sign-in recovered and opened the BUILDER dashboard; a later,
deliberately initiated controlled registration-form test after sign-out passed
the automatic handoff. The underlying network cause is unconfirmed; no source
defect or automatic retry is inferred from this observation.

Remaining acceptance scope:

1. Keep first-time record creation distinct from this run's controlled
   duplicate-account handoff evidence. Earlier creation behavior is documented
   below; creating another account was not required for these correction checks.
   A newly created account must not be claimed as verified by this run.
2. Extend actual-device negative-path acceptance as needed: failed authentication/
   profile loading, interrupted requests and role mismatch must remain recoverable
   and never repeat registration automatically or open an unauthorized dashboard.

No backend/schema/migration/environment change is required for the source
correction. No backend/schema/configuration, environment, deployment or
database-command changes were made, and no new account records were created.
Approved authentication quota and session writes used the existing staging APIs.
Earlier staging activation is not undone. Approved legal content and versioned
consent, native recovery, social sign-in, wider session/security acceptance,
nonempty listings/media, business workflows, separate credential
rotation and production release remain the independent gates documented below.

## Staging activation completed; remaining acceptance gates - 2026-11-02

This section supersedes the earlier same-day missing-HMAC/origin conflict gate below.
Following explicit founder approval, `PASSWORD_SIGNIN_HMAC_KEY` was provisioned
privately and `NEXTAUTH_URL` was aligned with the approved staging origin. Successful
configuration deployment `1e1efa9f-1dc8-4684-b289-fa82e000c758` runs commit
`c71f626da51ae688d2a79d953300f3f50d6e7442`. The earlier automatic rejection was
subsequently superseded by that exact approval; it is no longer the current blocker.

`AUTH_SECRET` and database credentials/URL were not changed; production was untouched.
Railway's automatic pre-deploy runner reported 21 migrations and no pending changes.
No manual SQL/database/migration commands were executed. Password-provider callbacks
now target staging; invalid native registration returns 400, browser missing-Origin
returns 403 and unauthenticated profile returns 401.

Actual Flutter registration, separate sign-in, backend profile confirmation and
correct dashboard navigation are verified for five synthetic controlled staging
accounts: USER, OWNER, BROKER, BUILDER and SERVICE_PROVIDER. USER displayed the real
marketplace/profile; OWNER My listings, BROKER Leads & pipeline, BUILDER Projects &
inventory and SERVICE_PROVIDER Provider profile displayed valid empty results.
Independent session/profile checks returned 200 with the correct role for every
account; the four corresponding role-workspace module reads returned 200.

Actual app force-stop/restart restored USER and SERVICE_PROVIDER profiles and their
correct dashboards without clearing app data. Independent logout returned
200, protected profile returned 401 and replay of the previous session cookie
returned 401 for each controlled account. Actual Flutter USER logout acknowledged
server sign-out and cleared local access. A duplicate USER registration with a
different password and BROKER role preserved original USER credentials/role;
public ADMIN/SUPER_ADMIN registration returned 400. No OTP or mail was sent.
Actual Flutter selected-OWNER login with correct USER credentials rejected the role
mismatch, opened no dashboard and acknowledged sign-out without an uncertainty
warning. Actual Flutter Buyer login with an incorrect password displayed the generic
credential rejection and opened no dashboard. The app was left at public role
entry without an active test-account session.
These results establish the tested authentication journeys, not every business
capability, arbitrary account or application-release requirement.

Remaining work:

1. Broaden security/session acceptance as appropriate before release: additional
   account isolation, suspension/revocation, expiry, transient-network and concurrent
   operation cases are not all established by the controlled happy/negative paths.
2. Address nonblocking UI polish in a separate source slice: after an authentication
   result, password clearing can trigger required/minimum-length field warnings.
   Authentication rejection and role mismatch remained correct; no source change
   was made for this display issue in the activation task.
3. Verify nonempty property details/media and authorized role-specific business data
   separately. A service-provider role does not itself create a verified provider
   business entity or authorize incoming jobs; preserve existing business gates.
4. Supply approved Terms/Privacy documents and resolve versioned consent persistence;
   current `termsAccepted` is a request acknowledgment and `consentRecorded:false`.
5. Complete native recovery and social integration only in their approved scopes;
   current forms/buttons explicitly do not perform those actions.
6. Retain separate media-host, exposed-credential rotation and production-release
   approval/readiness work. No production readiness is implied by staging login.

No new application/backend source changes, builds or tests were performed for this
activation follow-up. The earlier committed local 84-test result was not rerun.
No commit or push was performed; historical sections below remain for traceability.

## Confirmed authentication activation gate — 2026-11-02

Two concrete staging configuration issues are now established by authenticated
Railway compliance inspection, not inferred from response timing:

1. NEXTAUTH_URL conflicts with the staging AUTH_URL/AUTH_STAGING_ORIGIN. Logs show
   registration `stage:origin`; signup returns503 and Auth.js returns Configuration.
2. PASSWORD_SIGNIN_HMAC_KEY is missing. Both native email registration and existing
   password-login admission require it. Do not weaken or replace the shared DB limiter.

Verified target: homezone project `1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, staging
environment `2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, HomeZone backend
`ea6ca516-4063-4ed1-be95-bebcc0d1af00`. Domain maps to staging only on that instance;
active deployment1487808f... matches local source e0181263.... Private comparison
confirms staging Postgres-9ZqA binding. Active deployment's migration log reports21
migrations and none pending. No database commands executed; no database fault proven.

Automatic approval review rejected the exact variable/provisioning command because
the broad request did not explicitly approve these persistent settings and potential
configuration deployment. No variables changed or deployment triggered. Required next
explicit approval is only these two settings and their staging deployment effect;
production/AUTH_SECRET/database credentials remain outside the change.

Local/device blockers already addressed: outer VS Code launch profiles now pass
staging defines; main requires explicit mode so missing defines cannot silently run
demo authentication; a staging APK built/installed/rendered; Configuration errors no
longer masquerade as bad passwords. Local five-role/mismatch and session tests passed.
These fixes do not make the misconfigured deployed backend authenticate successfully.

After settings activation: actual controlled account creation, login, backend role
readback, dashboard, restart restoration, mismatch and logout/revocation are still
required. So far the one controlled Flutter signup and sign-in did not establish
an account/session. Do not claim the five test identities exist merely because
encrypted local credentials were prepared. No OTP/mail sent, no blind create retries.

Approved legal content/durable consent, native recovery/social integration and prior
credential-rotation review remain separate release gaps. No migration, database
command, backend source change, production access, commit or push in this execution.

## Updated registration blockers — 2026-10-30 11:32 UTC

The earlier native email route404 is NO LONGER REPRODUCIBLE: staging GET now405,
OPTIONS204 with Allow OPTIONS, POST. Password provider200 and staging callback origin
also confirmed. Source native registration is committed in local HEAD88fc8f82...;
deployed SHA still UNKNOWN. Do not continue diagnosing a currently missing route or
claim a successful registration from these nonmutating probes.

New confirmed source/artifact mismatch: existing app-debug.apk was written08:35 UTC;
its debug kernel contains the PIN registration URL but not the native email
registration URL/current feedback. It cannot represent the current email-flow source.
If installed, it is a supported explanation for the wrong registration journey.
Installed/running artifact not inspected; no emulator/build/install/launch authorized
or performed here. Latest script build record also cannot prove current APK identity.

Needed next: existing failed POST status and sanitized server stage; privately verify
AUTH_URL/NEXTAUTH_URL/AUTH_STAGING_ORIGIN consistency, PASSWORD_SIGNIN_HMAC_KEY
length32-256 and database quota/account schema only if that stage warrants it.
Stages: origin(configuration), request-admission(DB quota), validation(input),
attempt-admission(HMAC/config/quota), password-hash(scrypt), account-create(transaction).
403 identifies supplied Origin mismatch/cross-site in the registration handler;
400 invalid fields/JSON,429 quota,503 unexpected stage-labelled failure. No stage
alone proves a specific database error or missing secret.

Separately authorize a fresh staging build/install/launch for current source, then
controlled account/signup/login verification. Do not deploy again or modify backend
security merely to resolve an outdated APK. No application source changes justified
by this inspection. No registration POST, accounts, tests/builds/device/database
operations, settings, deployments, commits or pushes performed.

## Confirmed staging route availability blocker — 2026-10-30 11:14 UTC

- Staging advertises existing `password` provider with correct staging callbacks
  (GET providers200). No need to activate mobile-pin for the latest email/password UI.
- Native email registration URL returned404 for GET and OPTIONS. Local source
  contains POST `/api/mobile/auth/email-register`; native route is untracked and
  related changes are uncommitted. Deployment/routing mismatch is SUPPORTED;
  exact deployed SHA/artifact/service identity is UNKNOWN. No registration POST sent.
- Unauthenticated GET session returned200 without a user. Actual login, stored role,
  secure persistence and logout are still UNVERIFIED. Public catalogue database-read
  success does not establish them.

Next dependency: obtain the active staging HomeZone deployment ID/SHA and confirm
domain/environment mapping privately in Railway (CLI not available on PATH here).
Compare the artifact with current working-tree changes, not only HEAD. Then approve
local compilation/checks and an exact staging release. Review pending migration set,
schema/client/configuration and recoverability first: deployment pre-step automatically
runs `npm run db:migrate`. Preserve pending credential-rotation and consent release
gates. Do not redeploy merely to diagnose or silently enable PIN.

Separate approvals remain required for deployment/migrations/settings and controlled
staging account creation/sign-in/session writes/device launch. No such operations
were performed. Only these status/blocker docs changed in this follow-up; prior user
work and application source were preserved. All public checks targeted staging only.

## Email/password sign-in and session slice — 2026-10-30

SOURCE IMPLEMENTED, NOT COMPILED OR RUNTIME VERIFIED in this task. Email/password
compatibility, CSRF/callback/session, scoped secure storage and logout already
existed. This slice closes the pre-navigation profile/role confirmation and loading
gap through one shared repository check, adds owned-session rejection, and corrects
the profile gate Sign in again action to use logout before re-entry. No backend,
website/admin, PIN, schema, provider or environment changes.

Remaining gates in order:

1. Founder source review, then separately authorize compilation/focused validation.
2. Phase0 effective staging artifact/origin/configuration/schema/client readiness;
   core DATABASE_URL/AUTH_SECRET/PASSWORD_SIGNIN_HMAC_KEY and existing credential,
   profile, AuthSession and quota/index dependencies remain unverified live. No new
   variable/migration proposed. Preserve outstanding credential-rotation controls.
3. Authorized controlled native email signup and separate password login, profile
   role match/mismatch, bad credentials, rate/network errors, suspension, expired or
   revoked session, restart/storage and logout failure cases. No current runtime claim.
4. Approved Terms/Privacy content and durable versioned consent remain missing.
   `termsAccepted:true` only validates acknowledgment; `consentRecorded:false` remains
   truthful. Native recovery/social flows remain later incomplete source work.

Secure persistence/restoration/logout architecture is retained, not proven by source:
failed vault writes leave memory-only auth; restore network failures clear local auth;
failed server signout/device credential removal must not be called confirmed logout.
Interrupted sign-in/profile handoff clears captured local authority but cannot promise
remote revocation. Actual account/role isolation and Android presentation require later
authorized verification. Phase0 remains PENDING; no activation implied.

No tests, builds, live requests, accounts, DB/device operations, migrations, settings,
credentials, deployments/restarts, commits or pushes performed. Stop for founder review.

## Native email registration update — 2026-10-30

Native role-aware email registration is SOURCE IMPLEMENTED through the existing
password hashing/registration architecture and same Flutter repository. Earlier
native-contract/unavailable notes below are historical. Current source not compiled
or runtime verified; no account/DB/network/build/test/device operations performed.

Still outstanding: approved Terms/Privacy content and durable/versioned consent
architecture. Current server enforces termsAccepted:true as request acknowledgment
only, returns consentRecorded:false and stores no legal-consent proof. UI discloses
that limitation. Do not claim legal release readiness or invent documents/versions.

Deployment/schema/client/config verification and actual role-account/signup/sign-in
journeys need separate approval. No new migration/variable; existing RegistrationBudget,
User normalized-email unique index, PasswordCredential/Profile and PASSWORD_SIGNIN_HMAC_KEY
required. Native quota namespace independent from browser/PIN; deployment still may
run all pending migrations. Browser strict-origin/default USER contract and PIN preserved.
Recovery/native social flows remain later source work. Phase0 PENDING separately.

## Latest email authentication UI requirement — 2026-10-30

Founder now requires Full name + Email + Password + Terms Create Account; earlier
PIN-only UI statements below are history. PIN backend/mobile components retained.
First slice restores existing email-form navigation/password-login integration and
prevents local simulated signup/recovery success in service mode.

Remaining: approved legal content/consent contract and native no-OTP email signup
with public-role validation/persistence. Existing browser-only web signup defaults
USER and cannot simply accept native calls/extra role. No origin bypass or invented
consent persistence. Recovery backend exists; native secure token/link flow missing.
Google has conditional backend only, no native handoff; Apple provider absent.

Current signup/recovery forms clearly report unavailable and send no request.
Complete authentication remains INCOMPLETE/RUNTIME UNVERIFIED, not source-complete
for this latest policy. No tests/builds/device/API/database operations; Phase0 remains
PENDING. Stop after current review slice before backend/consent contract implementation.

## Phase 1 — registration slice, 2026-10-30

Registration source already implements the approved PIN/public-role transaction flow.
This slice closes strict PIN/mobile end-boundary validation (including final line breaks)
and aligns Flutter number validation. Regression cases added but not executed.
No new API/model/migration/infrastructure needed. Existing generic duplicate no-op
preserves account privacy and never changes credentials or existing role.

Remaining: separately authorized checks/builds and controlled actual Flutter signup,
duplicate/invalid/role cases, subsequent PIN login/profile and account/session evidence.
All runtime results UNKNOWN; Phase0 remains PENDING with deployed source/schema/PIN
activation/secret readiness gates unchanged. No accounts or DB/network/infra operations.
Admin password-enrollment policy and stale mobile help copy remain distinct follow-up
decisions/tasks, not new registration requirements. No OTP/recovery/approval introduced.

## Phase 1 — admin compatibility update, 2026-10-30

Canonical identity and capability-aware UI are SOURCE IMPLEMENTED in both admin
user-list and listing-owner views. PIN-only accounts no longer show website reset;
website/dual-credential accounts retain the existing action. Hashes are excluded
from these query projections. Password route read is narrowed without policy change.

Remaining: source review and separately authorized compilation/tests; no runtime
claim. A direct authorized website-password route can still create PasswordCredential
under its existing upsert policy, even when UI hides it. A server restriction for
PIN-only users requires separate policy approval; no PIN hash/reset is involved.
Stale mobile help copy remains a later source task. Phase0 remains PENDING, not a
blocker to independent source work; deployment/authentication activation still
requires its separate evidence and approvals. No builds/tests/database/env/deploy
or device operations were performed for this slice. Earlier entries are historical.

## Phase 1 source slice — 2026-10-30

Admin canonical mobile search/display is now SOURCE IMPLEMENTED in operations.ts
and admin/users/page.tsx, with no credential hashes selected and no schema change.
Source diff inspected only; no compilation, automated checks or runtime verification.
Phase 0 remains PENDING, separately from source implementation readiness.

Next review boundary: approve/review this two-file source slice before expanding
to shared AdminUserPanel credential capabilities and both callers. PIN-only users
still see the existing website-password action until that next UI correction;
it does not reset their PIN. Any server restriction of existing admin password
enrollment/upsert remains a separate policy decision per the implementation plan.
Stale marketplace email-verification help text also remains a later text-only task.

No staging activation, migration, credential rotation, deployment or account writes
were performed. Historical successful tests below predate this source change and
must not be reported as validation of this slice. Runtime blockers remain pending.

## Latest mission: confirmed runtime gates — 2026-10-30

Current source compiles; full Flutter suite passes 300 tests and standard npm test
passes including both new PIN suites. Current staging APK is built, installed and
visible. Direct sign-in after role selection and public catalogue HTTP 200/empty
were verified on the actual emulator. Source code is not the current live blocker:

1. **Deployed PIN login unavailable:** read-only GET /api/auth/providers returned
   HTTP 200 without mobile-pin. This confirms absence from advertised providers,
   not whether old deployment or feature configuration caused it.
2. **Registration route deployment/routing unresolved:** read-only GET
   /api/mobile/auth/register returned 404. No live POST was attempted. The reviewed
   source route must be reconciled with the deployed artifact before account tests.
3. **Target/schema/config unknown:** public catalogue success does not establish
   MobilePinCredential, MobilePinLoginBudget, User.sessionVersion or AuthSession
   readiness. Effective staging IDs, migration history/checksums/partial state,
   backup/restore and secret/provider settings remain owner-unverified.
4. **Authorization gates remain:** exact migration action, Railway changes, staging
   deployment and live test-account/database writes each need separate approval.
   This mission authorized local source/build/tests, not those operations.
5. **Authenticated modules:** USER/OWNER/BROKER/BUILDER/SERVICE_PROVIDER workspace
   source is compiled; real role dashboards, restore/logout, favorites/enquiries,
   submissions, inventory and service mutations remain unverified until approved
   accounts/records and live-write authorization exist. Protected workspace roles
   now also must match the verified Flutter session before records are displayed.
6. **Property/media fixtures:** catalogue still has zero published results; no
   properties were created/published. Existing empty media allowlists intentionally
   prevent remote media. Owner must approve records/hosts before detail/media tests.

### Concrete approval sequence to unblock operations (not executed)

- First provide nonsecret Railway project/environment/backend/database service IDs
  and staging database/schema identity. Confirm runtime and migration runner target
  the same isolated staging database, and supply sanitized history/schema/recovery
  evidence. Do not send secrets or full connection strings.
- Review the complete local modified/untracked implementation and choose an isolated
  staging deployment artifact/branch. Current branch main has uncommitted work;
  do not push it or assume it cannot trigger production deployment.
- If PIN migration is pending, present the exact approved pending set and staging
  migration action for permission. No assumed migrate resolve/reset/backfill.
- After schema readiness, separately approve required staging-only variables:
  AUTH_MOBILE_PIN_ENABLED, MOBILE_PIN_PEPPER_V1, MOBILE_PIN_RATE_LIMIT_KEY and any
  confirmed canonical-origin/registration-policy changes. Generate/provision secrets
  privately; approved trusted ingress IP header must be proved, not guessed.
- Separately approve deployment to the confirmed staging service serving
  https://homezone-staging.up.railway.app. Include source PIN route/provider/role
  contract, automatic predeploy migrations and rollback plan. Retain new credential
  tables, accounts and pepper on rollback; disabling feature does not erase data.
- Then approve ONE registration for an owner-controlled unused +91 test number,
  role USER, PIN supplied privately on-device. Scope includes quota writes, account/
  profile/credential creation, AuthSession creation, incorrect-PIN budget changes
  and logout revocation. Never send that PIN in chat. Extend to the other four
  roles only with explicitly approved account/data scope.
- Verify real Flutter signup -> separate PIN login -> profile/dashboard -> restart
  restoration -> logout/revocation, then independent role/business milestones.

All independent local implementation/check/build/UI/public-read work described in
the current status report was completed. Stopping before the live approval gates
is required by the owner, not evidence that an unavailable provider was tested.

## Earlier blocker context (still applicable unless superseded above)

## Role-first milestone update — 2026-10-30

The founder approved direct public roles USER, OWNER, BROKER, BUILDER and
SERVICE_PROVIDER. New registration now requires role and stores the validated
selection; no ADMIN/SUPER_ADMIN or other assignments are accepted. Earlier
default-USER-only statements below are historical and superseded. Login compares
the selected role with authenticated session and fetched profile; it never changes
an existing role. No schema change is needed for these existing enum values.

Remaining gates: reconcile staging schema/history and secrets, review the expanded
public-role policy against resource permissions, approve backend deployment and
account writes separately, then verify new-account roles, duplicates, mismatches,
restoration/logout and actual workspaces using approved staging fixtures. Existing
business verification/ownership checks still apply; selecting a role does not
create linked teams/provider approvals/projects or privileged associations.
Coordinate the new required-role contract with the new APK: older PIN APKs omit
role and cannot register against this contract. Role-first screens and retained
Broker selection across signup/sign-in were verified in normal Android captures;
no live authentication was submitted. Previous catalogue evidence is not evidence
for new account creation or role dashboards. All previous database/configuration gates below
remain, except the explicitly superseded default-USER-only policy.

Updated 2026-10-30. Read HOMEZONE_COMPLETE_INTEGRATION_STATUS.md for exact source,
tests, artifact and Android evidence. Overall integration remains partial.

## 1. Enablement gate: PIN schema, secrets and backend deployment

Status: BLOCKED for live authentication, COMPILED locally.

No source inspection establishes the effective staging database or deployed
provider. Owner/infrastructure evidence must independently tie runtime and
migration runner to the intended staging project/environment/database/schema,
separate from production. Reconcile all intended migration names/checksums and
actual schema, including existing 20261030120000_mobile_pin_foundation,
MobilePinCredential unique normalizedMobile/userId, MobilePinLoginBudget and
AuthSession. This work did not execute that migration or any SQL.

Confirm recoverability before authorizing writes. Review the current local source
diff and approve the staging-only migration/configuration/deployment separately.
Deployment can trigger prisma migrate deploy through the existing predeploy
command, so deployment is not a harmless source publication.

Owner must privately confirm DATABASE_URL, AUTH_SECRET, canonical staging AUTH_URL
and NEXTAUTH_URL consistency, AUTH_STAGING_ORIGIN approval and NEXT_PUBLIC_SITE_URL
relationship; demo providers should remain disabled for real account verification.
Confirm MOBILE_PIN_PEPPER_V1, MOBILE_PIN_RATE_LIMIT_KEY and optional login/registration
policy values meet documented rules. Never paste secrets/URLs into chat.
AUTH_MOBILE_PIN_ENABLED must not be turned on before schema/configuration and
reviewed backend are ready. No Railway value was inspected or changed here.

Decide whether Railway reliably overwrites a single client-IP header before
selecting MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER. Without that verified choice,
all registration callers share the conservative 10/hour ingress bucket. Do not
raise limits or trust forwarding headers merely to pass a registration test.

## 2. Controlled PIN authentication verification

Status: BLOCKED pending the above and explicit account/write authorization.

Approve a staging-only test number and new account procedure through a private
credential channel. No OTP/phone-possession proof is implemented by design. A
first claimant can claim an unused number; PIN hashing/throttling do not prove
ownership. Legacy Profile.phone collisions are refused generically, not linked;
manual account-enrollment/recovery policy remains unresolved. Forgot PIN is
intentionally unavailable. Secure backup of the pepper is essential; no automatic
pepper rotation/reset procedure is provided.

Then verify actual Flutter registration acknowledgment -> separate PIN login ->
CSRF callback -> independently verified session -> profile/default USER dashboard.
Include leading-zero PIN, duplicate/concurrent registration without overwrite,
wrong PIN/temporary lockout, success not consuming failure allowance, aggregate
limits, stale requests, expiry, suspension, restart/secure restoration, logout and
server revocation, and two-account isolation. Local mocked tests do not prove
PostgreSQL locking, real Auth.js cookies, capacity or durability.

## 3. Populated catalogue and media

Status: public empty catalogue RUNTIME VERIFIED; nonempty/detail/media BLOCKED.

Owner must authorize use/publication of an appropriate staging property through
the existing supported property/admin lifecycle. Do not seed or insert records
directly. Identify property ID, publication/verification state, ownership and
approved media hosts. Empty image/media allowlists are unchanged and intentionally
block remote media; approving exact hosts is separate configuration work.

Verify discovery tap -> correct ID detail -> nullable fields/price/location/
amenities -> gallery and allowed video/tour links; unpublished/unavailable cases,
filters, pagination, loading/errors and retries. Current empty result is not
evidence that a migration/table or all property records are missing.

## 4. Authenticated business workflows

Status: existing source COMPILED, live behavior BLOCKED.

After approved accounts/data are available, verify saved/shortlist/enquiry writes,
owner draft/edit/media/status/enquiries, broker assignments/team/commission,
builder inventory/reservations and service quotes/bookings in small independent
milestones. Each requires explicit staging mutation approval and authoritative
server roles/records. No new registration roles or privileged associations were
introduced. Current generic workspace wiring is not evidence every business
workflow is operational. Cross-account/resource ownership checks need runtime
evidence as well as existing local authorization tests.

## 5. Supporting product gaps

- Native push/device-token delivery NOT IMPLEMENTED in the reviewed mobile surface.
- Rich native admin, payment checkout/refunds, some Studio/operator/social/AI
  workflows remain missing/partial native capability or website handoffs. Existing
  backend APIs must be assessed per module; these are not all missing APIs.
- Actual refund, deletion and retention execution needs business policy/capability
  review; account-request acknowledgment must not be displayed as completion.
- Fictional buyer preview remains demo/local; no demo records were connected as
  database records and no fake-success replacement was added.
- Full current end-to-end role journeys and all-screen runtime coverage remain
  outstanding. Do not interpret APK compilation as their completion.

## 6. Android and checks

The final APK rendered onboarding, empty discovery and PIN forms in normal Android
screenshots. Black display did not reproduce; original root cause remains unknown.
No permanent renderer workaround was applied. Recheck presentation on a physical
device and cold/warm restart before release. Current output is debug, not a signed
distribution release.

Backend TypeScript, final npm test, eight PIN registration tests and 100 focused
Flutter tests passed. Analysis retains 77 lint/style notices. Full production
Next.js build, real PostgreSQL concurrency/capacity, complete Flutter suite and
all business-module runtime verification are not claimed.

## Next owner action

Review the local PIN enrollment/mobile diff and obtain the sanitized staging
schema/configuration/recoverability evidence in item 1. Approve the exact staging
migration/configuration/deployment scope and one controlled test-account procedure
separately before any live authentication write. Production remains out of scope.
