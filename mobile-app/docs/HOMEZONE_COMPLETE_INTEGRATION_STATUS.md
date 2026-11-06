# HOMEZONE integration implementation status

## Familiar inbox and thread presentation - COMPILED / BUYER ANDROID VERIFIED - 2026-11-06

`lib/features/engagement/chat_presentation.dart` and
`lib/features/engagement/engagement_screens.dart` provide compact avatar rows,
local peer/property search, clear empty/no-match states, a peer/property thread
header, date-separated grouped bubbles and a rounded composer with an adjacent
send button. Incoming messages stay left and outgoing messages right; true
message times and existing server-backed receipt ticks are retained. The inbox
uses only available conversation metadata, with no fake unread/online status or
unsupported call/attachment actions.

The previously verified Buyer/Owner bottom tabs are preserved. Session-bound
private-state clearing, peer-header gating, polling and viewport receipt logic
remain in place. No backend/authentication/schema/configuration changes are
part of this presentation slice. **101/101 focused tests across eight files PASS**:
search/clear, stale taps, narrow 320x640/2x keyboard layout, uncertain idempotent
retry, long messages/final-message visibility and existing receipt/privacy,
navigation and role regressions. Source analysis exits 0 with zero errors/warnings
and 42 informational style findings. Evidence:
`build/chat-verification/chat-ui-focused-final-20261106.log`.

The explicit staging Flutter run built in 52.7s and installed in 21.7s. Actual
Android Buyer rendering verified the inbox, search no-match/clear and an existing
staging thread with both bubble sides, day separator, times, blue double-read
ticks and rounded empty composer/send disabled. The existing Buyer session was
already restored; no fresh login, new account or new message was used in this
presentation check. Updated Owner presentation has shared-widget/test coverage,
but no fresh Owner native pass. The emulator soft keyboard did not appear;
keyboard stress is verified through widget tests, not the focused composer PNG.
Actual Android evidence: `build/chat-verification/chat-ui-buyer-inbox-20261106.png`,
`chat-ui-search-no-results-20261106.png`, `chat-ui-buyer-thread-20261106.png`.
Back returned to the selected Messages tab; the cleared search and inbox were
visible in `chat-ui-return-inbox-20261106.png`. Verification metadata is in
`build/chat-verification/chat-ui-verification-20261106.json`.

Latest APK: `build/app/outputs/flutter-apk/app-debug.apk`, x86_64 emulator debug,
100,135,339 bytes, SHA256
`1add4084c2d835f5c00f05a9eb3c7ac1420ea0afa59fa33031e25a10375e660b`.
Build/run: `flutter run --no-pub -d emulator-5554 --dart-define-from-file=config/staging.local.json`
from `mobile-app/`. The earlier APK hashes below are superseded, not current
artifact identifiers. No backend source/schema/configuration/deployment changes.

## Primary Messages bottom tabs - COMPILED / ANDROID VERIFIED - 2026-11-06

From `main/c282aa60315fe3ba2bd621d932815497586e2277`, Owner navigation is
Home / Listings / Enquiries / Messages / More. Buyer navigation is
Home / Search / Saved / Messages / Profile. Both open the existing scoped inbox
as the actual tab child, with its own Scaffold and shared bottom navigation.
Leaving Messages disposes/cancels inbox polling; thread Back restores the selected
Messages tab. Buyer Enquiries stays under Profile with both Back paths, including
escape during a pending read and stale-response protection. Standalone inbox,
authentication, receipts and backend contracts remain unchanged.

**90 focused tests across seven files PASS**, including navigation/polling,
logout/anonymous access and two pending-read Back regressions. Final analysis exits
0 with zero errors/warnings and 40 existing informational style lints.

The explicit staging Flutter APK build/install passed. Actual Buyer native login
showed all five Buyer tabs; Messages (fourth) loaded the existing controlled Owner
thread from staging with Messages selected and the bottom bar visible. Buyer
Profile sign-out returned to role selection. Actual role-first Owner login showed
all five Owner tabs; Messages (fourth) loaded the controlled Buyer thread with the
same persistent bottom bar/selection. Captures:
`build/chat-verification/buyer-messages-bottom-tab-20261106.png` and
`owner-messages-bottom-tab-20261106.png` were visually reviewed. No new accounts,
messages, listings or payments were created. Final Owner sign-out returned to
Welcome Back / Sign In with server acknowledgement/local clearing and zero
encrypted-vault entries. Both controlled native sessions in this slice were
explicitly signed out; final app state is unauthenticated Sign In.

An initial Android DeadSystemException/JNI/FUSE failure interrupted presentation.
Rebooting the existing emulator preserved app data and recovered normal onboarding
and both role checks. No renderer/theme/native-window changes were made; this is
not a claimed permanent fix for historical black-screen causes.

Earlier Nov 6 navigation x64 emulator APK (superseded above): `build/app/outputs/flutter-apk/app-debug.apk`
(same hash at `outputs/apk/debug/app-debug.apk`), 100,135,339 bytes, SHA256
`2cf8f0f3c37a0d6064b0eafd7f8424e9deaec61b9419bb9cce23596e93b19962`.
The older Nov 5 hashes below are historical; this x64 check does not verify ARM
physical-device compatibility.

Build/launch used `C:\src\flutter\bin\flutter.bat run --no-pub -d emulator-5554 --dart-define-from-file=config/staging.local.json`
from `mobile-app/`. After emulator recovery, Android launched the already-installed
`com.example.homezone_mobile/.MainActivity`; no replacement build was used.

No backend, schema, migration, deployment, variables, production, commit or push
changes. Existing verified chat/receipts below are not a new paid-purchase claim.
Evidence: `build/chat-verification/bottom-messages-focused-final-20261106.log`,
`bottom-messages-analysis-final-20261106.log` and
`bottom-messages-recovery-20261106.png`.

## Chat receipt ticks - BACKEND CONNECTED / ANDROID VERIFIED - 2026-11-05

Outgoing messages show Sent (one grey tick), Delivered (two grey ticks) and
Read/displayed (two blue ticks), exclusively from server-confirmed acknowledgements.
Recipient acknowledgements are authenticated, participant-only, bounded,
transactional, idempotent and database-rate-limited; GET does not mark messages.
Flutter reads only substantially visible messages in the current foreground chat,
retains account-generation safeguards, and refreshes outgoing status even on
empty history polls. Legacy backends safely keep single ticks.

Founder-approved receipt activation is complete on staging deployment
`967b0c35-876f-42ec-8051-264fed2fd336`, SUCCESS, created
2026-11-05 11:46:49.525 UTC. Target remains project `1f8c9007-2993-426c-bbd0-b8dd0a0b17da`,
environment `2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, backend
`ea6ca516-4063-4ed1-be95-bebcc0d1af00`. CLI upload is the reviewed uncommitted
working tree based on `1b091c0fdbb68030f5b14927322f61bcd140a603`.

Staging DB-volume backup `4aadc027-526f-4f82-992c-0a3096646797` was created/listed
at 11:45:34.731 UTC; it has **not been restore-tested**. Predeploy found 23
migrations and applied only `20261105140000_chat_message_receipts` at 11:52:05 UTC.
No variables changed; existing realtime start, empty selector, flags and photo
volume were retained. Public catalogue 200/source database/four properties and
public property WSS 101/ready passed after deployment.

**Actual receipt acceptance:** 35/35 controlled API checks pass. Actual Buyer
Android send showed one grey tick, then two grey ticks after explicit Owner API
delivery, then two blue ticks after read. Android PNGs were visually reviewed.
The Owner API reply remained undelivered/unread during six seconds with Buyer
backgrounded; after resume the actual native Buyer conversation displayed and
acknowledged it. Same-deployment logs identify Dart message POST 200 at
11:55:45.567 UTC and receipt POSTs 200 at 11:55:12.629 and 12:07:13.346 UTC.
Tick accessibility attribution remains UNKNOWN; visual evidence establishes ticks.
Outgoing messages are right-aligned, incoming left-aligned, and the 48dp send
button is beside the field with the keyboard open. Three labelled messages were
created in the existing controlled thread; all temporary API sessions signed out.
No new accounts, OTPs, listings, payments or contact-credit writes were performed.

**Local checks:** full backend `npm test` passed 398/398 tests across 23 files plus
6/6 platform smoke assertions and TypeScript typecheck. Focused Flutter receipt/
engagement checks passed 32/32; the final complete Flutter suite after the session
correction passed **585/585 across 42 files**. Prisma schema/client checks and
staging build pass.
These fixture checks do not establish every staging business workflow.

**Separate cold-restart correction:** actual restart exposed a five-second vault
read timeout before session HTTP verification. The ordered vault read now has a
20-second deadline; transient verification failure retains protected credentials
but grants no unverified access. Nine persistence regression tests pass. Final
APK SHA256 is `8ef4ce33c96a0561c57b58dc49a769b6039ecb821a320b2183e8fd50fc4264b3`.
Record: `build/android-source-builds/2026-11-05T12-26-34-541Z-22636/build-record.json`,
with explicit service/staging configuration and the exact staging origin.
Installed with data retained: Owner session restored to the real dashboard with
property image, then a second explicit force-stop/relaunch again restored Owner
without login. **Owner cold restart is DEVICE VERIFIED on this emulator**;
the precise native-storage latency/cryptographic cause is not established.
Same-deployment Dart session/account GETs returned 200 after the APK update
(12:44:23.447/12:44:24.693 UTC) and after explicit force-stop/start
(12:44:52.107/12:44:52.650 UTC), correlated with the actual restored dashboard.
Final Owner thread PNG also confirms outgoing right/blue double ticks, incoming
left/no ticks and side-by-side send. Native logout completed through the normal
flow, returning Owner to role selection with zero encrypted-vault entries and no
private chat visible; all temporary API sessions were signed out. The final full
Flutter suite passed; evidence is `build/chat-verification/flutter-final-tests-20261105.log`
and its summary JSON. Earlier regression-lost sessions may remain until normal
expiry; no revoke-all claim is made. Evidence:
`build/chat-verification/receipt-final-evidence.json`.

Receipt contracts, sanitized evidence filenames and rollback are documented in
`SUBSCRIPTIONS_AND_CHAT.md`. Keep schema/receipt data on artifact rollback; no
drop/reset or migration-history rewrite. Private chat remains foreground HTTP
polling (~4 seconds), with no private chat WebSocket/push. Paid checkout remains
disabled. No production access, secret rotation, database reset, commit or push.

## Historical chat send-button source/build checkpoint - 2026-11-05

The circular send icon now sits beside the message field in a compact bottom
row; sending, same-message retry and duplicate-submission safeguards are
preserved. All 17 engagement tests passed and changed-file analysis found no
issues. The staging debug build succeeded with the explicit staging config.
Latest APK SHA256 is
`6e8dd55ac15f2279dfa235ec1419c7091498a93d87db68003b43e155db6e6d22`, superseding
the artifact below. Evidence is in
`build/android-source-builds/2026-11-05T11-03-10-301Z-8272/`. ADB detected no
device, so this new layout is not device-verified and was not installed/launched.
No backend, database or deployment changes were made for this UI correction.

## Historical initial free-chat staging activation - 2026-11-05

Founder-approved activation is complete. Exact staging deployment
`f3975667-61c6-4ea8-90ce-456aaea913bb` is SUCCESS on project
`1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, environment
`2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, service
`ea6ca516-4063-4ed1-be95-bebcc0d1af00`. The actual503 cause was the missing
engagement flag. Enabled `HOMEZONE_ENGAGEMENT_ENABLED=true` and explicitly kept
`HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED=false`; all canonical/auth/DB secrets are
unchanged. CLI upload included current uncommitted cursor fixes; Git was not
committed/pushed. Base commit is `1b091c0...`, not a claimed new clean commit.

Prior deployed1b logs prove chat migration applied successfully at09:11UTC.
This rollout's predeploy reported22/no pending: zero new migrations applied.
Existing realtime start/flag, empty config-file selector and photo volume remain.
Post-deploy catalogue200 and existing public WSS101/ready passed.

ACTUAL ACCEPTANCE:27 API checks passed using existing controlled Buyer/Owner/
unrelated Broker accounts: send/reply, same-ID deduplication, persisted fresh-login
read, foreign404, anonymous401 and old-cookie post-logout401. No accounts created.
On emulator-5554, installed corrected staging APK with data retained. Buyer sent
from actual Flutter; Owner API received matching message and replied; the reply
appeared in the still-open Buyer screen without manual refresh. After Buyer
logout, native role-first Owner sign-in opened its dashboard; More -> Messages
showed the thread and native Owner reply was saved/read by Buyer. Railway logs
show two Dart message POSTs200 on this deployment, plus foreground polling GETs200.
All temporary API sessions and both native UI sessions were signed out.

One existing published test property/conversation and five labelled test messages
were used; no properties, contact preferences, credits, reports or payments changed.
The APK hash remains `ed31aba9b1d14b17e9c158446415c53a58e6e220bcd4b82e07b98fc1f9e3a87d`.
Actual Android screenshots, sanitized HTTP/session results, IDs, rollback and limits
are indexed in `SUBSCRIPTIONS_AND_CHAT.md` under the approved activation section.

Scope: controlled free chat verified on staging, not production/payment readiness.
Polling is approximately4seconds while foreground; no private WebSocket/push.
Simultaneous physical devices, offline/outage/load and paid contact plans remain
unverified. No production access, secret rotation, DB reset, commit or push.
The earlier blocked/source-only entries below are historical and superseded for
this free-chat activation.

## Historical chat verification - LOCAL VERIFIED / STAGING BLOCKED - 2026-11-05

Read-only staging GET `/api/mobile/conversations` returned503 `Chat and contact
plans are not available yet.` (server Date09:16:14UTC). The handler is reachable
but its feature gate is off; public evidence does not identify its active SHA or
confirm the new migration. Membership GET correctly returned401 without a session.
No live send/reply, account/session creation or DB operation was performed.

Fixed a confirmed backend forward-cursor ordering race by assigning strictly
increasing message timestamps under the conversation lock. The 19 backend
synthetic tests and full TypeScript check passed, including two-account
send/reply, duplicate acknowledgment, isolation and backward-clock regressions.
Flutter now advances history only from server read cursors, never a local send
receipt after an empty read. Its 16 focused tests pass and analysis reports no
issues, covering Buyer entry, inbox/replies, retry and revoked-session clearing.
No schema change is required for these corrections. Scope/evidence/approvals:
`SUBSCRIPTIONS_AND_CHAT.md`.

Corrected Next.js build passed. Updated staging APK COMPILED at
`build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes; SHA-256
`ed31aba9b1d14b17e9c158446415c53a58e6e220bcd4b82e07b98fc1f9e3a87d`.
Record: `build/android-source-builds/2026-11-05T09-06-43-994Z-36712/build-record.json`.
Explicit service/staging origin verified; no installation, launch, migration,
deployment or live chat acceptance occurred. This is the current APK, superseding
the initial implementation artifact below.

## Historical original free-chat and Plus source/build checkpoint - 2026-11-05

Added Buyer-to-listing-owner messages, inbox, block/report, owner contact-sharing
preferences and Free/Plus membership screens using the existing API/session
architecture. Plus is INR299/30 days/10 unique owners, with transactional credits
and explicitly approved contact sharing. Owners can reply and publish for free.
No public API includes owner phones. Private chat uses foreground authenticated
HTTP polling, not the public property WebSocket. Preview/auth/roles are preserved.

Backend includes the additive migration
`20261105120000_buyer_membership_chat`, captured-payment-only Plus entitlements,
duplicate-order reservation and refund revocation. Migration is NOT applied.
Chat/contact activation is default-off; website checkout has its own default-off
gate. Native purchase is deliberately unavailable pending payment-channel setup.
No new feature is RUNTIME VERIFIED or activated by these source changes.

Local evidence: full TypeScript check passed; 89 backend fixtures passed; 12 final
focused Flutter tests passed; broader 85-test Flutter batch passed (overlaps nine
focused tests). New Dart source/test analysis has no issues. Tests use synthetic
stores/responses, not real PostgreSQL, accounts or payment-provider transactions.

Staging debug APK compiled using `--mode service --config config/staging.local.json`.
Artifact: `build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes;
SHA-256 `157bcdd9ddcdc0a66d8d0bbd40e17d89e0211a5d1005c7584c0b215dd54d8cfa`.
Record: `build/android-source-builds/2026-11-05T08-46-11-766Z-1436/build-record.json`.
This build was not installed/launched. Next.js backend build also passed,
including lint/type checks and all new routes, using a dummy unavailable loopback
database and disabled/blank payment-provider configuration. No DB or provider
connectivity was tested by compilation. Activation, schema rollout and actual two-account/payment
acceptance remain separate owner approvals. Full contracts, limits and rollback:
`SUBSCRIPTIONS_AND_CHAT.md`.

## API loading shimmer - SOURCE IMPLEMENTED / LOCAL VERIFIED - 2026-11-05

Added a shared dependency-free shimmer/skeleton component for pending API reads.
Buyer catalogue/pagination, property details/images/related results, account tabs,
role dashboard metrics/records, profile/session gates, listing media and private
document lists use shaped placeholders instead of circular fetch indicators.
Pull-to-refresh retains its gesture without the circular overlay. Background
WebSocket catalogue/detail refreshes retain confirmed content; photo refreshes
keep existing images. Empty/error results still end loading and display their
existing messages. Mutation/upload and listing-step progress retain real progress
feedback. The local photo-picker opening indicator is not an API fetch.

The animation supports light/dark themes, reduced motion, hidden-route ticker
suspension and loading semantics; placeholders are noninteractive and contain
no invented records. No package, backend, database, auth/session contract,
environment, Railway or production change is required.

Validation: 82 existing catalogue/detail/gallery/workspace/photo widget tests
passed; the final 17 shimmer tests and 30 authentication/navigation tests passed.
Two initial accessibility-test handle-cleanup failures were corrected in the
test fixture, then the complete 17-test shimmer suite passed. Analysis of changed
files found zero errors/warnings (existing informational lints remain); the final
shared component/button/test analysis reported no issues. APK packaging and
actual Android presentation are tracked separately from fixture evidence.

Updated staging debug APK COMPILED using the existing offline workflow and
explicit `--mode service --config config/staging.local.json`. Artifact:
`build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes, freshly written;
SHA-256 `fd226d211aa6d0372d25b50ff54fa85f2dfcf7d1bb2beb96be18fdbaaecd3c22`.
Build record: `build/android-source-builds/2026-11-05T05-20-58-532Z-27040/build-record.json`.
Package `com.example.homezone_mobile`, debuggable, Android API24 minimum/API36
target, armv7/arm64/x86_64. The previous APK is preserved by the build wrapper.
This slice did not install/launch the new APK or verify Android presentation.

## Staging WebSocket publication - BACKEND CONNECTED / DEVICE VERIFIED - 2026-11-05

Activated the existing custom server on the exact staging backend with
`HOMEZONE_REALTIME_ENABLED=true` and `npm run start:realtime`. Railway rejected
legacy custom-file selection; the supported empty config-file selector was used
only for this staging service, preserving build/predeploy/restart/volume settings.
Pinned deployment `39f07478-4329-44a9-b59f-9866cc0a285c` is SUCCESS on
`9a2b1001b984c61d3fc9cc5d914a9934e105c75d`. Logs confirm server_started and
listener_ready. Existing predeploy reported 21 migrations/no pending; none applied.

ACTUAL ACCEPTANCE: staging WSS returned 101/ready. Existing staging Flutter APK
on emulator-5554 also logged ready. Left Buyer-facing discovery open, then used
an existing controlled OWNER account through the existing authenticated API to
publish one labelled test listing with two existing authorized staging photos.
POST returned 200/PUBLISHED, ID `cmw32s2dt0003ox0xo3ydesx7`. Observer received
properties.changed; Flutter logged change_received at 04:58:32.163Z and ensuing
catalogue HTTP 200 at 04:58:32.601Z. Actual Android screenshot shows the new card
and photo without manual refresh/navigation after publication. Public readback
is source database with three records and the matching ID. Diagnostic session
was signed out. No account was created, no unrelated property was altered, no
application source/schema/secret changed, and production was untouched.

This verifies foreground Owner publication -> WebSocket -> Flutter catalogue
read -> visible Buyer-facing card. Discovery was opened from the Owner Browse
properties action; distinct Buyer login, rental-specific acceptance, reconnect
under outage, load and multiple devices/replicas remain separate checks. No new
APK/local test run was required; previously installed staging APK was used.
`LISTING_WEBSOCKETS.md` records exact settings, screenshots/logs and rollback.
This supersedes historical WebSocket activation-pending notes below.

## Staging photo publishing - BACKEND CONNECTED / DEVICE VERIFIED - 2026-11-04

The founder authorized Railway access and activation. The matched staging backend
now has its own photo volume at `/app/property-media` and
`PROPERTY_PHOTO_STORAGE=railway-volume`. Attachment automatically released
deployment `9f87dfe1-e8d5-48ba-911b-8af27e64af09` on reviewed commit
`eeea9a3ce114923dcd352e9ad823a92a67afca3e`; status SUCCESS. Existing pre-deploy
logged 21 migrations/no pending; no migration was applied or manually executed.
Production and the PostgreSQL volume were untouched.

ACTUAL NATIVE ACCEPTANCE: retried the retained form once; Flutter created one
labelled test listing, uploaded two selected photos, confirmed stored media and
published from the one form action. Property `cmw269d0x0003pu0x0qnp0t90` is
PUBLISHED. Public catalogue returned 200/source database with the new record;
both photo GETs returned 200 and exactly matched the selected file bytes/hashes.
The current staging APK (`911f6941...1893d8`) was installed preserving data.
Owner session restored; actual Android screenshots show the new Owner card,
PUBLISHED detail, both Owner gallery images, Buyer-facing public card/detail and
both public gallery images. Public discovery used the Owner Browse properties
route; this does not constitute a new Buyer-account login test.

A controlled staging restart completed; cache-busted photo reads returned the
same bytes afterward. Volume instance `76294119-cffb-41e5-ba7c-546707940da3`
belongs only to the backend. No application code changed during activation,
no account was created, no existing listing was altered, and no commit/push
occurred. The one authorized public test listing remains clearly labelled.

The screenshot's storage-unavailable blocker is RESOLVED on staging. Foreground
automatic-new-publication/WebSocket acceptance was subsequently verified above.
Remaining: a distinct Buyer login, rental-specific acceptance, photo
backups/restore/capacity monitoring and
other role workflows. Detailed target/log/asset evidence and limitations:
`PROPERTY_PHOTO_VOLUME_STORAGE.md` (activation acceptance section). This section
supersedes the historical activation-blocked notes below.

## Staging volume photo storage - SOURCE IMPLEMENTED / LOCAL TESTED - 2026-11-04

The founder selected a Railway photo volume for staging and Cloudinary for
production. The existing uploader now supports explicit
`PROPERTY_PHOTO_STORAGE=railway-volume` for property photographs, with a new
staging-only mounted-volume adapter and public immutable image GET/HEAD route.
Cloudinary remains the default, production is gated out of volume mode, and
existing auth/ownership, two-photo publication/readback and media limits remain.
No schema/migration is added. The client image allowlist includes the exact
staging host; a new APK is required for this nonsecret build setting.

Local property-photo checks passed **66 tests**, and TypeScript checking passed.
Real temporary files, strict mount/origin/path/MIME guards, atomic write/readback,
sanitized errors and Cloudinary compatibility are covered. Synthetic mount
evidence does not prove Linux/Railway persistence or a successful device upload.

NOT ACTIVATED: the live backend still needs a dedicated photo volume, the new
provider selector and this backend release. Source work did not attach a volume,
set Railway variables, deploy, restart or change database/production data. Existing
`railway.json` pre-deploy can run all pending migrations and must be reconciled
before an approved release. End-to-end publication/Buyer auto-update remains
BLOCKED until activation and a controlled native acceptance run.
See `PROPERTY_PHOTO_VOLUME_STORAGE.md` for exact files, target, rollout and
Cloudinary transition/rollback requirements.

New staging APK COMPILED: `build/app/outputs/apk/debug/app-debug.apk`,
184,939,163 bytes, SHA-256
`911f6941883db901324c6977defee73e917bfaf7b5a12dfeb35a288d8e1893d8`.
Build record: `build/android-source-builds/2026-11-04T12-00-50-579Z-32676/build-record.json`.
Explicit `--mode service --config config/staging.local.json`, offline compilation;
previous artifact preserved. No installation, launch or live acceptance by this
slice. The installed earlier APK remains unchanged and cannot display the new
staging-host photo URLs until this candidate is installed after backend activation.

## Authorized Owner-to-Buyer emulator check - BLOCKED - 2026-11-04

Executed on `emulator-5554` against staging only, baseline
`8eec2030534300a850c3009f823d3ed5e42931fd`. Installed the existing explicitly
staging-configured debug APK (SHA-256
`d61f1a89674a91c2aba4626db2fb9962f994c85963aa75c759cc596bbf26d168`)
with `adb install -r`, preserving app data and the previous installed APK locally.
No build or automated test was run in this check.

DEVICE VERIFIED: Android presentation worked; the restored Buyer dashboard
displayed a real listing and its image. Buyer sign-out received a server
acknowledgment. The authorized existing Owner account then signed in through the
native form and reached the Owner dashboard with the server-confirmed role.
Whitelisted process-scoped Flutter diagnostics recorded catalogue requests to
the staging host returning HTTP 200.

Owner creation was exercised through all six steps using a clearly labelled test
title, Sell/Residential/Apartment, description, city, INR price and two distinct
nonpersonal test photos. Retained purpose/category/details and both selected
photo previews were visible on Review. One tap on **Publish listing** produced:

> Photo uploads are unavailable. Please contact HomeZone support. Your details
> and selected photos are kept on this screen. No listing was created.

This exact message follows `propertyPhotoUploadConfigured:false` from the
authenticated capabilities request (`workspace_screen.dart:2619-2627`). The
guard runs before the property POST (`:2631-2641`). The current backend flag
uses `getCloudinaryConfig()` (`src/app/api/mobile/capabilities/route.ts:13`),
which requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET` (`src/lib/media/cloudinary.ts:4-9`). The runtime evidence
confirms unavailable photo configuration; it does not identify which individual
variable is absent or validate any secret value. A Railway volume alone is not
connected to this upload implementation.

An independent read-only staging catalogue check at `2026-11-04T11:15:23.321Z`
returned HTTP 200, source `database`, one property and no matching test listing.
No new listing was created/published by the attempted flow. Automatic appearance
of a newly published property on an already-open Buyer screen remains BLOCKED,
not runtime verified. The form remains open with its inputs/photos retained;
submission was not retried. The error required scrolling down in Review to see.

Local ignored evidence: `build/owner-buyer-device-check-20261104/` contains
`publish-storage-error.png`, `public-catalogue-after.json` and
`sanitized-app-log.txt`. Do not publish unrelated account/profile screenshots.
No application source, Railway configuration, migration, direct database,
production, deployment, commit or push operation was performed. Native sign-in
and sign-out used their existing session APIs. Next: separately approve private
staging photo-provider configuration and its service effects, then repeat the
single-publication/stored-photo/Buyer-auto-update acceptance check.

### Follow-up of the displayed error: live configuration confirmed

Read-only Railway CLI inspection matched project
`1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, environment
`2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, backend service
`ea6ca516-4063-4ed1-be95-bebcc0d1af00` and the exact staging public domain.
The active successful deployment is `8979038d-85e1-4e69-81d6-c224ed21b0f4`,
created `2026-11-04T10:57:14.207Z`, commit
`8eec2030534300a850c3009f823d3ed5e42931fd`, matching local HEAD. This rules
out an older source commit as the cause of this particular missing-storage flag.

All three Cloudinary variable names are absent from that staging backend's
effective variable list. No secret values were displayed or saved. Its backend
has no attached volume or volume-mount variable; the environment's existing
volume belongs to PostgreSQL and must not be used for property photos. No object
storage bucket was reported. The local ignored `.env.local` also has no nonempty
values for the three Cloudinary requirements. Apparent entries alone are not
valid configuration: values were parsed privately rather than counted by name.

The smallest correction is to provision genuine approved staging Cloudinary
credentials, then activate them through a separately approved service action.
`config/staging.local.json` already allows the exact `res.cloudinary.com` image
host, so no speculative Flutter host bypass or new storage architecture is
needed. Browser access to an existing storage account was unavailable. The
founder was asked to populate the three existing entries privately in ignored
`.env.local`, not paste secret values into chat. No variable change, restart,
release, upload or repeat publication was attempted while credentials were
missing. Any release must still review `railway.json`'s migration predeploy.

## Five-role workflow repairs - SOURCE IMPLEMENTED / COMPILED / LOCAL CHECKED - 2026-11-04

Baseline `main` / `4994a03589b80acbfc1fce535d61319e1af98374` was clean before
this implementation. Source corrections now address the confirmed high-priority
cross-check findings. This section supersedes the old open-source defect status;
it does not supersede the requirement for current staging/Android acceptance.

- Buyer: enquiries are bound to the opening account/role/session and cannot be
  submitted or acknowledged under a different account. Uncertain enquiries and
  generic creates cannot be replayed from the same form. Public enquiries,
  favorites and shortlist additions require a currently published property.
- Owner: the existing two-photo/six-selection single Publish listing flow stays
  intact. Final photo attachment repeats current role/ownership admission. New
  `Unpublish listing` uses reversible DRAFT instead of self-archive; changing
  listing status requires matching property ID/status acknowledgment. Historical
  ARCHIVED records remain support-only to preserve moderation.
- Broker: commissions and lead/timeline updates are atomic, with fresh admission
  and authorized own-team agent attribution. Manual leads identify DASHBOARD
  source. Team contacts are clearly distinguished from linked account members.
- Builder: foreign tower IDs are rejected; primary records/counters/activity and
  reservations/status changes commit together. Fresh Builder role/suspension and
  project ownership are checked under locks across legacy/native writes. Project
  forms can submit existing status/media/plan fields; inventory positive values
  and tower/project field limits match their server contracts.
- Provider/common services: legacy incoming reads enforce business eligibility
  and recipient/quote isolation. Business setup guidance, existing profile
  fields, booking currency and customer review are connected. Reviews and
  published rating totals commit atomically. Studio revision follows DELIVERED.
- Payments: service orders use the stored INR booking balance, not fixed catalog
  fees; serialized reservations and pending-order reuse prevent repeat charges.
  Fresh role/suspension admission precedes reservation. Configuration is checked
  before saving; external dispatch and acknowledgment share a 15-second deadline
  with sanitized failures and no automatic retries/redirects. Live payment
  processing is not verified.

Complete Flutter suite: **532 passed**, zero failures. Focused Owner/role suite:
**100 passed**. Complete `npm test` passed TypeScript, six smoke checks and
**338 Node tests**, including the final transactional payment-admission checks.
Final Flutter analysis exited zero with no errors/warnings and **78 informational
lints**; no rules were weakened. Diff whitespace checks passed.
All tests use local synthetic fixtures; they
do not prove PostgreSQL contention, native secure storage, Android presentation
or live five-role business behavior.

Fresh staging candidate compiled with the existing explicit workflow:

```cmd
cd /d C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app
node scripts/build-android.mjs --mode service --config config/staging.local.json
```

Artifact: `build/app/outputs/apk/debug/app-debug.apk`, **184,939,163 bytes**.
SHA-256: `d61f1a89674a91c2aba4626db2fb9962f994c85963aa75c759cc596bbf26d168`.
Build record: `build/android-source-builds/2026-11-04T09-06-23-883Z-29116/build-record.json`.
Hash and bytes independently checked against the record. API enabled, service
mode, staging origin exactly `https://homezone-staging.up.railway.app`; debug
ARMv7/ARM64/x86_64. Previous APK is preserved beside the build record.
The script uses cached offline compilation. It does not install, launch or
contact APIs. `runtimeVerified` and `liveServiceVerified` remain false.

No authentication redesign, schema/migration, environment setting or production
change. Existing roles, direct public registration, website/admin authentication,
separate PIN infrastructure, photo host/TLS policy and fictional preview remain.
Full changed-file list and findings F1-F14 status:
`HOMEZONE_ROLE_DASHBOARD_CONNECTIVITY_MATRIX.md` (current implementation section).

Still incomplete or external: Broker invitation/account-linking capability,
commercial monthly Builder entitlement decision, actual Provider business
verification, private-file/scanner/provider/media configuration, native recovery,
approved legal content/consent and external delivery/payment acceptance. Project
media controls use supported URLs, not a new native project-upload service.
No real account, property, payment, database operation, Railway/deployment,
device installation/launch, commit or push was performed.

## Owner single-submission publication - SOURCE IMPLEMENTED / COMPILED - 2026-11-04

New Owner creation keeps the founder's final **Publish listing** action. After
the required fields and 2-6 photos are supplied, that one action creates the
property, uploads the selected photos, independently reads the stored gallery,
automatically publishes and confirms the returned property ID/status before
closing. Owners do not reopen the new listing for a second Publish action after
success. This publication pipeline was already present; this slice clarifies the
creation UI rather than replacing backend APIs or publishing incomplete records.

One confirmed misleading UI condition was corrected: already `PUBLISHED` records
still offered Publish in listing details. That redundant action is now hidden.
Actual unpublished drafts retain manual recovery with existing authorization and
moderation restrictions. Interrupted or unconfirmed uploads/publication remain
private/uncertain with a visible error, never a fabricated success or automatic
recreation. The two-photo minimum and six-photo creation picker cap remain.

Changed source: `lib/features/workspace/workspace_screen.dart`. Changed fixtures:
`test/create_listing_photos_test.dart`, `test/listing_wizard_test.dart`,
`test/workspace_form_state_test.dart`. The guided button test now performs an
actual tap, rejects a duplicate callback, waits for the publication acknowledgment
and verifies no intermediate details/republication screen. Published-state and
manual-draft recovery tests are retained. One older form fixture's four-photo
message expectation was reconciled with the approved two-photo policy.

No backend, authentication, schema, database, Railway or deployment change was
made. The published property is eligible for the matching Buyer catalogue;
actual live visibility still requires the matching deployed backend/storage,
current APK and controlled device verification. Previous APK evidence below is
historical until a new artifact is recorded for this source slice.

Final founder wording is **Publish listing**, not a separate Create & publish
button. All required fields and 2-6 photos are supplied first; a single tap then
runs upload, stored-photo readback and automatic publication. After restoring that
wording, all 89 focused creation/wizard/retained-form tests passed. The existing
no-second-step and no-premature-success checks remain intact.

Latest APK for the final Publish listing wording built successfully in explicit
staging service mode: `build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes.
SHA-256: `558e8a09851589548fa0075b544fb4ae20f91606f2a0739035064fa9e355b50f`.
Build record: `build/android-source-builds/2026-11-04T07-37-58-902Z-22184/build-record.json`.
Hash, byte count and exact staging origin independently checked. Previous APK
preserved; no installation, live publication, database operation or deployment.

Before the final button-wording clarification, the full
`flutter test --no-pub --reporter expanded` suite passed
all **517** tests. Targeted analysis of the source and three changed fixture files
passed with no errors/warnings and 32 informational lints. `git diff --check`
passed. These are local in-process checks; no real property was created,
published or modified, and actual Android/Buyer visibility is not established.

Previous UX candidate staging debug APK built successfully with
`node scripts/build-android.mjs --mode service --config config/staging.local.json`:
`build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes. SHA-256:
`8f49dbf2c60b92bfad49cd60ef9df490d9e59f13fb9b3f9b3dc37ab21d4aa19b`.
Build record: `build/android-source-builds/2026-11-04T07-30-54-322Z-31836/build-record.json`.
Hash independently verified. Explicit staging service mode/origin, debug variant,
freshly written; runtime and live-service verification flags remain false.
Previous APK preserved. No installation, app launch, deployment or live API action.

## Owner photo policy update - SOURCE IMPLEMENTED / COMPILED - 2026-11-04

This supersedes the earlier four-photo requirement below. Owner publication now
requires at least **two distinct stored property photos**. The mobile Create
listing picker accepts at most **six selected photos**; 2, 3, 4, 5 and 6 are valid
counts. Existing 6 MB-per-photo and 24 MB-total safeguards remain.

The shared backend publication minimum and browser labels use the same two-photo
policy. The existing server gallery capacity remains unchanged so larger stored
galleries are not deleted or rejected on read. The new six-photo cap applies to
the mobile creation picker, not a destructive truncation of existing records.

The draft/upload/readback/publication sequence is preserved: every selected photo
must finish uploading, and the independently read stored gallery must satisfy the
minimum before publication. Duplicate images/URLs do not satisfy the minimum.
No schema, migration, environment, infrastructure or account change is needed.

This source policy requires a matching backend release and updated mobile APK to
be effective together. No deployment, installation or live property write was
performed. Earlier APK/test evidence below belongs to the four-photo candidate.

Local verification for this update: 94 focused Flutter tests passed
(`create_listing_photos_test.dart`, `listing_wizard_test.dart`,
`owner_property_photos_test.dart`); backend Owner publication 24/24 and
administrator publication 11/11 passed; `npm run typecheck` passed. Targeted
Flutter analysis passed with no errors/warnings and 33 existing informational
lints. Checks cover 0/1-photo rejection, exactly 2-photo publication, 4/6-photo
publication, duplicate stored references, seventh-selection rejection, and
waiting for every selected upload rather than publishing after the first two.

Changed source: `lib/features/workspace/listing_photo_picker.dart`,
`lib/features/workspace/workspace_screen.dart`, `../src/lib/properties/photos.ts`.
Changed fixtures: the two Flutter creation/wizard files above and
`../tests/owner-publication.test.mjs`, `../tests/property-photo-admin.test.mjs`.
Updated documents: this status, `HOMEZONE_REMAINING_BLOCKERS.md` and
`ROLE_DASHBOARD_RELEASE_CHECKLIST.md`. Existing data and authentication are untouched.

Updated staging debug APK built successfully with
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
Artifact: `build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes.
SHA-256: `c1c7b6757d4144410a78818be21b472eb66a8cec6569367e24c69a9b6349da0f`,
independently verified with `Get-FileHash`. Build record:
`build/android-source-builds/2026-11-04T06-56-11-689Z-19652/build-record.json`.
Explicit staging origin: `https://homezone-staging.up.railway.app`;
`freshlyWritten: true`, runtime/live-service flags false. Previous APK preserved.
Not installed or launched; backend deployment and live acceptance remain pending.

## Five-role dashboard and property journey improvements - SOURCE IMPLEMENTED - 2026-11-04

Role selection now opens existing email/password Sign In directly. Create a new
account retains the selected role and underlying sign-in draft. Name/email/
password/Terms registration, five permitted roles, independent session/profile
confirmation, website/admin authentication and separate PIN infrastructure remain.

Owner Home/Listings/Enquiries/More is joined by Broker Home/Leads/Listings/
Follow-ups/More, Builder Home/Projects/More, and Provider Home/Requests/Bookings/
Profile/More. Buyer navigation and fictional preview are preserved. Home shows
only existing server totals plus up to three actual scoped records. Owner cards
use stored photo URLs through existing host restrictions. Overview and records
have separate loading/error/empty/retry states and reject late account responses.
Project inventory/team/bookings remain inside their authorized project.

More groups Services, Activity, Finance and Account. Header notifications, common
My profile/contact editing, and account controls are available without placing
sign-out/deletion ahead of core work. Contact edits require independent profile
readback before success; they cannot change roles or login identities.
The reusable contact editor also hides previous-account fields and ignores stale
Save actions after logout, account changes or session-generation changes.

New property creation uses Purpose -> Details -> Location -> Price -> Photos ->
Review. Retained controls/photos survive Back; step and final validation mirror
supported server fields. Owner publication still checks storage readiness, creates
one private draft, confirms four distinct stored photos, then publishes. Unknown
writes never restart creation. A lost session permits a safe exit. Existing
listing editing, photo management and the prior Delete slice are preserved.

Shared provider uploads now have one 15-second dispatch/acknowledgment deadline
and forwarded cancellation with fixed sanitized diagnostics. Cancellation does
not prove that an external file was not saved. No provider/storage replacement,
schema, migration, required variable or role-policy change is introduced.

Backend `npm test` passed: TypeScript, six smoke checks and 232 Node fixture
checks across the existing authentication, authorization, registration, sessions,
PIN, mobile API, realtime and property-photo suites. The final full Flutter
`test --no-pub --reporter expanded` run passed all 511 tests, including narrow
320-pixel/2x-text wizard review and logout/account-switch contact-editor isolation.
Local fixtures are not device, native-storage, live authentication,
provider-upload or Railway deployment proof.

Full `flutter analyze --no-pub --no-fatal-infos` completed successfully: no errors
or warnings; 83 informational lints remain across the project and a local build
diagnostic script. These include style/null-aware suggestions and context lints;
this is not a claim of zero analyzer findings. No lint rules were disabled.

Staging debug build succeeded using the existing offline Android wrapper:

```cmd
cd /d C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app
node scripts/build-android.mjs --mode service --config config/staging.local.json
```

- Artifact: `build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes.
- SHA-256: `e8b00604f8c9357a32f7c7f8a13f111f73340d5646b2ed85ddff5514cdbac413`;
  independently matched with Windows `Get-FileHash`.
- Build record: `build/android-source-builds/2026-11-04T06-42-10-056Z-19164/build-record.json`.
- Explicit service mode, staging environment, exact origin
  `https://homezone-staging.up.railway.app`, debug variant; ARMv7/ARM64/x86_64.
- `freshlyWritten: true`; `runtimeVerified: false`; `liveServiceVerified: false`.
  The prior APK was preserved as `previous-app-debug.apk` beside the build record.
- Not installed or launched. The backend timeout/cancellation source also needs a
  separately approved matching backend release; building an APK does not deploy it.

Full changed-file inventory, source behavior, acceptance criteria and external
approval gates: [ROLE_DASHBOARD_RELEASE_CHECKLIST.md](ROLE_DASHBOARD_RELEASE_CHECKLIST.md).
No staging/production/database/variable/deployment/account/device operation was
performed for these source changes. Missing photo-storage provisioning and
matching backend/APK release remain separate gates.

## Owner listing deletion - SOURCE IMPLEMENTED - 2026-11-04

Owner navigation: Items / My listings -> open the listing -> Delete listing ->
confirm Delete. Flutter previously exposed Archive but had no Delete control.
The new action reuses existing `DELETE /api/properties/[id]`; it creates no new
endpoint, schema or authentication mechanism. Backend ownership, suspension and
transactional rechecks remain authoritative.

The dialog describes permanent removal and offers Archive as the alternative.
Only exact `{ "deleted": true }` acknowledges success. Confirmed deletion returns
to Items, whose existing backend read refreshes the list; repository listing-change
listeners are also invalidated. Duplicate taps and changed sessions cannot queue
deletions. Unknown network/server/acknowledgment outcomes stay on details, explain
uncertainty and require returning to Items and refreshing before retrying.

Existing limitation: retained `PrivateFile` relations use `ON DELETE RESTRICT`.
Such a listing may reject deletion; no document retention policy is bypassed.
Deleting a listing does not delete externally stored image files or enquiry history.
Archive remains available when permanent deletion is unsuitable.

Source: `lib/features/workspace/workspace_screen.dart`,
`lib/features/marketplace/marketplace_repository.dart`.
Local fixture coverage: `test/owner_delete_listing_test.dart`. No live property
was deleted and device/staging deletion is not runtime verified.

Local checks passed: 11 deletion fixtures, 106 existing targeted Flutter
regressions and 10 backend write/notification fixtures. The final confirmation
double-tap guard was rechecked with all 79 deletion/creation/publication fixtures.
Focused analysis reported zero errors/warnings and 36 informational lints.
Changed files for this slice: the two Dart source files above, the new deletion
test, this status document and `HOMEZONE_REMAINING_BLOCKERS.md`. No backend,
schema, Railway, account or database change was made.

Updated staging debug APK build passed using
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
Artifact: `build/app/outputs/apk/debug/app-debug.apk`, 184939163 bytes,
SHA256 `d970bf53ac90e0c42d504cd119688f94e7208e4e9c5f4a7f11f7dcb9f5391135`.
Provenance: `build/android-source-builds/2026-11-04T03-49-00-869Z-20248/build-record.json`.
Previous APK is preserved in that directory. This APK includes Sell/Rent wording
and the new Delete listing action. It was not installed or launched; deletion
against staging still needs a separately authorized disposable listing test.

## Owner purpose wording - SOURCE UPDATED - 2026-11-04

Owner mobile create/edit forms and the active website listing editor now display
Sell/Rent/Lease/Investment. Payloads still use BUY/RENT/LEASE/INVEST, preserving the
existing database and Buyer filters. This is a label correction, not activation
of photo storage or evidence of a published sale/rental. See
`OWNER_LISTING_PUBLISH_FIX.md` for the remaining storage/release requirements.

## Owner form retention and upload readiness - SOURCE FIXED - 2026-11-04

Fixed lazy-scroll loss of Purpose/Category/Currency selections and validation of
required fields that are offscreen. BUY/RENT regressions reproduced the dropdown
loss before correction; corrected fixtures preserve both UI selections and the
request payload. Added authenticated photo readiness checking before a listing
with selected photos is created, retaining all inputs/photos when unavailable.
The backend reports safe upload categories, which Flutter displays without raw
provider/response details. Unknown writes are not blindly repeated.

Fresh scoped Railway metadata matched staging service/environment/domain and
confirmed `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
all absent. No values were displayed or settings changed. This is a confirmed
staging configuration blocker for native file upload, alongside the fixed UI
defect; it is not a captured HTTP status from the user's failed attempt.

No four-photo, ownership, role, authentication, media-host or WebSocket protection
was removed. Matching backend/APK release and private photo-storage provisioning
remain required before claiming live publication success. Exact files, tests,
configuration evidence and next actions: `OWNER_LISTING_PUBLISH_FIX.md`.

Local verification PASSED: 106 Flutter tests; 39 backend publication/photo/storage
tests; 11 mobile API tests; 41 WebSocket tests; TypeScript checking. Focused Flutter
analysis reported zero errors/warnings and 38 informational lints. The four-photo
publication test uses in-process fixtures, not a real Cloudinary upload.

Updated staging debug APK build PASSED, record
`2026-11-04T03-17-26-583Z-22300`, SHA256
`829489e20f02fc1efef7c6638c8421d12b622565c40ae603fe9d5494cb77b3e6`.
The previous APK is preserved. This candidate was not installed or launched and
requires the matching backend readiness field; it does not unblock missing storage
credentials or establish live publication acceptance.

## Listing WebSockets - SOURCE IMPLEMENTED - 2026-11-04

Added an opt-in same-origin WebSocket gateway at
`/api/mobile/properties/live`, using one dedicated PostgreSQL LISTEN connection
per replica and transaction-bound NOTIFY from existing publication/photo writes.
Only anonymous change hints are broadcast; clients still retrieve records through
the existing public/authorized APIs. Private drafts do not notify. No new schema,
migration, authentication mechanism or image-host policy is introduced.

Flutter discovery/detail/gallery share a visible-screen socket with reconnect,
debounced invalidation and independent HTTP readback. Website catalogue/detail
and the server-confirmed USER dashboard also subscribe. HTTP fallback remains
about five seconds disconnected and 30 seconds connected; existing error and
Retry-After protections remain. The fictional preview stays separate.

Local realtime fixtures passed: 23 server/listener checks, 10 write-transaction
checks and eight website lifecycle checks. Existing 22 authentication-origin,
20 session-security and 41 registration checks passed in separate fixture
processes. The existing Owner/admin photo suites passed 31 checks. TypeScript and
runtime JavaScript syntax checking passed. The final focused Flutter run passed
all 80 tests. Analysis: zero errors/warnings, 15 existing informational lints,
exit 0 with `--no-fatal-infos`. An initial combined authentication fixture
invocation mixed module hooks; separate invocations passed without source fixes.
The final actual-module startup check caught an `@next/env` export mismatch;
the corrected default-import loader now has real-module and sanitized-logger
regressions using an empty temporary directory, without application/DB startup.

Updated staging debug APK build PASSED through the existing explicit service
configuration. Build record `2026-11-04T02-43-22-860Z-27896`; artifact SHA256
`ea60d7dc18ef7e430112f6420c4544a288894f6fefb6d8865b946553a2171026`.
Previous APK preserved. This candidate contains the Flutter listener but has not
been installed or launched; its build is not live WebSocket acceptance.

Live status: NOT ACTIVATED OR VERIFIED. `npm start` and `railway.json` remain
unchanged. An unselected `railway.staging-realtime.json` template provides the
opt-in command without altering default deployment behavior. Separately approve
staging `HOMEZONE_REALTIME_ENABLED=true`, selection of this staging-only template
(`npm run start:realtime`) and reviewed deployment/client release
after checking the direct/session-pooled DATABASE_URL, canonical origin,
connection capacity and existing pending-migration gate. No Railway, database,
deployment, device or production action was performed for this implementation.
See [LISTING_WEBSOCKETS.md](LISTING_WEBSOCKETS.md) for exact files, limits,
activation evidence and rollback. Earlier HTTP-polling acceptance below remains
historical evidence, not proof of this new WebSocket transport.

## Four required property photographs - SOURCE IMPLEMENTED - 2026-11-03

New Owner publication now requires at least four distinct photos. Mobile creates
one private draft, confirms all selected uploads and the stored gallery, then
publishes automatically without approval. Failed uploads do not make the draft
public or repeat creation. Web forms/actions display counts and minimum guidance.
Backend create/update/media and both admin publication paths enforce the final
gallery requirement under transaction locks. Cover/gallery duplicates count once;
video/tour fields do not count. Explicit drafts may have fewer. Existing published
records stay visible but cannot lose photos below their existing count; compliant
records cannot drop below four while public. No existing staging data was changed.

105 focused Flutter tests, 42 backend tests and TypeScript checking passed.
Focused Flutter analysis had no errors/warnings and 39 informational lints. The
explicit staging APK build also passed (`2026-11-03T11-51-04-206Z-25992`); it was
not installed or launched, and the previous working APK was preserved.
The four-photo source rule has not been deployed or exercised through live uploads.
No schema/migration is required. Coordinated staging backend/new APK release and
the existing Cloudinary upload prerequisites remain. Details and candidate build
evidence: `OWNER_DIRECT_PUBLICATION.md`. Earlier one-photo acceptance is historical
evidence of automatic Buyer discovery, not acceptance of this new upload rule.

## Owner publication to Android Buyer discovery - RUNTIME VERIFIED - 2026-11-03

With the user's explicit authorization, the supplied Owner account signed in
through the staging website and published exactly one labelled test property:
`STAGING TEST - Owner live update 20261103`, ID `cmw0jtf930003nw0x97xdmy4n`.
POST returned HTTP 200/PUBLISHED with verified false and verification PENDING.
No approval/review action was required. The saved Owner edit page returned the
correct fields. Existing synthetic drafts were left unchanged.

The matching APK was installed without clearing data. Already-open Android
Buyer public discovery changed from empty to the new listing automatically,
without an agent Refresh/navigation/input after publication. The normal Android
screenshot shows the actual house photo, price, title and room/area values.
Detail navigation also returned matching fields and test description. Process
logs show staging catalogue HTTP 200 at roughly 5.25-second intervals; separate
public API readbacks returned database source and the same PUBLISHED record.

The emulator initially failed DNS resolution. A same-AVD cold boot with explicit
DNS recovered staging access, without wiping data or changing renderer/TLS/API
configuration. No production, Railway change, migration, deployment or direct
database command was used. This verifies website Owner -> Android public Buyer
discovery, not native Owner creation, authenticated Buyer account actions or
device-file upload. The displayed photo uses a hosted URL reference. Full
evidence and clock/timing limitations are in `OWNER_DIRECT_PUBLICATION.md` and
the ignored `direct-publication-verification.json` evidence artifact.

## Direct-publication verification update - 2026-11-03, 09:15 UTC

The direct-publication implementation is now committed at
`a357eee327c8597d43ed8352c84b67562fc10b20`. Fresh read-only Railway evidence
confirms staging's active/latest deployment `5246bf68-f4bb-4079-ac12-cb4c86420d20`
is SUCCESS and uses that exact source SHA. Its service domain is
`homezone-staging.up.railway.app`. This supersedes the earlier pending-backend
release statement; no deployment was triggered during this verification.

Current checks passed again: 24 backend tests, 96 Flutter tests and TypeScript
typechecking. A fresh Node catalogue GET returned HTTP 200, database source and
zero published results at 09:13:55 UTC. This is not Flutter publication evidence.
Read-only ADB checksum confirms the running emulator still has the previous
`58cbdf9f...` APK; the direct-publication candidate is `25b8d899...`. No install,
launch or property creation/publication was performed. The matching APK and one
authorized real Owner-to-Buyer publication test remain necessary. Full hashes,
deployment identity and request ID are in `OWNER_DIRECT_PUBLICATION.md`.

## Owner direct publication and automatic Buyer discovery - 2026-11-03

The founder approved direct publication for new Owner properties, without a
registration or listing approval queue. This section supersedes older review-gate
and manual catalogue-refresh descriptions below; their runtime evidence remains
historical and is not evidence of this new policy being deployed.

SOURCE IMPLEMENTED: Mobile Owner creation explicitly requests `PUBLISHED` through
the existing `POST /api/properties`. The server permits this for an authenticated,
non-suspended OWNER, assigns ownership from the server profile, and creates the
record atomically with `publishedAt`, `verified: false` and
`verificationStatus: PENDING`. Publication makes the record visible; it does not
claim independent verification. Eligible owned drafts/review submissions can be
published directly using the existing PATCH. Explicit drafts remain private.
Other roles retain their previous publication policy; moderation restrictions,
ownership, suspension and administrator permissions remain effective. No schema,
migration, authentication or environment-variable change is required.

The website Owner editor/actions use the same policy. Autosave is content-only
and cannot silently turn a published listing into a draft. Existing galleries
are retained on edit. Publish acknowledgments require the expected property ID
and status; uncertain creation never retries automatically. Published pending or
under-review verification metadata is labelled `Not independently verified` in
Owner views, rather than implying publication is waiting for approval.

Buyer discovery automatically rebuilds its catalogue when refreshed page
membership/order changes. No manual membership-refresh button is needed. Existing
foreground HTTPS polling checks a single page approximately five seconds after
the preceding request; with multiple pages, page one alternates with later pages,
so a new first-page listing normally appears within two cycles plus network time.
This is near-real-time refresh, not WebSocket push or instantaneous delivery.
Filters still apply, including the optional verified-only filter. Background and
covered screens pause; session/generation guards and failure backoff remain.

LOCAL CHECKS: The focused Flutter fixture/regression run passed 96 tests. The
backend publication/mobile API runs passed 24 tests, using mocked storage and
authentication boundaries with no database or network access. Focused Flutter
analysis reported no errors or warnings and 48 informational lints. Compilation
and candidate APK evidence are recorded in `OWNER_DIRECT_PUBLICATION.md`.
TypeScript typechecking passed. The explicit staging Android candidate build
passed (`2026-11-03T07-48-55-951Z-20752`); the prior working APK was preserved.
The candidate was not installed or launched. No full Next.js production build
or live publication test is claimed.

NOT YET LIVE VERIFIED: The deployed backend and installed APK have not been
updated for this policy. Release the backend and matching APK together; the old
backend rejects the new create status. Existing synthetic staging drafts were
not published or altered. No live listing/account mutation, direct database
operation, migration, Railway change, deployment, commit, push or production
access was performed for this source slice. Device-file photo uploads remain
separately blocked by the previously observed missing Cloudinary configuration.

## Owner sale draft and photograph verified on Android - 2026-11-03

Status: DEVICE VERIFIED for the existing stored photograph URL. A normal sign-in
through the Android Auth.js UI opened the backend-confirmed OWNER dashboard.
The original staging test draft, `STAGING CHECK - Owner photo 20261103 0950`, was
visible to its owner. Opening its details displayed the inline `Property photos`
gallery, the actual house photograph and `1 of 1 photos`; the unavailable-image
fallback was absent. Evidence:
`mobile-app/build/staging-auth-verification/supplied-owner-existing-gallery.png`.

This supersedes the earlier original-owner-access and Android-photo-display
unknowns for that already attached Pexels URL only. It does not establish a
successful device-file upload, publication or Buyer cross-client photo update.

The newly authorized single sale test, `STAGING TEST - Owner Sale 20261103`, was
saved once through the actual Flutter Create Listing form with one native photo
selected. A fresh owner-scoped Listings read returned that record as
DRAFT/PENDING, Kochi, price 5000000. A fresh detail read showed price 5000000,
area 1500, three bedrooms and two bathrooms, with `No property photos`.
BUY intent, INR currency and House type were verified in the form before Save.
These API readbacks establish draft persistence, not public publication.

The native upload again reported zero of one photos confirmed. Its exact HTTP
status was not captured; do not infer a particular server status or failure
stage. Read-only Railway inspection of the explicitly scoped staging backend
reported `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET` all MISSING. This confirms a staging upload-configuration
blocker; no secret values were printed or stored. Configuration provisioning and
any resulting deployment require a separate authorized infrastructure action.

The approved licensed Pexels image URL was subsequently attached to this same
new draft through the existing `Attach property photograph` form, using
`PATCH /api/properties/{id}/media`. The app reported `Server confirmed the change`.
After returning to Listings and independently reopening the new sale record,
Android displayed the actual house photograph, `1 of 1 photos`, the correct sale
test title, DRAFT/PENDING, price 5000000, area 1500 and the three/two bedroom and
bathroom values. No unavailable-image fallback appeared. Evidence:
`mobile-app/build/staging-auth-verification/owner-sale-with-photo.png` and
`owner-sale-verification.json`.

New draft persistence, image-URL-reference persistence and actual Owner Android
photo display are RUNTIME VERIFIED. This is not a successful native file upload
or proof of Cloudinary object storage. Exactly one new sale test property was
created; the earlier test property was retained. The record was not published,
and published Buyer cross-client photo changes remain runtime unverified. This
verification used the authorized staging account/property/media workflow; it
made no application source change, direct database command, migration, Railway
variable change, deployment or production operation. Credentials were not saved
in project files or included in evidence.

## Owner detail gallery and automatic photo updates - 2026-11-03

Status: SOURCE IMPLEMENTED, 90 LOCAL FIXTURE/REGRESSION TESTS PASSED and STAGING
APK BUILT/INSTALLED. Source tests do not establish a live cross-account photo
update; Android acceptance is recorded separately from fixture results.

`OwnerPropertyPhotos` now appears directly inside owned-property `WorkspaceDetail`,
before the record fields. It reads the existing protected
`GET /api/properties/{id}/media`, places the cover first, deduplicates the gallery,
supports swiping and a photo count, and provides loading, empty, refresh and error
states. Existing photograph-management/upload actions remain available. It does
not create, upload or publish records itself.

After a successful current-session listing creation, upload or media/listing
PATCH, `MarketplaceRepository.listingChanges` signals visible screens to re-read
their existing APIs. This counter contains no account, property or credential
payload. Empty, negative, failed and old-session acknowledgments do not announce
a confirmed change. Reads never retry a mutation.

Buyer catalogue, property detail and an open full-screen gallery automatically
refresh while visible. Normal reads wait five seconds after the previous request
completes; requests never overlap within a screen. Covered/background/disposed
screens stop polling, and returning resumes refresh. Local acknowledged changes
can refresh sooner. Failures back off to 60 seconds, and server Retry-After is
honored. Stale in-flight responses cannot replace media after a newer local change.
Timed detail/gallery refresh uses the public detail GET directly and does not
repeat view-history POSTs, related-list reads or account mutations.

Catalogue page one refreshes its returned records and hasMore. With multiple
loaded pages, one page is refreshed per cycle in round-robin order, preserving
the loaded order and filters. Its maximum ordinary refresh interval per loaded
page is approximately loaded-page-count times five seconds plus request time.
Membership changes offer `Listings changed. Refresh results`; removed records
can remain in that cached catalogue until the user refreshes membership. Detail
and gallery 401/403/404 responses hide stale photos. Owner session invalidation
clears its private gallery and stops reads.

This is near-real-time foreground HTTP refresh, not WebSocket push. No WebSocket
server, shared event bus, SSE endpoint, backend deployment or infrastructure was
added. The existing backend runs Next.js `next start`; genuine push delivery is
a separate server/infrastructure change. Public Buyer reads still return only
PUBLISHED listings. A DRAFT/PENDING owner gallery is not public inventory.

The ignored local staging build configuration retains the exact staging origin
and now approves only `images.pexels.com,res.cloudinary.com` for photographs.
Cloudinary is the existing upload adapter and `res.cloudinary.com` is already an
approved website image host in `next.config.ts`. The video/tour allowlist remains
empty. Exact-host HTTPS, port 443, credential-free fetching, redirect rejection
and image size/time bounds remain enforced; unknown hosts show a fallback.

Changed for this slice: marketplace_repository.dart, marketplace_screen.dart,
new workspace/owner_property_photos.dart, its narrow insertion/import in
workspace_screen.dart, new owner_property_photos_test.dart and
listing_live_refresh_test.dart, the ignored local staging configuration and these
two integration documents. Prior create-listing picker and test changes remain
preserved. No backend, authentication, schema, Railway variable or production
change was made.

Verification: 90 tests passed across owner_property_photos_test.dart,
listing_live_refresh_test.dart, create_listing_photos_test.dart,
marketplace_test.dart, property_gallery_test.dart and property_detail_test.dart.
Focused analysis reported zero errors/warnings and 51 informational findings in
the existing repository/screen files; the new gallery/test files had none.

The existing build command succeeded with the explicit staging configuration:
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
Gradle ran compileFlutterBuildDebug. Provenance:
`mobile-app/build/android-source-builds/2026-11-03T05-56-45-285Z-15016/build-record.json`.
APK SHA256:
`58cbdf9f839a22c64d95cda539befdfd7999e5051e3ecd08edea447d8789c738`.
`adb install -r` returned Success on emulator-5554. No backend build/deployment
was necessary for these client changes.

Android presentation and actual read-only refresh were then verified. The new APK
rendered onboarding; opening `Browse published properties` rendered the service
marketplace and its genuine empty published-catalogue state. App-process logcat
showed repeated staging catalogue HTTP 200 responses at 11:32:07.312,
11:32:12.578, 11:32:17.842, 11:32:23.617 and 11:32:29.041 IST. Steady-state reads
were approximately five seconds plus response time apart. Evidence:
`mobile-app/build/staging-auth-verification/photo-refresh-verification.json`,
`photo-refresh-startup.png` and `photo-refresh-discovery.png`. This verifies the
actual Android public catalogue polling path, not a nonempty media change or a
private Owner gallery. Returning to onboarding stops that route's polling.

Live acceptance still requires the original owner of the existing staging draft
to open its details. The available controlled Owner fixture has no listings.
The earlier device-file upload acknowledgment failure remains undiagnosed: adding
a gallery or CDN host does not prove upload/storage success. A separate authorized
PUBLISHED fixture and two client sessions are needed to prove cross-client Buyer
updates. No additional property, image reference, account or publication was
created during this slice.

## Stored staging property photo display - 2026-11-03

Status: LOCAL STAGING CONFIGURATION CORRECTED, LOCAL CHECKS PASSED and STAGING
APK BUILT/INSTALLED. Android app presentation is verified; display of the original
owner's stored photograph remains PENDING that owner's authenticated session.

The already stored test photograph uses `images.pexels.com`. The selected staging
build configuration had an empty `HOMEZONE_IMAGE_HOSTS`, so shared `ListingImage`
rejected that URL before sending an image request. Owner Listing media uses the
same widget as the marketplace. This explains the observed `Image unavailable`
fallback for the saved URL; it does not diagnose the earlier device-file upload
failure.

The only functional change in this display correction is the ignored, nonsecret
local build file `mobile-app/config/staging.local.json`:
`HOMEZONE_IMAGE_HOSTS=images.pexels.com`. `HOMEZONE_MEDIA_HOSTS` stays empty and
the API origin remains `https://homezone-staging.up.railway.app`. Exact-host
matching, HTTPS, port 443, no URL credentials/fragments, redirect rejection,
credential-free image requests, the 8 MiB response cap and 20-second deadline
remain unchanged. No wildcard, production host or video/tour permission was added.

Both existing focused media-policy tests passed: exact-host/URL rejection and
redirect rejection. A standalone invocation of the existing `ListingMedia.load`
against the exact stored Pexels URL returned 139599 JPEG bytes through its normal
TLS and redirect restrictions. This is loader evidence; it is not Android widget
presentation evidence or proof of device-file upload.

The explicit staging service rebuild succeeded with
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
Provenance:
`mobile-app/build/android-source-builds/2026-11-03T05-12-47-257Z-3968/build-record.json`.
APK SHA256:
`7cb03a89a29c4656b873ec2c4766e5386b61bd96b0dbc56c2e6d4029e97c0449`.
The image allowlist is compiled into Dart; editing the JSON cannot update an
already installed APK. The build record identifies the staging origin and APK
hash but does not record image-host defines, so actual device display remains the
next acceptance checkpoint. `adb install -r` succeeded, and the app launched and
rendered onboarding on the actual Android display. The prior owner session was
not restored after restart; this separate existing session-restoration issue was
not changed or diagnosed by the image configuration correction.

One normal Auth.js UI sign-in with an existing authorized controlled OWNER
account succeeded and returned the authoritative OWNER profile. Its My listings
view returned `No records yet`. This fixture is not the original owner of the
previous test draft; an empty owner-scoped response must not be treated as lost
data or bypassed by exposing another owner's listings. Verifying that private
gallery now requires the original owner to sign in privately on the emulator.
No actual Android display of the stored house photograph is claimed yet.

No application source, backend, authentication, schema, Railway, Cloudinary or database
configuration was changed for this correction. No property/reference was created
or changed, and no deployment, migration, account creation, commit, push or
production action was performed. The earlier draft/reference persistence and
unconfirmed device upload are recorded below within their original scopes.

## Photos inside Owner Create Listing - 2026-11-03

Status: SOURCE IMPLEMENTED, LOCAL FIXTURES PASSED and STAGING APK BUILT/INSTALLED.
Actual Android selection and local preview are DEVICE VERIFIED. One staging draft
and a subsequently attached image URL reference were independently read back.
Device-file upload remains BLOCKED / NOT VERIFIED; this is not complete media
upload acceptance.

Owner Create Listing now includes photo selection directly before Save. The
property-create form also retains this feature for BROKER; edit forms and other
workspace forms keep their existing behavior. The new
`mobile-app/lib/features/workspace/listing_photo_picker.dart` and the focused
`WorkspaceForm` integration in
`mobile-app/lib/features/workspace/workspace_screen.dart` provide:

- Local JPEG, PNG and WebP selection through the existing native media picker,
  limited to 6 MiB per photo, 10 photos and 24 MiB total. Base64 must be canonical;
  image signatures and decoding are checked before selection. Validation decoding
  and thumbnail previews are bounded to 360 pixels in both axes without upscaling.
- In-memory previews, removal and picker cancellation before Save. Selecting or
  removing a photo makes no API request and creates no listing or provider file.
- One DRAFT creation attempt on Save, followed by sequential calls to the existing
  `POST /api/mobile/upload` using the confirmed property ID and raw image base64.
  Upload acknowledgment URLs are validated; upload already attaches each photo,
  so there is no additional media-add request.
- Account identity and cookie-generation checks after each asynchronous boundary.
  Selected photos are cleared when account access ends. Unknown creation results
  and partial or unconfirmed uploads stop the flow and prevent automatic retries.
  The saved-listing result is retained, and returning to Listings refreshes records,
  including when the normal Back action is used.

30 new local fixture tests in `mobile-app/test/create_listing_photos_test.dart`
and 40 existing regression tests passed: 70 total. These results exercise local
selection and the create/upload failure boundaries; they are not native-device or
Cloudinary evidence. Final focused analysis reported zero errors, zero warnings
and 37 existing informational `curly_braces_in_flow_control_structures` findings,
all in `workspace_screen.dart`; the picker and new test file had no diagnostics.
Flutter exits 1 for these informational findings under its default behavior.
Independent source review's two concrete findings were corrected and rechecked:
bounded decoding and refreshing listings after normal Back.

The explicit staging service APK build succeeded. Build provenance:
`mobile-app/build/android-source-builds/2026-11-03T03-40-35-216Z-30488/build-record.json`.
APK SHA256:
`0ed98d6f227fff50c1f3844eda0eba20494dfca965c0cc3671bce0b20d0c79a3`.
`adb install -r` succeeded. The actual Android app rendered onboarding after a
slow native splash; no renderer change was made.

The earlier controlled OWNER sign-in rejection did not establish a photo-flow
defect. In the later founder-authorized check, the running Flutter OWNER Create
Listing screen opened the native chooser and selected a real property photograph.
The actual Android display showed its local thumbnail and Remove control before
Save. Removal and cancellation remain covered by local fixtures rather than a
claim that every picker interaction was repeated on the device.

The photograph is by Binyamin Mellish, from
https://www.pexels.com/photo/house-lights-turned-on-106399/, under the Pexels License
(not CC0). The downloaded source file was 139599 bytes, SHA256
`b188d810dc048706cf189ad4364d781eeebfc336cc571e4a1b8d0561cc506b56`.
The installed APK SHA256 matched the staging build record above.

Save was tapped once at 2026-11-03 04:31:34 UTC. The backend created exactly the
test draft being checked, titled `STAGING CHECK - Owner photo 20261103 0950`, with
status DRAFT, verification PENDING, city Kochi, currency INR and category
RESIDENTIAL. The app then reported that 0 of 1 photo uploads were confirmed.
Fresh Listings and record views returned the same title and draft state; the
initial fresh Listing media read returned no gallery photograph. Neither property
creation nor device upload was retried.

To verify supported reference persistence on this same draft, the existing
Attach property photograph form submitted one authorized media-image PATCH at
2026-11-03 05:01:24 UTC with
`https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=1200`.
Reopening Listing media displayed `Photograph 1` and `Image unavailable`.
This screen makes a fresh authenticated, owner-scoped
`GET /api/properties/{id}/media`; its backend reads Prisma directly and disables
caching. This verifies a persisted image URL reference, not successful Cloudinary
or device-file upload, and not image bytes stored in PostgreSQL.

The final fresh gallery Refresh at 2026-11-03T05:05:49.9213655Z confirmed the test
title and `Photograph 1`, with no empty-gallery message and with `Image unavailable`.
Actual Android screenshot:
`mobile-app/build/staging-auth-verification/property-final-media.png`.

At the earlier draft/reference verification, `mobile-app/config/staging.local.json`
was unchanged with
`HOMEZONE_IMAGE_HOSTS=''` and `HOMEZONE_MEDIA_HOSTS=''`, each containing zero exact
hosts. Remote photo display then required an approved host configuration;
the allowlists were not broadened for this feature. These empty allowlists explain
the display fallback without preventing image-reference storage. The upload
failure's actual cause remains UNKNOWN. Read-only Railway metadata identified the
staging domain and active SUCCESS deployment
`2a773275-a44b-4382-b00e-4ff7fdc3e794`; bounded application/HTTP log searches returned
no matching records and did not establish a missing route, provider fault or
configuration fault.

The founder authorized one staging property and image check. Normal authenticated
APIs created one test draft, attempted one device-file upload and attached one
image URL reference to that same draft. No direct database command, migration,
new account creation, infrastructure write, application-code/configuration change,
deployment, commit, push or production action was performed in this verification.
Historical reports remain below within their original scopes.

## Owner dashboard bottom navigation - 2026-11-02

Baseline: `main/51b16fa`. Status: SOURCE IMPLEMENTED, COMPILED and DEVICE VERIFIED.

`WorkspaceScreen` now provides OWNER-only Home, Listings, Enquiries and More
destinations. Listings and Enquiries reuse the existing `WorkspaceRecords` pages
and `/api/mobile/workspace` modules `properties` and `ownerEnquiries`. Their
widgets are keyed by authenticated account, cookie generation and module to avoid
reusing another tab's records. More retains the existing account/service tools
and sign-out. HOMEZONE branding appears on Owner Home; other sections use their
own titles. Other roles, role/profile gates and backend permissions are unchanged.

40 relevant local tests passed. The seven-test role suite passed again after
strengthening the session-end check while a private listing was visible. Focused
analysis found no errors/warnings; its 37 informational findings match pre-existing
workspace statements. Independent source review found no concrete new defect.

The explicit staging service build succeeded using
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
APK SHA256: `ba81574447201703e7b7d3c400346de0cce4139170c92bbf37694fae2eec7e58`.
It was installed with `adb install -r` on `emulator-5554`. After installation the
app opened onboarding; verification used an explicit sign-in with an existing
controlled staging OWNER account. Session restoration is not certified by this
check, and the reason for that onboarding outcome was not investigated here.
Actual Android presentation confirmed the four bottom tabs. Listings, Enquiries
and More opened with the bar retained; Listings retained its existing Create
action, and More retained sign-out. No listing/enquiry mutation was performed.
The app was returned to Owner Home on the controlled test account. Capture:
`mobile-app/build/staging-auth-verification/owner-bottom-navigation-home.png`.

Changed source: `mobile-app/lib/features/workspace/workspace_screen.dart` and
`mobile-app/test/email_auth_role_flow_test.dart`. No backend/authentication,
schema, Railway configuration, deployment or production changes were made.

## Automatic sign-in after native email registration - 2026-11-02

Source baseline: `main/b581d6ea1ea88c0c086281593ab8cf43f95600b5`.
Status: SOURCE IMPLEMENTED, COMPILED and DEVICE VERIFIED. The automatic staging
handoff is RUNTIME VERIFIED for all five public roles: BUYER/USER, OWNER, BROKER,
BUILDER and SERVICE_PROVIDER, using existing controlled staging accounts.
Earlier runtime evidence below covers registration followed by a separate sign-in
action, not this new automatic handoff.

### Confirmed cause and correction

The prior `AuthFormScreen.register()` intentionally stopped after the generic
registration acknowledgment, cleared the password and displayed Continue to Sign
In. Saving an account did not establish a session or trigger dashboard navigation.
This was a client journey boundary, not evidence of a database or role-write fault.
The founder now requests automatic authentication and role dashboard entry after
the registration acknowledgment.

`mobile-app/lib/features/auth/auth_form_screen.dart` now:

- Captures normalized email, password and selected public role once, and binds
  registration and its one automatic sign-in attempt to those submitted values.
- Resolves the existing repository-owned sign-in controller for the signup screen
  and reuses the existing Auth.js password protocol, CSRF/cookie coordinator and
  secure session persistence. No competing authentication mechanism was added.
- Independently verifies the authenticated session and backend profile, rejects
  role mismatch without changing the stored role, then enters the existing
  dashboard gate. USER opens the Buyer marketplace; other public roles use the
  existing role workspace.
- Explicitly hands ownership from the registration cookie generation to the new
  sign-in generation, so the registration finalizer cannot overwrite the result
  with a stale session-change message. Route cancellation and newer-account guards
  remain in place.
- Retains the generic duplicate acknowledgment. That response does not prove
  creation or authentication. Failed sign-in/profile confirmation leaves a clear
  submitted-but-unconfirmed result and an explicit sign-in route; registration is
  not automatically retried. Ambiguous registration failures retain the existing
  sign-in-before-registering-again guidance.

### Evidence and limits for this correction

27 relevant local tests passed, including all five public-role dashboard paths and
registration/navigation security cases. These are local fixtures, separate from
the device evidence below. Focused Flutter analysis reported no issues. New
regression coverage is in `mobile-app/test/email_registration_navigation_test.dart`.

The explicitly configured staging build succeeded:

```text
node mobile-app/scripts/build-android.mjs --mode service --config config/staging.local.json
```

The debug APK is 184939163 bytes, SHA256
`591cc3c77fa249d181a4a8583a505fd1abfb5612b5da0add5b2e3d5b60f42b89`.
Build provenance:
`mobile-app/build/android-source-builds/2026-11-02T09-16-24-832Z-1744/build-record.json`.
It was installed with `adb install -r` on `emulator-5554`, preserving app data.

Actual Android Create Account actions automatically opened the correct BUYER/USER,
OWNER, BROKER, BUILDER and SERVICE_PROVIDER dashboards without a Sign In tap.
BUYER/USER opened the real marketplace Home; its My profile view then loaded the
controlled account's name and Property Buyer role from the backend. These checks
reused existing controlled staging accounts: generic duplicate acknowledgment,
then actual Auth.js password authentication, independent session/profile
confirmation and dashboard display.
They do not demonstrate new account-record creation during this run. No new
account records were created for these checks. First-time account creation was not
retested in this run; earlier actual account-creation evidence is retained below.

The first BUILDER automatic sign-in attempt returned a recoverable network error:
registration was submitted, sign-in could not be confirmed, and the user was asked
to continue with the same credentials. The app neither repeated registration nor
opened a dashboard. Explicit Continue to Sign In recovered successfully and
opened the actual BUILDER dashboard. After sign-out, a deliberately initiated
second controlled registration-form test completed the automatic BUILDER handoff.
This records the observed network failure and recovery; it does not establish the
underlying transport cause or imply the app silently retried registration.

Captures are under ignored build paths:
`mobile-app/build/staging-auth-verification/owner-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/broker-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/builder-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/service_provider-auto-signup-dashboard.png`,
`mobile-app/build/staging-auth-verification/user-auto-signup-dashboard.png` and
`mobile-app/build/staging-auth-verification/user-auto-signup-profile.png`.
Independent source re-review found no concrete new lifecycle/security defect.
Actual Android captures confirmed the Buyer Home presentation, including a valid
empty database catalogue, and the Owner dashboard. The final Buyer sign-out
returned to the unauthenticated Who are you? entry screen; the controlled account
was no longer logged in, leaving the app ready for the user's own account.

No backend, database schema, migration, Railway variable, deployed configuration or
authentication architecture change is required by this correction. Existing website
authentication, separate PIN infrastructure and fictional preview remain unchanged.
Versioned legal consent, recovery, social sign-in and wider business-workflow gates
below remain separate work. This task made no backend/schema/configuration,
environment, deployment or database-command changes. Approved authentication quota
and session writes occurred through the existing staging APIs only.

## Staging activation and five-role authentication verified - 2026-11-02

This section supersedes the earlier same-day configuration-blocked status below.
The founder explicitly approved the two staging settings and their configuration
deployment after the earlier automatic approval rejection. That rejection is
retained below as historical evidence, not a current approval gate for these actions.

### Activated staging backend

- Privately provisioned `PASSWORD_SIGNIN_HMAC_KEY` and aligned `NEXTAUTH_URL` with
  `https://homezone-staging.up.railway.app`. Secret values were not displayed.
- `AUTH_SECRET` and database credentials/URL were unchanged. Production was untouched.
- Configuration deployment `1e1efa9f-1dc8-4684-b289-fa82e000c758` succeeded for the
  identified staging HomeZone backend, running source commit
  `c71f626da51ae688d2a79d953300f3f50d6e7442`.
- Railway's automatic pre-deploy migration runner reported 21 migrations and no
  pending migrations. No manual database, SQL, migration or introspection command
  was executed in this task.
- Readiness probes: password providers 200 with staging callback origins; native
  email registration with invalid `{}` returned 400; browser registration without
  Origin returned 403; unauthenticated profile returned 401. These probes alone do
  not establish successful authentication.

### Actual authentication evidence

| Workflow | Evidence and status |
| --- | --- |
| Buyer registration and sign-in | RUNTIME VERIFIED for one controlled USER account: actual Flutter registration acknowledgment, separate email/password sign-in and real marketplace/profile display were observed. The acknowledgment alone was not used as proof of account creation. |
| Authenticated profile and role | RUNTIME VERIFIED independently for the same controlled account: authenticated session 200, profile 200 and backend role USER. No credential, cookie, email or response body is recorded here. |
| Session restoration | RUNTIME VERIFIED for USER and SERVICE_PROVIDER: actual app force-stop/restart restored each authenticated profile and correct dashboard without clearing app data. |
| Logout and revocation | RUNTIME VERIFIED for the controlled USER session: independent logout 200, protected profile 401 and old-cookie replay 401; actual Flutter UI logout also acknowledged server sign-out and cleared local access. |
| OWNER registration and dashboard | RUNTIME VERIFIED through actual Flutter create-account acknowledgment, separate sign-in, profile gate and dashboard showing Account role OWNER; My listings displayed a valid empty result. |
| BROKER registration and dashboard | RUNTIME VERIFIED through actual Flutter create-account acknowledgment, separate sign-in, profile gate and dashboard showing Account role BROKER; Leads & pipeline displayed a valid empty result. |
| BUILDER registration and dashboard | RUNTIME VERIFIED through actual Flutter create-account acknowledgment, separate sign-in, profile gate and dashboard showing Account role BUILDER; Projects & inventory displayed a valid empty result. |
| SERVICE_PROVIDER registration and dashboard | RUNTIME VERIFIED through actual Flutter create-account acknowledgment, separate sign-in, profile gate and dashboard showing Account role SERVICE_PROVIDER; Provider profile displayed a valid empty result. |
| Five-role API confirmation | Each controlled account independently returned authenticated session 200 and profile 200 with its correct role. OWNER properties, BROKER crm, BUILDER projects and SERVICE_PROVIDER providerProfile workspace reads returned 200 using the module query contract. Diagnostic logout returned 200, subsequent protected profile returned 401 and old-cookie replay returned 401 for each account. |
| Duplicate and privileged-role safety | Controlled duplicate USER registration submitted a different password and BROKER role but returned only the generic acknowledgment; original credentials still authenticated as USER. Public ADMIN and SUPER_ADMIN registration attempts returned 400. Existing role and credentials were preserved. |
| Role-mismatch denial | RUNTIME VERIFIED in actual Flutter: selected OWNER with controlled USER credentials was rejected with the role-mismatch message, no dashboard opened and server sign-out was acknowledged. No account role was changed. |
| Incorrect-password denial | RUNTIME VERIFIED in actual Flutter: Buyer sign-in with the controlled email and an incorrect password displayed the generic email/password rejection and opened no dashboard. |

Five synthetic controlled staging accounts were created through the actual Flutter
UI. No OTP or mail was sent. The final app was left at public role entry without
an active test-account session. A nonblocking UI polish issue remains: clearing the
password after an authentication result can display the required/minimum-length
field warning alongside that result. No source change was made for this issue.

The prior committed baseline's 84 local tests passed in the earlier execution;
they were not rerun in this activation task. No new application/backend source,
schema, credential architecture or renderer changes were required here. Temporary
verification tools and encrypted credential material remain under ignored build
paths. No commit or push was performed.

Authentication activation is distinct from complete application/release readiness.
Approved Terms/Privacy content and versioned consent storage, native password
recovery, social sign-in, wider security/session acceptance and business-workflow acceptance
remain separate limitations. Existing media allowlist and credential-rotation
requirements are not resolved by a successful Buyer login.

## Authentication execution and confirmed blockers — 2026-11-02

Latest source baseline `main/e0181263c638e70332dde3c30650f5d890d38e07`.
This supersedes older assumptions that deployed identity and configuration were
inaccessible or that the current issue is an absent native registration route.

### Completed changes and device evidence

- Confirmed the running registration screen was the fictional preview: it explicitly
  said no account/sign-in/email service was connected. The outer workspace
  `../.vscode/launch.json` omitted staging defines, even though the repository's
  `.vscode/launch.json` was correct. Fixed the outer three launch profiles to pass
  `config/staging.local.json`; preserved an explicit offline-preview profile.
- `mobile-app/lib/main.dart` now rejects missing HOMEZONE_ENABLE_API configuration
  instead of silently becoming preview. Explicit false still selects the fictional
  preview; explicit true still uses the existing central staging API architecture.
- Built with `node mobile-app/scripts/build-android.mjs --mode service --config
  config/staging.local.json`, installed on emulator-5554 and launched. Actual Android
  capture showed onboarding with Service-backed access, role selection and the real
  email-registration screen. No black-screen failure observed in this execution.
- Final build: debug/staging, approved staging origin, freshlyWritten:true,
  SHA256 `913359c1e8152ea81d697b347b0176c2c68f596e38d74f297bbd3dd52ad7bf84`.
- Corrected PasswordAuthProtocol's Configuration callback handling: it is now a
  server-availability failure rather than invalid credentials. SignInController
  displays a safe temporary-unavailability message. CSRF/access denial remain
  forbidden; genuine bad credentials remain unauthorized. PIN/provider contracts,
  registration fields, hashing, session ownership and website authentication unchanged.

### Live staging root cause, now confirmed

Authenticated Railway read-only inspection identified project
`1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, staging environment
`2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, backend HomeZone
`ea6ca516-4063-4ed1-be95-bebcc0d1af00`, active successful deployment
`1487808f-02fb-44e9-9f23-475935f07221`, created 2026-11-02T04:30:38.343Z,
commit `e0181263c638e70332dde3c30650f5d890d38e07`. Its sole public domain is the
approved staging host, with no custom production domain on that staging instance.

Private compliance checks printed only names/booleans, not values:

| Setting / evidence | Result |
| --- | --- |
| AUTH_URL, AUTH_STAGING_ORIGIN, NEXT_PUBLIC_SITE_URL | Present and match the approved staging origin |
| NEXTAUTH_URL | Present but conflicts with the canonical staging settings |
| PASSWORD_SIGNIN_HMAC_KEY | Missing; required for both registration admission and password login |
| AUTH_SECRET | Present, source minimum-length compliance confirmed; not rotated or displayed |
| DATABASE_URL | Present; private host comparison confirms the backend uses staging Postgres-9ZqA service `8a0f4b40-a4d6-4924-8b07-79e82065fe24` |
| Migration runner evidence | Active deployment logs at04:33:07Z report21 migrations and no pending migrations. No SQL/schema introspection or migration execution by this task. |

Railway registration logs explicitly show `stage:origin`. Both native signup and
browser signup fail503 before validation; Auth.js returns Configuration. Source
`src/lib/auth/redirect.ts:34` rejects conflicting AUTH_URL/NEXTAUTH_URL. Thus the
origin conflict is the confirmed current blocker. The missing HMAC key is a separate
confirmed prerequisite that would block the next registration/login stage. No
database fault is established; the catalogue still returns200/source database.

### Verification and actual limits

Controlled credentials for five public roles were generated and Windows-DPAPI encrypted
under ignored `mobile-app/build/staging-auth-verification`; no real-recipient email,
OTP or credentials in this report. One Buyer signup was submitted through the actual
Flutter UI and failed with an uncertain result. One independent controlled sign-in
returned Configuration and no authenticated session. Do not claim account creation
or successful live login/role routing. No blind signup retry was performed.

Final combined local run: **84 tests passed** across password_auth_protocol,
sign_in_integration, session_ownership, session_provenance, auth_transport,
email_auth_role_flow and startup_configuration tests. Includes all five public roles,
mismatch signout, configuration-error UI feedback and explicit startup selection.
These fixture-backed results are not live staging acceptance. Focused analysis has
no errors/warnings; five existing style info diagnostics remain. Final APK was
installed/launched successfully and the device APK SHA matches the final build.

### Precise remaining approval gate

Automatic approval review rejected the attempted command to align NEXTAUTH_URL,
generate/provision PASSWORD_SIGNIN_HMAC_KEY and apply a staging configuration
deployment: broad authorization did not explicitly approve those exact mutations.
The rejected command did not run; no secret snapshot/key was generated by it, no
Railway variable changed and no service deployed/restarted by this task.

Required explicit approval: set NEXTAUTH_URL to the approved staging origin,
securely provision PASSWORD_SIGNIN_HMAC_KEY (32-256 characters, no display), and
apply the configuration deployment only to the identified staging backend. Preserve
old nonsecret settings/private encrypted rollback evidence first. Do not change
AUTH_SECRET/database credentials, public roles, authorization or production. Existing
predeploy migration behavior must remain accounted for; latest runner evidence says
none pending. Then verify actual Flutter signup -> separate login -> profile/role ->
dashboard for each public role, restore/logout and mismatch denial.

Application changes: main.dart, core/api/password_auth_protocol.dart,
features/auth/sign_in_controller.dart. Tests: password_auth_protocol_test.dart,
sign_in_integration_test.dart, new email_auth_role_flow_test.dart and
startup_configuration_test.dart. Also updated the outer workspace launch file and
the four authentication/integration documents. No backend, schema, PIN architecture,
production, commit or push changes.

## Registration API and APK reconciliation — 2026-10-30 11:32 UTC

This observation supersedes the earlier 11:14 registration-route404 as the current
public routing evidence. Source HEAD is now `88fc8f82a123ecc4afbc013fbb2279963797c3c7`,
containing the native email route and related prior changes; working tree was clean
at inspection. Those changes are no longer uncommitted. No commit/push was performed
by this investigation. Deployed SHA remains UNKNOWN.

| Staging check | Result / scope |
| --- | --- |
| GET /api/auth/providers, 11:32:12.290Z | 200; password provider; staging callback origin. Credential verification not exercised. |
| GET /api/mobile/auth/email-register, 11:32:12.707Z | 405; expected method rejection for a POST-only route, not a missing route. |
| OPTIONS /api/mobile/auth/email-register, 11:32:13.095Z | 204; Allow OPTIONS, POST. Native route is now exposed. No POST/account/quota writes performed. |
| OPTIONS /api/mobile/auth/register | 204; Allow OPTIONS, POST. PIN registration route exposed separately. |
| OPTIONS /api/auth/password/web-signup and /api/auth/password/signup | Both204; Allow OPTIONS, POST. Browser-direct and legacy OTP routes remain separately exposed. |

All probes used only https://homezone-staging.up.railway.app, no redirect following,
credentials or response-cookie/body disclosure. Route availability is not proof of
POST security/configuration/quota/hash/account-creation success.

Existing APK artifact inspection (read-only, no device/build):
`mobile-app/build/app/outputs/apk/debug/app-debug.apk`, last written
2026-10-30T08:35:31.9610298Z, has a debug kernel containing
`/api/mobile/auth/register`, but no `/api/mobile/auth/email-register` or current
native email-registration acknowledgment text. It predates the current email flow.
Latest script build record is staging-origin service mode but predates this APK;
its existence is not exact APK provenance or proof of what is installed/running.

Confirmed: current source and this on-disk artifact differ. Conditional explanation:
if this APK is installed, it cannot execute the latest native email registration path.
Installed artifact/configuration and actual latest failed POST remain UNKNOWN.
Do not claim a database fault or a definitive device root cause from these probes.

Next evidence: latest failed signup's HTTP status plus existing sanitized
`Native email registration unavailable` stage, if any; no payload/email/password
or secret values. Then separately authorize current staging build/install/launch
to replace/verify the old artifact. Actual registration/account writes retain their
own approval gate. Source route, payload and URL construction align; no speculative
application fix made. No tests/builds/device/database/settings/deployment actions.

## Current staging email-authentication availability — 2026-10-30 11:14 UTC

Read-only checks from the development computer, **not Flutter workflow verification**:

| Observation | Result | Meaning |
| --- | --- | --- |
| GET /api/auth/providers, 11:14:06.819Z | HTTP 200; password provider; callbacks use staging origin | Existing email/password provider is advertised. No actual credential/session verification performed. Missing mobile-pin does not block the latest email/password journey. |
| GET /api/mobile/auth/email-register, 11:14:07.244Z | HTTP 404 | Native registration URL is not available through this read probe. Local POST-only route would ordinarily yield method-not-allowed for GET. |
| OPTIONS /api/mobile/auth/email-register, 11:14:34.600Z | HTTP 404 | No registration method advertisement available. Together with GET, supports a deployment/routing mismatch; exact artifact/service/root cause still UNKNOWN. No registration POST sent. |
| GET /api/auth/session without credentials, 11:14:07.521Z | HTTP 200, unauthenticated | Correctly establishes no authenticated user for this check; does not prove sign-in or revocation. |

Target for every request: https://homezone-staging.up.railway.app. No redirects
followed, credentials/body/response cookies/private records printed, or production
requests. Earlier 11:12:03.984Z public catalogue check returned200, source database,
empty properties; this remains only public-read evidence.

Local HEAD remains 09a39de3888772c2ca712355a16f89d2c379a392. Native email route is
currently untracked, with related service/middleware/Flutter edits uncommitted;
HEAD alone does not represent those changes. No deployed SHA is available, and
Railway CLI is not on PATH. Do not label an exact old deployment as confirmed.

Immediate blocker: reconcile the active staging artifact/domain mapping against the
reviewed native email changes. Then authorize local checks and a specific staging
release after inspecting all pending migrations and configuration. railway.json's
preDeployCommand runs npm run db:migrate, so a deployment is not a source-only action.
Account creation and sign-in/session writes remain separately gated. No source fix
or PIN activation is justified merely by this provider list.

This follow-up changed only status/blocker documentation. No builds/tests/device,
registration/sign-in POST, account/DB operations, settings, migration, deployment,
restart, commit or push performed. Authentication is BLOCKED for new-user staging
acceptance; existing-account password authentication remains runtime UNVERIFIED.

## Email/password sign-in and session integration — 2026-10-30

**SOURCE IMPLEMENTED; compilation and runtime NOT VERIFIED for this slice.**
Older PIN-only UI and earlier sign-in handoff descriptions below are historical.

- Already present: native email registration and Auth.js `password` share normalized
  email and salted scrypt. Existing CSRF/callback/independent session protocol,
  cookie ownership, OS-secured scoped vault, restore/expiry/revalidation and registry
  revocation are reused. No second auth mechanism, no OTP or manual cookies.
- Added shared-repository wiring to Sign In and shared `confirmedProfile()` used by
  sign-in and dashboard gate. GET `/api/mobile/account?view=profile` must agree with
  the independently verified session role/account generation before navigation.
  The selected public role, when present, must match; no account role changes.
- Busy state now spans credentials -> session -> profile -> role -> navigation or
  rejection/logout. Invalid credentials/network errors retain existing sanitized
  controller messages. Route/attempt guards discard stale completions and clear only
  captured local authority when profile confirmation is interrupted. Never retries
  registration or treats a generic signup acknowledgment as authentication.
- Role mismatch/profile failure attempts existing logout and reports uncertainty.
  Restored-session profile gate uses the same check; its Sign in again action now
  logs out first instead of redirecting an active session back to the failed gate.
  Unconfirmed server revocation or device deletion remains visible to the user.
- Existing website/admin authentication, PIN infrastructure, profile authorization,
  registration fields/contract, preview and dashboard layouts remain unchanged.

Changed source: `mobile-app/lib/app/homezone_app.dart`,
`mobile-app/lib/features/auth/auth_screens.dart`,
`mobile-app/lib/features/auth/auth_form_screen.dart`,
`mobile-app/lib/features/auth/profile_dashboard_gate.dart`,
`mobile-app/lib/features/marketplace/marketplace_repository.dart`.
Updated docs: Phase1 plan, complete authentication UI audit, this status and blockers.

Remaining: approved legal content/versioned consent; native recovery/social flows;
deployed configuration/schema/artifact evidence; authorized compilation and actual
signup/login/profile/role/restart/logout verification. Secure-storage write failure
still leaves memory-only access; restore errors clear local access, unchanged policy.
No new config, migration, backend or provider change. Phase0 remains PENDING.
No tests/builds/typechecks, live requests, accounts, database/device operations,
environment changes, migrations, deploys/restarts, commits or pushes performed.

## Native email registration with role support — 2026-10-30

SOURCE IMPLEMENTED; compilation/runtime NOT VERIFIED. This supersedes older signup
unavailable/native-contract statements below, not their historical evidence.

- Added POST /api/mobile/auth/email-register, native mode in existing registration
  service, exact public middleware exemption. No duplicate auth/client/provider.
- Strict name/email/password/public-role/termsAccepted:true validation; normalized
  email, database quotas before salted scrypt, atomic User/password/Profile creation
  with selected role and null emailVerified. No OTP/mobile-number/approval requirement.
- Duplicate case-insensitive email lookup/unique-race handling never overwrites or
  links existing users. Response generic200 {message:"Continue with secure sign-in.",
  consentRecorded:false}; not proof of account creation or authentication.
- Flutter same repository/coordinator sends real contract, prevents repeat submission,
  sanitizes errors, guards navigation/session generations and handles uncertain outcomes
  by offering sign-in, never auto-retrying signup. No auto-login or fabricated account.
- Browser signup retains exact-Origin guard, strict body/default USER, original quota
  namespace/response. PIN and website/admin auth behavior preserved.

Legal gap: server validates checkbox acknowledgment, but no approved legal content,
versioned-consent store or policy versions exist. No legal consent recorded/claimed;
UI and response make that explicit. This is still a release prerequisite. No new schema
or migration; uses existing PasswordCredential/Profile/RegistrationBudget and normalized
User email uniqueness. Requires existing PASSWORD_SIGNIN_HMAC_KEY and core DB/Auth.js
configuration. No secret values inspected or infrastructure activation.

No tests/builds/typechecks/requests/accounts/DB access/device operations, migrations,
settings/credentials, deploy/restart, commits or pushes. Prior user work preserved.

## Latest authentication UI decision and first slice — 2026-10-30

Create Account now follows founder's latest Full name + Email + Password + Terms
UI requirement, superseding older PIN-only entry statements below. Existing brand
components, five roles, PIN infrastructure and prior admin changes preserved.

SOURCE IMPLEMENTED, RUNTIME UNVERIFIED: welcome Sign In opens the existing email
password form/controller; role Continue opens existing email Create Account; selected
role passed to signup/sign-in, optional mismatch signs out, dashboard profile gate
retained. Signup fields remain intact on back from pushed sign-in. Existing password
toggle/validation and public role mapping retained, no new provider/client.

INCOMPLETE: native email registration with role/consent and recovery delivery/token
links. Service forms now explicitly send nothing and never show preview success.
Existing web-signup is browser-Origin-only and creates USER; not silently repurposed.
Google mobile flow unavailable; Apple provider absent; existing UI buttons preserved
with truthful feedback. Approved Terms/Privacy content/consent contract not found.

See HOMEZONE_COMPLETE_AUTHENTICATION_UI_AUDIT.md for each screen's inventory,
remaining work and review boundary. No backend, schema, marketplace or infrastructure
changes, no tests/builds/requests/devices/accounts/database operations or deployments.
No compilation/runtime claim. Phase0 remains PENDING, source work separate.

## Phase 1 — mobile PIN registration slice, 2026-10-30

SOURCE IMPLEMENTED; diff inspected, not compiled or runtime verified. Existing route,
hashing, quotas, transaction and Flutter registration flow were reused rather than rebuilt.

- src/lib/auth/mobile-number.ts now rejects final line breaks/control characters in
  numbers and explicitly enforces exactly6-character PIN strings. JS regex $ alone
  was insufficient to enforce the strict end boundary. Leading zeros preserved.
- src/lib/auth/mobile-pin-registration.ts explicitly requires6-character PIN and
  confirmation before hashing; public-role validation/strict bounded body retained.
- mobile-app/lib/features/auth/mobile_pin_auth_screen.dart aligns number validation;
  existing request fields, loading/duplicate guard, acknowledgment and sign-in link retained.
- tests/mobile-pin-registration.test.mjs adds malformed-number/PIN boundary cases;
  these tests were written but NOT RUN. Earlier successful-test reports do not
  validate this current change.

Source confirms admission before KDF, salted versioned hash, normalized unique credential,
atomic User/Profile/credential create with selected public role and emailVerified:null,
and generic duplicate no-op without overwrite/account linking. No response contains PIN
hash, and registration acknowledgment never establishes authenticated session.

No new variables or schema/migration required. Existing DATABASE_URL, AUTH_SECRET,
canonical URL/staging settings, AUTH_MOBILE_PIN_ENABLED, MOBILE_PIN_PEPPER_V1,
MOBILE_PIN_RATE_LIMIT_KEY and existing optional quota settings remain owner/environment
prerequisites. Phase0 PENDING does not block this source work. No live verification,
accounts, DB access/writes, settings/credentials, activation, deploy/restart, builds/tests,
device operations, commits or pushes. Admin slice changes and user work preserved.

## Phase 1 — admin authentication compatibility, 2026-10-30

SOURCE IMPLEMENTED, diff inspected only; runtime and compilation UNVERIFIED.

- getAdminUsers and getAdminListingDetail project canonical mobile plus website
  password credential presence (id only). No PIN/password hashes selected. Both
  guarded admin pages pass capability booleans to AdminUserPanel, not credential data.
- Shared panel hides website-password reset for PIN-only accounts, preserves it
  for website/dual-credential and existing non-PIN accounts, and states that it
  never changes mobile PIN and that PIN recovery is unavailable.
- Listing-owner view now identifies nameless/email-less PIN users. Admin user
  help labels Login mobile as login identity and Contact phone as separate profile data.
- Existing password endpoint only narrows its read projection; server permission,
  password-upsert/hash and revocation policy unchanged. No MobilePinCredential
  hash is retrieved, changed or returned by these admin operations.
- Updated Phase1 implementation plan. No migration, authentication architecture,
  role/permission, secret or infrastructure change. Phase0 remains PENDING.

Policy limitation: hiding an action is not server enforcement. Existing authorized
password endpoint can still enroll a website credential; restricting PIN-only
enrollment remains a separate owner decision. No new PIN reset action added.
No tests, builds, type checks, device operations, requests, database access, settings,
deployments, commits or pushes. Existing changes preserved; stop for source review.

## Phase 1 source implementation — admin identity slice, 2026-10-30

Phase 0 remains PENDING and did not block this source work. Completed the first
two-file review boundary in HOMEZONE_PHASE_1_AUTHENTICATION_IMPLEMENTATION_PLAN.md:

- src/lib/admin/operations.ts:getAdminUsers now normalizes valid Indian-number
  searches and matches MobilePinCredential.normalizedMobile through the existing
  user relation. Name/email/contact-phone/city search and role/status filters remain.
  Search text is trimmed and bounded to 254 characters. The user projection adds
  only id and canonical login mobile alongside email; no credential hash selected.
- src/app/admin/users/page.tsx now displays a read-only Login mobile separately
  from Contact phone and uses the login number as fallback for nameless/email-less
  PIN users. Existing requireAdminProfile guard remains; no public API added.

Status: SOURCE IMPLEMENTED, inspected diff only; not compiled or runtime verified.
No tests, builds, type checks, database access, requests or device operations run.
No migrations, settings, secret generation/rotation, activation, deployments,
commits or pushes. Existing user work preserved. No schema change required.

Stopped at the plan's first-slice review boundary. Shared admin password-action
capability UI, its separate server-policy decision and stale mobile help copy
remain subsequent work; authentication runtime and pending Phase 0 gates unchanged.

## Current mission result — 2026-10-30, later verification

**PARTIALLY COMPLETE. Live backend rollout/account writes are BLOCKED on explicit
owner approval and confirmed staging target/schema/configuration.** Work is over
main/decd89cd04defab4a2db5bc62b48b136bf50945f with prior modified/untracked files
preserved; no implementation was committed or deployed.

### Implemented and checked in this execution

- MarketplaceRepository.workspacePage now validates the backend response role
  against the independently authenticated session role before exposing records.
  Wrong/missing role responses and repeated cursors are rejected, not displayed
  as a different role's workspace. Server authorization remains unchanged.
- Added real backend workspace-handler tests with mocked DB/auth boundaries:
  anonymous denial; actual OWNER/BROKER/BUILDER/USER actor scoping; provider
  profile contract; wrong-role, missing parent and mobile admin denials.
- Added real PIN authorizer/KDF/failure-budget tests against synthetic storage:
  leading-zero success; successes do not consume failures; previous unexpired
  failures cannot be reset by success; five failures then fixed temporary denial;
  blocked requests do not extend expiry; expiry resumes admission; unknown,
  malformed, suspended, disabled and storage-failure cases fail closed.
  This does not prove real PostgreSQL row locks or multi-replica capacity.
- npm test now includes a test:mobile-pin script, invoking enrollment/login suites
  separately so PIN security checks are not omitted from the standard test gate.
- Six full-suite failures were obsolete legacy OTP test entry assumptions, not a
  reason to restore OTP to mobile. The retained legacy component tests now use
  an isolated component harness; active service entry stays role-first/PIN-only.
  Updated the workspace pagination fixture to reflect its real lookahead cursor.
- Retained the founder's simplified UX: Who are you? -> PIN sign-in, with Create
  a new account below. Selecting either form preserves the role; no separate
  boring access-choice page was reintroduced. PIN registration, selected public
  roles, profile/session matching, mismatch signout and existing dashboard routing
  remain as implemented in the milestone below.

Exact files changed during this execution:

1. mobile-app/lib/features/marketplace/marketplace_repository.dart — response role
   consistency check.
2. mobile-app/test/marketplace_test.dart — workspace role/cursor contract regression.
3. tests/mobile-api.test.mjs — existing workspace-handler scope/role tests and
   synthetic DB/profile/projection fixtures.
4. tests/mobile-pin-login.test.mjs — new real authorizer/KDF/budget synthetic tests.
5. package.json — include isolated PIN suites in npm test.
6. mobile-app/test/registration_test.dart — isolate retained legacy OTP component
   coverage from the official PIN-only navigation; current profile response fixture.
7. This status and HOMEZONE_REMAINING_BLOCKERS.md — current results/approval gates.

No new API, schema, migration, authentication architecture or role policy was added
in this execution. Prior registration/mobile source corrections remain intact.

### Checks and artifact

- Final npm run test: exit 0, including TypeScript, platform smoke, middleware,
  leads, session security, password limits, mobile routes, legacy registration,
  9 PIN-enrollment tests and 6 PIN-login tests (counts include suite parents).
- Final flutter test --no-pub --concurrency=2 --reporter expanded: **300 passed**.
  Includes preview/retained legacy component coverage; not 300 live API workflows.
- Flutter analysis with nonfatal info/warning flags: exit 0, 77 existing lint/style
  notices, no errors. Not a lint-clean assertion.
- Existing service packaging command exited 0:
  node scripts/build-android.mjs --mode service --config config/staging.local.json.
- Current debug APK:
  C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app\build\app\outputs\apk\debug\app-debug.apk
  SHA-256 `686041aa07092b02bbd16844e9c3246c1a60d099a244f12266567642ec063ce6`,
  184939163 bytes. Explicit API-enabled staging origin; empty media host lists
  unchanged. No production release/signing was attempted.
- Installed/started current APK on emulator-5554 after a count-only check showed
  zero stored credential entries. Actual Android captures verify onboarding,
  role selection and direct Broker sign-in with Create a new account below.
  No credentials were entered or signup/sign-in submitted.
- Actual tap on Browse published properties generated current Flutter log:
  10-30 12:37:49.747, PID 8206, staging GET /api/mobile/properties, status=200,
  elapsedMs=1750. The repository uses page=1&pageSize=12 and accepted the response;
  Android showed No matching published listings. Emulator log time is not claimed
  UTC. No independent Railway log correlation was performed.
- Local ignored screenshots: build/integration-current-startup.png,
  integration-selected-role.png, integration-direct-signin.png,
  integration-current-catalogue.png. Earlier screenshots/hashes below are historical.

### Current staging evidence — read-only requests

Origin used only: https://homezone-staging.up.railway.app. Host-side requests were
read-only, redirects disabled; no response headers/cookies or bodies were retained.

| Check | Observed result | Meaning and limit |
|---|---|---|
| GET /api/auth/providers | 200; mobile-pin absent | Live Auth.js does not advertise PIN login. Could be older code or disabled feature; does not prove which setting is missing |
| GET /api/mobile/auth/register | 404 | Read-only route check does not expose the new source route. No POST was attempted; routing/deployed artifact must be reconciled |
| GET /api/mobile/properties?page=1&pageSize=12 | 200, source database, zero properties, hasMore false | Current public endpoint reachable; not full database/schema/authentication proof |
| Actual Flutter public discovery | 200 and correct Android empty state | RUNTIME VERIFIED for this current APK public journey, not a borrowed browser/Node 200 |

### Module classification and required next gates

| Module | Current status | What remains |
|---|---|---|
| Central HTTPS client/staging separation | BACKEND CONNECTED; public path RUNTIME VERIFIED | Existing single client/cookie coordinator retained; no production fallback |
| Role-first entry, direct sign-in/create-account link | COMPILED; visible Android presentation RUNTIME VERIFIED | Complete credential-driven journey still blocked |
| Public-role PIN registration | SOURCE IMPLEMENTED / COMPILED; BLOCKED live | Validated public enum, atomic profile/credential, generic safe duplicates tested locally; deploy/schema/config/write approval |
| PIN login, profile and mismatch gating | SOURCE IMPLEMENTED / COMPILED; BLOCKED live | Provider not advertised; no real credentials submitted |
| Secure persistence, restore, expiry, logout/revocation | SOURCE IMPLEMENTED / COMPILED; BLOCKED authenticated runtime | Real approved account, actual secure storage and registry evidence |
| USER/Buyer marketplace | Public empty catalogue RUNTIME VERIFIED; remaining source COMPILED | Nonempty search/filter/pagination/details/media and protected mutations unverified live |
| OWNER dashboard/property lifecycle/media/enquiries | SOURCE IMPLEMENTED / COMPILED; BLOCKED live | Existing /api/mobile/workspace, /summary, /api/properties and lead/media routes; approved role/data/writes required |
| BROKER dashboard/leads/team/calendar/commission | SOURCE IMPLEMENTED / COMPILED; BLOCKED live | Existing /api/pro/* and workspace APIs; scope tests pass, no live action performed |
| BUILDER dashboard/projects/units/towers/bookings | SOURCE IMPLEMENTED / COMPILED; BLOCKED live | Existing /api/builder/* and workspace APIs; approved parent records/write/concurrency checks |
| SERVICE_PROVIDER dashboard/profile/requests/quotes/bookings | SOURCE IMPLEMENTED / COMPILED; BLOCKED live | Existing service APIs; existing provider verification/ownership checks preserved, no new approval workflow introduced |
| Notifications/profile/supporting requests | SOURCE IMPLEMENTED / COMPILED; BLOCKED live | Existing /api/notifications, /api/mobile/account and workspace/account-request contracts; no native push delivery implemented |
| Native push and full native admin/payment execution | NOT IMPLEMENTED or partial native surface | Existing web/admin handoff retained; do not invent backend absence or payment/refund completion |
| Fictional buyer preview | Preserved LOCAL experience | Never counted as real records, accounts or successful service actions |

No source rebuild can make the deployed service expose a missing/disabled provider.
Before live auth: owner must confirm exact staging service/database IDs, reconcile
intended migration history/schema and recoverability, then approve exact migration,
variable and deployment actions separately. Deployment can run ALL pending Prisma
migrations via railway.json, not just PIN foundation. Do not push main: production
autodeploy/branch relationships have not been verified.

No production contact/change, direct database operation, migration, account creation,
OTP, protected mutation, Railway change, deployment, commit or push occurred.

## Earlier implementation snapshots

Latest UX adjustment: role selection now opens the PIN sign-in form directly,
with “Create a new account” beneath the sign-in button. The separate access-choice
page described below was removed. Switching signup/sign-in preserves the selected
role; Back returns to role selection. Backend and session behavior are unchanged.
This adjustment is not included in the previously built APK/hash/screenshots below.

## Current role-first authentication milestone — 2026-10-30

**SOURCE IMPLEMENTED / COMPILED; live role-aware authentication NOT VERIFIED.**
This section supersedes the default-USER registration policy and role-less contract
in the earlier implementation snapshot below. Existing uncommitted work was preserved.

Service entry points (/roles, /sign-in, /sign-up, unauthenticated /buyer) now open
“Who are you?” before any authentication form. Five existing role cards have a
single selection: Buyer/USER, Owner/OWNER, Broker/BROKER, Builder/BUILDER and
Service Provider/SERVICE_PROVIDER. Selection is temporary journey context only.
The next screen says “Welcome to HomeZone” and “Continue as [role]”, with separate
SIGN IN and SIGN UP choices and Back/change-type navigation. Form switching keeps
the same role, and Back returns to the choice screen. Fictional preview behavior
remains separate and unchanged.

POST /api/mobile/auth/register now requires strict JSON:
`{mobileNumber, pin, confirmPin, role}`. The backend enum accepts exactly USER,
OWNER, BROKER, BUILDER, SERVICE_PROVIDER. Missing/unknown roles and ADMIN/SUPER_ADMIN
are rejected with HTTP 400. BUYER is a UI label, not a server role. New account
creation atomically stores the selected allowed role in Profile. Existing salted,
peppered scrypt, quotas, origin checks, null emailVerified/PENDING/false contact
verification, duplicate acknowledgment and no-link/no-overwrite behavior remain.
Concurrent/duplicate registration cannot change an existing role or credential.
No role approval/application workflow was added; existing business-resource
authorization and verification requirements remain authoritative.

PIN login uses the unchanged Auth.js phone/PIN contract, not a role claim. After
independent session verification, the form fetches /api/mobile/account?view=profile
and compares its role with BOTH the verified session role and selected type.
Mismatch initiates existing signout/local clearing and displays:
“This account does not match the selected account type. Go back and choose the
correct type. No account role was changed.” No dashboard is opened on mismatch.
Successful matching login enters existing /buyer, whose ProfileDashboardGate
confirms server profile/status and routes USER to marketplace, other roles to
existing workspaces. Remote signout failure remains server-revocation uncertainty;
local signout clearing is retained. Existing website/admin authentication unchanged.

Valid restored sessions bypass role selection and use their server role. Logout
returns to /sign-in, now the role-first journey. No PIN/role is persisted as local
authentication proof, and no OTP/email/mobile recovery was introduced. Existing
ADMIN/SUPER_ADMIN website/admin access remains; public role selection excludes them.

Exact files changed in this milestone:

- src/lib/auth/mobile-pin-registration.ts: required public-role enum and selected
  role on new Profile creation; no provider or database schema edits.
- mobile-app/lib/features/auth/role_screen.dart: reusable service-selection callback,
  “Who are you?” and no direct sign-in bypass in service mode; preview preserved.
- mobile-app/lib/features/auth/role_first_auth_screen.dart (new): temporary role
  state, account-access choice screen and back/navigation context.
- mobile-app/lib/features/auth/mobile_pin_auth_screen.dart: required selected role,
  registration payload, matching server/session/profile gate and role-preserving
  form switching.
- mobile-app/lib/app/homezone_app.dart: all unauthenticated service auth entries
  use the role-first journey; existing dashboard/restoration structure retained.
- tests/mobile-pin-registration.test.mjs: five public roles, privileged/unknown/
  missing rejection and no role change through duplicate signup.
- mobile-app/test/mobile_pin_auth_screen_test.dart: role-before-form navigation,
  preserved selection, matching/mismatched role behavior, PIN/registration checks.
- This status, HOMEZONE_REMAINING_BLOCKERS.md, HOMEZONE_STAGING_AUTH_READINESS.md
  and HOMEZONE_PIN_AUTH_DEPLOYMENT_CHECKLIST.md: changed policy/rollout handover.

Validation: nine synthetic backend PIN tests passed; TypeScript noEmit compilation
passed. All 52 focused Flutter role/auth/session tests passed. The initial added
navigation test needed a frame pump and the successful-login test needed expiry
timer cleanup; both fixture issues were corrected before the passing run.
Static analysis exited 0 with 77 existing lint/style notices and no
errors using nonfatal warning/info flags. No lint-clean/full-suite claim is made.
The supported staging debug build exited 0:
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
APK: C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app\build\app\outputs\apk\debug\app-debug.apk
SHA-256: `0f2aa06ef17dc062b4070296afef2b4659eac1064b4ab8b158675bad553e8e82`.
This new role-first APK was installed/launched on emulator-5554 after confirming
the existing session preferences had zero credential entries (contents not read).
Normal Android captures verified the five-card “Who are you?” screen without
scrolling on this emulator, selection of Broker, “Continue as Broker” with two
choices, the Broker signup form and switching to the Broker sign-in form. No
credential was entered or authentication request submitted. Screenshots are under
ignored mobile-app/build: role-first-selection.png, role-first-choice.png,
role-first-signup.png and role-first-signin.png. This verifies presentation and
that form-switch selection, not live backend authentication or all device sizes.

No database/schema/migration, environment/Railway, website/admin/provider,
production, deployment, commit or push changes were made. No live account or OTP
was created/sent. Old APKs omit role and will receive validation errors from the
new registration contract; coordinate backend/APK rollout. Staging schema/config,
source review and explicit deployment/account-write approval remain prerequisites.

## Prior implementation snapshot (historical evidence)

Date: 2026-10-30. Source baseline: `decd89cd04defab4a2db5bc62b48b136bf50945f`.
The checkout was clean at the start. Changes below are local and uncommitted.
This report supersedes older statements that PIN registration/mobile UI are absent.

## Executive result

**PARTIALLY COMPLETE.** The current debug APK renders on Android and its actual
public discovery action reached staging with HTTP 200 and displayed the empty
catalogue. PIN registration and login are now connected in source and compiled,
with local regression coverage. Live PIN account creation, login, restoration,
logout and protected business workflows have NOT been verified. No backend was
deployed, provider enabled, migration applied or real account created here.

## Current evidence

- Final supported packaging command, run from mobile-app:
  `node scripts/build-android.mjs --mode service --config config/staging.local.json`
- Build exited 0; universal debug APK, 184939163 bytes:
  `C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app\build\app\outputs\apk\debug\app-debug.apk`
- SHA-256: `b60ccafc0132fd4ba58101eb5ad4396e1aacc780ce2f2bf8433454aed8ae9dbb`.
- Build record explicitly selected API-enabled service/staging and
  `https://homezone-staging.up.railway.app`; image/media host lists remain empty.
- Installed using `adb -s emulator-5554 install -r` and started existing
  `com.example.homezone_mobile/.MainActivity`. The existing encrypted session
  preferences had zero string entries before launch; no saved credential was read
  or printed. No account submission was made.
- Normal Android screenshots now show onboarding, discovery, PIN registration
  and PIN login. These are Android screencaps, not internal Flutter captures.
  No renderer/theme/Impeller changes were made. The earlier black screen did not
  reproduce; its historical cause remains unknown. Initial cold startup showed
  the native branded splash before onboarding became visible.
- Actual Android tap on “Browse published properties” initiated the real client
  path: MarketplaceScreen -> MarketplaceRepository.listings -> ApiClient ->
  IoApiTransport -> staging GET `/api/mobile/properties?page=1&pageSize=12`.
- App log timestamp `10-30 11:45:38.879`, PID 7164:
  `HOMEZONE staging catalogue https://homezone-staging.up.railway.app GET /api/mobile/properties status=200 elapsedMs=4010`.
  Timestamp is emulator log time; it is not asserted to be UTC.
- The repository accepted the database-source response and Android showed
  “No matching published listings. Try changing the filters.” No raw body,
  cookies or user data were logged. No independent Railway log correlation was
  performed. This proves this public flow, not whole-database health.
- Local screenshots under ignored mobile-app/build:
  `homezone-mission-startup-2.png`, `homezone-mission-discovery.png`,
  `homezone-mission-pin-registration.png`, `homezone-mission-pin-login.png`.

## Module status

Classifications are evidence-specific; COMPILED does not mean deployed.

| Module | Source/build status | Backend connection/runtime | Database/configuration dependencies |
|---|---|---|---|
| Central client, explicit staging selection | COMPILED; existing single client retained | BACKEND CONNECTED; public catalogue RUNTIME VERIFIED in this APK | Approved staging origin; no production fallback introduced |
| Android startup/onboarding | COMPILED | RUNTIME VERIFIED visible Android capture for this run | Earlier black-screen cause still unknown |
| PIN enrollment | SOURCE IMPLEMENTED; TypeScript compilation passes | BLOCKED live; registration UI presentation verified only | Existing PIN migration/table, pepper, admission key, provider flag, deployment and authorized test registration |
| PIN login | SOURCE IMPLEMENTED; COMPILED; mocked CSRF/callback/session test passes | BLOCKED live; login UI presentation verified only | Same schema/config plus Auth.js canonical staging origin and AUTH_SECRET |
| Session restore/expiry/logout | Existing implementation retained; COMPILED; focused regressions pass | BLOCKED for authenticated live evidence | Approved PIN account; AuthSession registry and secure platform vault |
| Profiles and role dashboard gate | Existing server-confirmed gate retained; COMPILED | BLOCKED authenticated runtime | Profile/session role agreement; default USER; no client role elevation |
| Catalogue/search/filters/empty state | Existing implementation retained; COMPILED | RUNTIME VERIFIED initial public empty catalogue only; nonempty/search/filter behavior unverified live | Published visible staging records for populated scenarios |
| Property detail/gallery/media | Existing implementation retained; COMPILED; local tests pass | BLOCKED live nonempty/detail/media | Published record; approved exact media hosts, currently empty |
| Favorites/shortlists/enquiries | Existing source wiring retained; COMPILED; mock regressions pass | BLOCKED live writes | Authorized accounts and explicit mutation approval |
| Owner submission/edit/status/media/enquiries | Existing workspace/forms retained; COMPILED | BLOCKED authenticated runtime; not declared operational | Owner/default-USER listing lifecycle, publication permission, storage configuration |
| Broker leads/team/tasks/commission | Existing workspace/forms retained; COMPILED; lead boundary tests pass | BLOCKED authenticated runtime | Actual authorized broker/team records; commission is not payment execution |
| Builder projects/units/bookings/team | Existing workspace/forms retained; COMPILED | BLOCKED authenticated runtime | Authorized builder records; reservation concurrency not runtime tested |
| Service provider/quotes/bookings | Existing workspace/forms retained; COMPILED | BLOCKED authenticated runtime | Authorized/approved provider and requests; no new role policy |
| Notifications | Existing inbox source retained; COMPILED | BLOCKED authenticated runtime | Notifications records; native push delivery NOT IMPLEMENTED in reviewed mobile surface |
| Administration | Existing website/admin API retained | Full native admin workflows NOT IMPLEMENTED; website handoff remains | Privileged provisioning unchanged; no ordinary-user exposure added |
| Fictional buyer preview | Preserved separate /buyer-preview and offline UI | Local preview only, not backend evidence | Demo properties/accounts/actions must not be counted as real records |

## New mobile PIN contract and security

`POST /api/mobile/auth/register` accepts bounded JSON (4096 bytes), ONLY:
`{mobileNumber: string, pin: string, confirmPin: string}`.
IN mobile normalization uses the existing helper. PIN/confirmation must be exactly
six ASCII digits as strings; leading zeros survive. No email, OTP, role, tenant,
team, invitation or other association fields are accepted.

Responses are no-store: 200 generic registration acknowledgment for a new account,
existing credential or legacy contact collision; 400 invalid input; 403 rejected
origin/fetch-site; 429 quota with Retry-After; 503 disabled/unavailable dependency.
Acknowledgment never proves account creation/authentication. The UI proceeds to
separate sign-in, never automatically retries enrollment or logs in after it.
Uncertain transport outcomes advise trying sign-in before registration again.

The registration service uses the existing versioned, salted, peppered scrypt
helper. Quotas precede hashing; hashing occurs outside account creation. A Prisma
transaction creates User with emailVerified:null, a default USER/PENDING Profile,
and MobilePinCredential together. No password credential/email/verified phone is
invented. Unique normalizedMobile prevents concurrent duplicate credentials;
only that specific P2002 conflict gets a duplicate acknowledgment. All other
storage/configuration errors fail closed with fixed stage/category diagnostics.
Existing Profile.phone contact collisions are conservatively refused with the
same acknowledgment; they never auto-link, reset credentials or alter roles.

Registration reuses MobilePinLoginBudget with independent
`mobile-pin:registration:v1:` keys. A fixed row lock serializes short admissions,
DB time drives windows and at most 100 expired identifier buckets are cleaned per
admission. Mobile/IP identifiers use purpose-separated HMAC keys. Defaults:

| Variable | Default / meaning |
|---|---|
| AUTH_MOBILE_PIN_ENABLED | Must explicitly be true for enrollment/provider; not changed here |
| MOBILE_PIN_PEPPER_V1 | Required existing hash pepper, 32–256 characters without outer whitespace |
| MOBILE_PIN_RATE_LIMIT_KEY | Required distinct admission HMAC secret, 32–256 characters without outer whitespace |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | 5000 raw requests, maximum configurable 10000 |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | 100 valid attempts, maximum 1000 |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | 3 per canonical number, maximum 10 |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | 10 per approved ingress IP, maximum 100 |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional explicit x-real-ip or x-forwarded-for; requires owner proof ingress overwrites it with one valid IP |

Without a trusted-header selection, all enrollment traffic shares one conservative
10/hour ingress bucket. This is NOT represented as true per-IP attribution.
Malformed configured policy/header values fail closed. Owner must review ingress
behavior before activation; arbitrary caller-supplied forwarding headers are not
silently trusted. Existing PIN login aggregate/failure-only budgets are unchanged
and cannot be bypassed by rotating IP addresses. PostgreSQL lock/capacity behavior
still needs authorized real-database verification.

Mobile login retains the existing Auth.js flow: GET csrf -> form POST
`/api/auth/callback/mobile-pin` using phone/PIN -> independent GET session ->
existing verified identity, vault and ProfileDashboardGate. The exact callback was
added to the existing return-redirect allowlist; arbitrary paths/origins remain
rejected. No second API client, bearer-token system or hand-minted cookie exists.
Website/admin email/password providers and old OTP endpoints remain unchanged.
Active service mobile routes no longer expose email/OTP/password recovery;
Forgot PIN remains deferred. Preview flows remain separate.

## Checks actually executed

- Prisma client generation succeeded using installed cached engine binaries;
  the initial default engine-download attempt failed in the restricted network.
  No database connection or migration was involved.
- `tsc --noEmit --incremental false`: exit 0.
- `npm run test`: final rerun exit 0 (typecheck, platform smoke, middleware,
  lead authorization, session security, password limits, mobile routes, legacy
  registration). Fixtures were corrected, not production security behavior.
- `node --test --test-isolation=none tests/mobile-pin-registration.test.mjs`:
  8 tests pass with synthetic in-memory storage and real hashing. Covers strict
  inputs, normalization/zero PIN, atomic default fields, duplicates, quota,
  legacy collisions and safe failure categorization. No real accounts/DB writes.
- Focused Flutter suite: 100 tests pass across mobile_pin_auth_screen,
  password_auth_protocol, session_provenance, session_ownership, cookie_lifecycle,
  property_detail and marketplace. Includes no automatic login after registration,
  PIN mismatch/no dispatch and the exact CSRF/PIN callback/session sequence.
- `flutter analyze --no-pub --no-version-check --no-fatal-infos --no-fatal-warnings`:
  exit 0, 77 lint/style notices. Plain analysis earlier exited 1; this is not a
  lint-clean claim. No analysis errors remained.
- Supported debug APK build exit 0; final APK installed and visible as above.
- No Next.js production build was run: it may evaluate environment-dependent
  server/static code. Backend compilation here means TypeScript checking, not
  production build/deployment verification.
- Early mixed Node fixture runs failed from incompatible global hooks; suites
  were rerun separately as intended. Initial marketplace/mobile-account/lead
  fixtures used superseded contracts and were corrected; final relevant runs pass.

## Exact changed files

- src/lib/auth/mobile-pin-registration.ts: enrollment validation, independent
  DB quotas, hashing and atomic/collision-safe creation.
- src/app/api/mobile/auth/register/route.ts: thin Node/dynamic POST route.
- middleware.ts: exact enrollment route exemption from session-required mutation
  admission; registration service owns origin validation and quotas.
- mobile-app/lib/features/auth/mobile_pin_auth_screen.dart: real PIN-only forms,
  lifecycle/submission safeguards, explicit separate sign-in after acknowledgment.
- mobile-app/lib/app/homezone_app.dart: service routes select PIN forms; preview
  unchanged; service recovery explicitly unavailable.
- mobile-app/lib/core/api/password_auth_protocol.dart: existing owned CSRF/session
  exchange supports the PIN provider while retaining legacy password support.
- mobile-app/lib/core/api/auth_request_options.dart: exact PIN callback allowlist.
- mobile-app/lib/features/auth/sign_in_controller.dart: PIN selection and error
  wording through existing session controller; no PIN persistence.
- mobile-app/lib/core/api/api_client.dart: debug-only staging public-catalogue
  status/elapsed/origin diagnostic, never authentication/body/header logging.
- tests/mobile-pin-registration.test.mjs: new synthetic enrollment security tests.
- mobile-app/test/mobile_pin_auth_screen_test.dart: new PIN UI contract tests.
- mobile-app/test/password_auth_protocol_test.dart: PIN callback/session regression.
- mobile-app/test/marketplace_test.dart: current collection/saved-status fixtures.
- tests/mobile-api.test.mjs: account GET fixture passes its required Request.
- tests/lead-authorization.test.mjs: TS-relative module loader and current
  logger/profile/transaction/private-document fixtures; arbitrary document URL
  rejection remains asserted.
- This report and HOMEZONE_REMAINING_BLOCKERS.md: current results and next gates.

No application schema/migration/configuration file was changed. Generated Prisma,
APK and screenshots are local generated/ignored artifacts. No production contact,
Railway change, live registration/login, OTP, migration, direct DB operation,
deployment, commit or push was performed. Only anonymous public staging traffic
was intentionally initiated by the app.
