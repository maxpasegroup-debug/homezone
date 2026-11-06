# HOMEZONE remaining integration blockers

## Builder project device images require activation and verification - 2026-11-06

The four native Builder project image sections and their owned backend upload /
readback integration are source implemented. Backend typecheck passes and four
isolated backend suites pass **87 checks**, using mocks without database/provider
or network access. The final focused six-file Flutter run passes **138/138 tests**,
exit 0, including Builder save/picker/actual-form and Owner regressions. Seven-file
Flutter analysis exits 0 with zero errors/warnings; existing informational style
findings remain. The new helper style finding was fixed and focused helper
reanalysis is clean. The universal staging debug APK build passed and ZIP
inspection confirms ARMv7/ARM64/x86_64 libraries plus the new picker labels.
Artifact: `mobile-app/build/app/outputs/apk/debug/app-debug.apk`, 200,206,023 bytes,
SHA256 `82ef9a0197a6c7da97abdcd992f383c7474217640c4b006b79fef5bb874c3cd3`.
No live Builder project/upload/status workflow is verified by this slice. It
requires a separately approved staging backend deployment plus installation of
the new staging APK. The client stops before draft creation if the old backend
lacks the Builder capability
contract. No new schema, migration or environment variable is required, but
existing provider readiness, Builder plan/ownership and full predeploy migration
review still apply. Images are public media, not private documents; native PDF
uploads are unsupported. See [Builder project images](BUILDER_PROJECT_IMAGE_UPLOADS.md).
No installation/launch, deployment, database write or production action was
performed. Artifact inspection is not device or live provider verification.

## Messaging presentation checked; remaining scope - 2026-11-06

The familiar inbox/thread presentation is source implemented: compact avatars
and local search, actual conversation metadata, peer/property context, grouped
date-separated bubbles, existing receipt ticks and a rounded side-by-side
composer. The earlier Buyer/Owner Messages bottom tabs and session privacy
guards are preserved. No fake unread/online state or unsupported media/call
controls were added; private chat remains the existing foreground HTTP polling
workflow.

**101/101 focused tests across eight files PASS**; source analysis exits 0 with
zero errors/warnings and 42 informational style findings. Tests include search,
stale taps, narrow/2x keyboard layout, uncertain-send retry, long-message/final
visibility and the existing receipt/privacy/navigation/role checks. The explicit
staging build/install passed, and actual Buyer Android inbox/search/thread
presentation was visually verified using the already-restored Buyer session.
Both bubble sides, day/time metadata, blue double-read ticks and the rounded
empty composer/send-disabled state appeared correctly. No fresh login, account
creation or new message send was performed for this UI slice.
Back returned to the selected Messages tab with the cleared search and inbox.

Remaining presentation coverage: no fresh Owner native pass for the new layout
(shared widgets are tested); the emulator soft keyboard did not appear, so only
widget tests establish keyboard-inset stress behavior. A focused composer PNG
is not IME evidence. The current x86_64 emulator APK is 100,135,339 bytes, SHA256
`1add4084c2d835f5c00f05a9eb3c7ac1420ea0afa59fa33031e25a10375e660b`, at
`build/app/outputs/flutter-apk/app-debug.apk`; prior hashes below are historical.
Physical ARM devices and broader OS/network coverage remain unverified.

Evidence: `build/chat-verification/chat-ui-focused-final-20261106.log`,
`chat-ui-buyer-inbox-20261106.png`, `chat-ui-search-no-results-20261106.png`,
`chat-ui-buyer-thread-20261106.png`. No new backend, schema, migration, Railway or
deployment operation occurred. Paid checkout, private chat push/WebSocket and
attachments retain their separate limits.

## Messages bottom-tab presentation verified; scoped remaining limits - 2026-11-06

The requested primary Messages destination is implemented in source:
Owner Home / Listings / Enquiries / Messages / More; Buyer Home / Search / Saved /
Messages / Profile. Existing shared inbox/session guards, thread return and
poll cancellation are retained. Buyer My Enquiries remains under Profile; its
app-bar/system Back now leaves a pending read safely instead of waiting for it.
The 90 focused tests across seven files pass. Final analysis exits 0 with zero
errors/warnings and 40 existing informational style lints. The explicit staging
APK build/install passed, and actual Buyer/Owner native sign-ins each showed the
new five-tab bar. Their fourth Messages tab loaded the controlled peer thread
from staging and retained the visible selected bottom bar. Actual Buyer and Owner
Android PNGs were visually reviewed. Buyer sign-out returned to role
selection. Final Owner sign-out returned to Welcome Back / Sign In, acknowledged
server sign-out/local clearing and left zero encrypted-vault entries. Both native
controlled sessions for this slice were explicitly signed out; no new accounts,
messages, listings or payments were created. Final app state is unauthenticated
Sign In, not an open private inbox.

The first attempt encountered Android DeadSystemException/JNI/FUSE failure.
Reboot of the existing emulator preserved app data and recovered Android display
and both role checks. No renderer/theme/native-window changes were made, and no
general historical black-screen root cause is claimed. This Nov 6 x64 APK is
100,135,339 bytes with SHA256
`2cf8f0f3c37a0d6064b0eafd7f8424e9deaec61b9419bb9cce23596e93b19962`, at
`build/app/outputs/flutter-apk/app-debug.apk` and the matching `apk/debug` path.
Physical ARM devices and broader OS/network conditions remain unverified.

This source/UI slice needs no backend changes, schema/migration, Railway variable
change or deployment. Existing free-chat/receipt activation remains valid; paid
subscription checkout remains separately disabled/unverified. No production,
commit or push operations. Baseline: `main/c282aa60315fe3ba2bd621d932815497586e2277`.

## Receipt activation resolved; remaining limits - 2026-11-05

Staging deployment `967b0c35-876f-42ec-8051-264fed2fd336` is SUCCESS. After a listed
staging DB-volume backup (`4aadc027-526f-4f82-992c-0a3096646797`), predeploy found
23 migrations and applied only `20261105140000_chat_message_receipts`. No variables
changed; realtime start/selector/flags and photo volume remain intact. Public
catalogue returned 200/source database/four properties; public WSS 101/ready passed.

Receipt activation is **not blocked**: 35/35 controlled API checks pass, actual
Android outgoing ticks progressed one grey -> two grey -> two blue, and an
incoming Owner reply stayed undelivered/unread in Buyer background before being
displayed/acknowledged after resume. PNG review confirms presentation, and
same-deployment Dart message/receipt POSTs returned 200. Sent bubbles align right,
received bubbles left; the send target sits beside the field with keyboard open.

The runtime check also found a separate five-second vault-read timeout before
session HTTP verification. The source uses a 20-second deadline inside the
ordered read and preserves stored credentials on transient failures while denying
unverified access. Nine persistence tests pass. Final staging APK
`8ef4ce33c96a0561c57b58dc49a769b6039ecb821a320b2183e8fd50fc4264b3` was installed
with data retained. Actual Owner dashboard restored without login on initial
launch and again after explicit force-stop/relaunch. This closes the controlled
Owner cold-restart regression on this emulator; it does not prove the precise
native-storage latency cause or every device's storage behavior.
Same-deployment Dart session/profile GETs returned 200 after the APK update and
again after explicit force-stop/start (12:44:23-24 and 12:44:52 UTC), correlated
with the actual Owner dashboard. Final Owner thread PNG confirms alignment/ticks.

Remaining work/limits:

- Final full Flutter suite passed **585/585 across 42 files**, including the
  session-persistence correction. Final native logout completed normally,
  returned Owner to role selection and left zero encrypted-vault entries/no private
  chat visible. All temporary API sessions were signed out. Earlier sessions whose
  credential was lost in the regression may remain until normal expiry; no broad
  revoke-all operation was performed.
  focused receipts passed 32/32. Full backend suite passes 398/398 plus six smoke
  assertions and typecheck. These local results and scoped runtime checks do not
  prove every business module, physical device or network condition.
- Backup exists/listed, superseding historical no-backup evidence. Restore testing,
  backup schedule and broader recovery readiness remain unverified.
- Private chat still polls about every four seconds in foreground. No private
  chat WebSocket, push, attachments or older-history browser is implemented.
  Delivery requires the recipient app to download the thread; blue ticks mean
  displayed in an active chat, not proof of human attention.
- Controlled roles used one emulator with an API peer. Simultaneous physical
  devices, outages/load, live abuse/block/report and real DB contention stress
  remain outside the verified scope. Accessibility attribution of tick icons is
  inconclusive; actual PNGs establish their appearance.
- Paid checkout remains disabled; native billing/contact-credit/payment acceptance
  and production release require their separate preparation/approval.
- Deployed receipt/cursor changes remain in an uncommitted CLI-uploaded working
  tree; a future Git-only release must include the reviewed source. Retain additive
  columns/receipts on rollback and preserve realtime/photo-volume configuration.

No new accounts, OTPs, payments, production operations, secret rotation, DB reset,
commit or push. Detailed evidence and rollback: `SUBSCRIPTIONS_AND_CHAT.md`.

## Historical initial free-chat activation checkpoint - 2026-11-05

Staging engagement flag is now enabled and corrected working-tree source is
deployed successfully as `f3975667-61c6-4ea8-90ce-456aaea913bb`. Migration was
already applied by the previous1b deployment; current predeploy22/no pending.
Actual Buyer/Owner Android send/read/reply and automatic incoming Buyer update
were verified, with two successful Dart POSTs in the same deployment's HTTP logs.
27 controlled API checks passed including persistence, deduplication, isolation
and revocation; all temporary sessions were signed out. Catalogue200 and public
property WSS101/ready remain healthy. Production was untouched.

The503/missing engagement flag is resolved. Remaining limits:

- Paid checkout stays false; native billing/channel setup and real credit/payment
  acceptance remain separate approvals. No paid entitlement is faked.
- Private chat uses foreground ~4second HTTP polling, not private WebSocket/push.
  Initial history50, inbox100 and no older-history browser/attachments. Receipts
  were absent at this checkpoint and have since been activated/verified above.
- Two roles used one emulator sequentially plus API peer. Two simultaneous
  physical devices, outages/reconnect, load, live abuse/block/report and real
  PostgreSQL contention stress remain unverified.
- No staging DB volume backup was listed at this checkpoint. A backup has since
  been created/listed above; recovery testing/scheduling remain operational work.
  This earlier rollout applied no new migration or destructive DB operation.
- Cursor fixes remain uncommitted locally; future Git-only deploys must include
  them. Preserve current realtime start/empty selector/photo mount on future releases.

Full scoped evidence/rollback: `SUBSCRIPTIONS_AND_CHAT.md`. Historical blocked
entries below document the earlier state; they are not the current chat status.

## Historical chat live availability blocked - 2026-11-05

Read-only staging chat GET returned503 `Chat and contact plans are not available
yet.` (server Date09:16:14UTC). This is the default-off engagement gate, not proof
of a DB failure. New membership GET returned401 without a session. No public
response confirms deployed SHA, migration state or successful message delivery.

The verification follow-up corrected a backend timestamp/cursor race and added
two-account/isolation/pagination regressions (19 local backend tests and full
typecheck pass). Flutter's server-owned read cursor invariant is also corrected;
16 focused tests and Dart analysis pass. These are synthetic checks, not a staging messaging trial.
Before claiming chat works live, approve target/schema/recoverability verification,
the approved pending migration set, corrected-source deployment, engagement
activation and controlled Buyer/Owner message/session writes. Keep paid checkout
off for free-chat acceptance. Existing no-production/no-unapproved-write boundaries
are preserved. Details and evidence: `SUBSCRIPTIONS_AND_CHAT.md`.

## Historical initial chat and Plus activation requirements - 2026-11-05

Chat/contact/membership source and an updated staging APK are implemented and
locally checked; no deployment or live verification occurred for this feature.
Before it can work on staging:

1. Approve the exact staging pending migration set and recoverability, including
   `20261105120000_buyer_membership_chat`. Do not deploy blindly: Railway predeploy
   runs all pending migrations. Preserve existing realtime/volume configuration.
2. Approve backend deployment and `HOMEZONE_ENGAGEMENT_ENABLED` activation after
   compatible schema/client verification. Defaults fail closed with clear 503s.
3. Authorize controlled Buyer/Owner chat/contact preference/block/report writes
   and actual Android presentation checks. No fixture test is live acceptance.
4. Choose private APK versus store distribution and implement/approve its native
   billing channel. App purchases are honestly disabled; Free/Plus plan display
   and paid entitlement/credit handling do not by themselves complete checkout.
5. Before paid activation, approve provider sandbox tests/configuration, refund/
   dispute and ambiguous-order reconciliation, tax/receipt/support and retention
   policies. `HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED` enables only canonical-origin
   WEBSITE checkout and requires engagement plus existing Razorpay keys; it does
   not enable native purchases. Existing mobile web-service payments are separate.

No private WebSocket, push delivery, attachments, read receipts, older-message
browser, credit replacement UI or automatic refund execution is claimed. Chat
updates by authenticated foreground polling (~4 seconds); inbox/latest-history
and memory are bounded. Phones users already saw cannot be recalled on opt-out.
Pro/Boost plans remain deferred. Detailed implementation/approval/rollback plan:
`SUBSCRIPTIONS_AND_CHAT.md`. Existing authentication/catalogue/owner workflows
remain independent of these new gates.

## API loading shimmer - 2026-11-05

Fetch indicators were replaced by shared shimmer placeholders in the active
Buyer, role workspace, profile/session, photo and document-loading paths. The
existing circular photo-picker opening indicator is local device interaction;
upload/mutation progress remains explicit. Backend/authentication/WebSocket
contracts and confirmed-content refresh behavior are preserved.

Final focused local checks passed: 82 existing data-screen tests plus 17 shimmer
and 30 authentication/navigation tests. Shared loading code has no analyzer
issues; broader changed-file analysis has zero errors/warnings and existing
informational lints. This is not new staging authentication or Android runtime
evidence. Install the updated explicitly staging-configured APK to see this UI;
previously installed builds retain the old loaders until updated.

## WebSocket activation and foreground publication acceptance resolved - 2026-11-05

The staging backend now runs `npm run start:realtime` with the feature enabled.
Pinned deployment `39f07478-4329-44a9-b59f-9866cc0a285c` is SUCCESS on
`9a2b1001b984c61d3fc9cc5d914a9934e105c75d`. Actual WSS 101/ready and server
listener_ready were verified. Existing staging Flutter logged ready, then
change_received after one authorized controlled Owner publication; its next
catalogue HTTP response was 200. The already-open Buyer-facing card and photo
updated without tapping refresh/navigation. Record `cmw32s2dt0003ox0xo3ydesx7`
remains clearly labelled as an illustrative staging test. No new account,
application code, schema, secret or production change was involved.

Still unverified: a distinct Buyer-account login/device trial, rental-specific
acceptance, outage/reconnect behavior, sustained load and multiple replicas.
Photo backup/recovery/capacity and production Cloudinary release remain separate
operational gates. Test publication used an existing controlled Owner API
session and existing authorized test images; it did not repeat the earlier
native upload acceptance. Current activation used an empty legacy config-file
selector on staging only, because nonempty custom-file selection was rejected.
Do not undo that selector or assume a stored setting proves the deployed start
manifest. Settings, evidence and safe rollback: `LISTING_WEBSOCKETS.md`.
This supersedes historical socket-pending blockers below.

## Photo-storage error resolved on staging - 2026-11-04

Authorized volume activation is complete. Deployment
`9f87dfe1-e8d5-48ba-911b-8af27e64af09` is SUCCESS on
`eeea9a3ce114923dcd352e9ad823a92a67afca3e`, with its own backend photo mount
and volume provider selector. Existing pre-deploy reported no pending migrations;
PostgreSQL and production were untouched.

Native Owner creation -> two real photo uploads -> stored-gallery confirmation
-> PUBLISHED completed from the form's one Publish action. Public readback and
actual Android Owner/Buyer-facing screens displayed the new test property and
both photos using the installed updated staging APK. Both files survived a
controlled backend restart with identical independent readback hashes. The old
storage-unavailable screenshot is no longer the current result.

Automatic appearance on an already-open Buyer-facing screen and WebSocket
acceptance were subsequently verified above. Still pending: a distinct
Buyer-account login test and rental-specific acceptance.
The test used Owner-authenticated public discovery. Volume backup/restore and
capacity operations remain unverified; Railway's assigned capacity was
`sizeMB:50000` and no resize/backup schedule was requested. Production Cloudinary
transition and other role-workflow gates remain. Exact evidence/target/record:
`PROPERTY_PHOTO_VOLUME_STORAGE.md`.

## Volume-storage decision: staging activation pending - 2026-11-04

Source now supports the founder's Railway-volume staging choice. Cloudinary
credentials are no longer required for property-photo writes **once this volume
adapter is actually activated**. Until then, the current live missing-storage
error remains valid. No guard was removed and no success was fabricated.

Required release: attach a separate photo volume at `/app/property-media` to the
explicitly identified staging backend, set
`PROPERTY_PHOTO_STORAGE=railway-volume`, verify injected mount identity, release
this backend and use the updated exact-host staging APK. Preserve the PostgreSQL
volume and production. Existing pre-deploy migrations and service interruption
require the established separate release approval. No new migration is needed.

Local checks: 66 photo tests and TypeScript passed. Still unverified: actual
Railway Linux mount/fsync and persistence, capacity/backups, two real photo
uploads, same-record publication, Owner/Buyer rendered images and automatic
appearance on an already-open Buyer screen. Old volume image URLs must be kept
reachable or migrated when switching to Cloudinary; changing the provider alone
does not move files. Full activation/rollback: `PROPERTY_PHOTO_VOLUME_STORAGE.md`.

## Current emulator-confirmed Owner publication blocker - 2026-11-04

The authorized native staging check reached Owner Review with all required
fields and two distinct selected photos. Tapping **Publish listing** returned
the explicit storage-unavailable message and retained the form: **No listing
was created.** This is now device evidence, not only a historical variable
inventory. The client's authenticated capabilities guard rejected
`propertyPhotoUploadConfigured:false` before sending the property creation POST.

Current source derives that flag from the presence of all three Cloudinary
requirements: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`. The exact absent variable(s) were not inspected in this
device check; no values were retrieved or changed. The existing upload route
uses Cloudinary, and a mounted Railway volume has no property-photo adapter.

Follow-up read-only CLI evidence now confirms **all three names absent** from
the matched staging backend. Its active successful deployment
`8979038d-85e1-4e69-81d6-c224ed21b0f4` (created
`2026-11-04T10:57:14.207Z`) runs local HEAD
`8eec2030534300a850c3009f823d3ed5e42931fd`. There is no backend photo volume
attached; the existing PostgreSQL volume is unrelated and must remain untouched.
Local ignored configuration has no nonempty Cloudinary credentials either.
The app already permits the exact Cloudinary image host. Genuine privately
supplied storage credentials, not a form rewrite or removed guard, are required.

Owner native sign-in/role dashboard, Buyer catalogue HTTP 200 and an existing
listing image were device verified. New Owner publication, stored-photo
readback and automatic Buyer appearance remain BLOCKED by photo-storage setup.
The subsequent public catalogue returned source `database`, one property and no
test listing. Do not describe the Owner-to-Buyer workflow as working end to end.

Next operation requiring separate approval: privately provision/verify the
staging photo-provider variables and any resulting service release effects.
Then authorize/repeat one controlled native publication with 2-6 photos and
observe the matching Buyer record without manual refresh. Verify WebSocket
101/ready independently; HTTP fallback success does not prove socket activation.
Full device evidence and artifact identity are in the current first section of
`HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`. No infrastructure/source change,
direct database operation, migration or deployment was made during this check.

## After role-workflow source repairs - 2026-11-04

The four high-priority findings from the role cross-check have source fixes and
local regression coverage: enquiry account isolation, provider request/privacy
scope, Builder tower/role ownership and service payment amounts. Identified
multi-write transactions, published-only public writes, post-upload role checks,
Studio state controls, customer reviews and targeted forms are also corrected.
See the current implementation section of
`HOMEZONE_ROLE_DASHBOARD_CONNECTIVITY_MATRIX.md` for exact files/evidence.

**Do not call every role/function RUNTIME VERIFIED.** Remaining gates:

1. Matching staging backend and Android artifact: confirm service/domain/SHA,
   private configuration compliance and deployment pending migrations/recovery
   evidence; separately approve the exact release. This slice adds no schema or
   migration, but `railway.json` still runs ALL pending migrations before deploy.
2. Controlled five-role acceptance: separately approve accounts/fixtures and each
   intended staging write, then actual Android actions, session/profile role,
   permitted mutation/readback, foreign-record denial, restore/logout and errors.
   A successful local fixture or historical catalogue GET does not close this.
3. Broker team invitations/account linking: contact CRUD is not account membership.
   Existing active linked members can be assigned; a new secure invitation/
   acceptance capability is still required. Do not accept arbitrary profile IDs.
4. Existing Owner ARCHIVED records need support/admin review. New Owner hiding
   uses reversible Unpublish -> DRAFT; administrative takedowns remain effective.
5. Confirm the commercial intent of monthly Builder BASIC versus yearly PRO.
   No paid entitlement is changed speculatively.
6. Provider verification, photo storage, exact media hosts, private-file scanner/
   encryption, Razorpay sandbox and payment reconciliation require operational
   readiness evidence. New account role alone does not verify a service business.
   Service checkout supports INR and blocks inconsistent/uncertain past orders.
7. Native password recovery, approved legal/policy consent, native push and real
   external fulfillment/payment operations retain their documented boundaries.
   The in-app notification/history/request records are not those external actions.

Full Flutter suite **532 passed**; focused Owner/role checks **100 passed**.
Full backend **338 Node tests + six smoke checks + TypeScript passed**; analysis
has no errors/warnings and 78 informational lints. A fresh explicit staging APK
compiled; artifact/hash are in `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`.
No live data, account, infrastructure, deployment, device installation/launch,
commit or push was performed. Historical sections below describe earlier source
and releases, not automatic proof of the current candidate.

## Owner single-submission publication acceptance - 2026-11-04

The final new-listing action remains Publish listing, as clarified by the founder.
After required fields and photos are complete, it uses the
existing automatic creation/upload/readback/publication sequence, and already
published detail pages no longer offer a redundant Publish button. Manual Publish
is retained only for eligible unpublished drafts/recovery. This is a source/UI
correction, not proof that a reported live draft has been published. Matching
backend/storage/APK and controlled Owner-to-Buyer acceptance remain required.

## Two-photo Owner policy release - 2026-11-04

Owner publication now requires two distinct stored photos; the mobile new-listing
picker permits up to six. This supersedes four-photo statements in historical
sections below. A matching backend release and updated APK are required before
claiming the deployed flow accepts two photos. Existing larger galleries, photo
storage/host requirements, upload confirmation and authorization remain unchanged.
No live property was created or modified by this policy change.

## Five-role dashboard release acceptance - 2026-11-04

SOURCE IMPLEMENTED: focused role navigation/homes, actual scoped record previews,
grouped shared services, common profile/contact editing, direct role->Sign In/
Create account navigation, guided six-step listing creation and bounded provider
uploads. Existing Buyer/preview, roles, ownership, session security, four-photo
publication and prior Delete changes remain. Backend checks passed locally.
The new staging debug APK is COMPILED: 511 Flutter tests passed, full analysis
has no errors/warnings (83 infos), and backend TypeScript/smoke/232 fixtures passed.
APK provenance and SHA-256 are in `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`.

NOT RUNTIME VERIFIED by this slice: the new Android presentation, all five live
role journeys, native secure-storage persistence, actual provider uploads and
post-publication Buyer/Owner readback. The latest candidate must not be mistaken
for the older installed artifact. Exact acceptance/approval sequence is in
`ROLE_DASHBOARD_RELEASE_CHECKLIST.md`.

External gates remain: privately configured photo provider and approved exact
image hosts; reviewed matching staging backend/APK release; predeploy pending-set
and rollback review; authorized controlled accounts/records/mutations. Earlier
WebSocket implementation still needs separate activation and acceptance. Legal
policy/versioned-consent, native recovery and external payment/push capabilities
remain documented limitations; no new menu implies those are complete.

## Owner permanent deletion acceptance - 2026-11-04

Flutter now provides Owner Items -> listing -> Delete listing, using the existing
ownership-protected backend DELETE and requiring exact deletion acknowledgment.
No live deletion has been performed. A controlled disposable staging listing and
separate authorization are needed for device/backend deletion acceptance.

Existing retained private documents can prevent deletion: `PrivateFile.property`
uses `onDelete: Restrict` (`prisma/schema.prisma`). The current backend reports a
generic server error for that constraint; Flutter preserves an uncertain result
and requests refreshed Items before retrying. Do not delete retained documents or
change their foreign-key policy just to make the action succeed. Archive can hide
the listing instead. Externally stored photo files are not removed by this endpoint.

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
