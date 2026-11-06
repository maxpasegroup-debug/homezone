# HomeZone subscriptions and property chat

## Familiar messaging presentation - COMPILED / BUYER ANDROID VERIFIED - 2026-11-06

The existing Buyer/Owner Messages destinations now use a compact avatar inbox
with local search by peer name or property title. Rows show the actual peer,
property and conversation update time; initials are presentation, not fetched
profile photos. Empty and no-match states are distinct. No message preview,
unread count or online indicator is fabricated.

Threads use a peer-focused header, compact property context, day separators and
grouped incoming-left/outgoing-right bubbles. Footers show the message time and
the existing server-backed Sent/Delivered/Read ticks. A rounded multiline
composer keeps the send button beside the field, disables empty submissions and
retains the existing same-message retry behavior. Property context is hidden
while the keyboard is open to leave room for messages. Unsupported attachment,
voice and call controls are not introduced.

Presentation is isolated in
`lib/features/engagement/chat_presentation.dart`, integrated by
`lib/features/engagement/engagement_screens.dart`. The existing backend contracts,
polling, viewport receipt checks and account/session-generation guards remain.
Search is cleared with private state; the peer header is shown only for the
current authenticated session. The earlier verified bottom tabs remain intact.
**101/101 focused tests across eight files PASS**, including local search/clear,
stale inbox taps, 320x640 at 2x text with keyboard insets, uncertain-send
idempotent retry, long unbroken messages, final-message visibility and existing
receipt/privacy/navigation/role checks. Source analysis exits 0 with zero
errors/warnings and 42 informational style findings. Evidence:
`build/chat-verification/chat-ui-focused-final-20261106.log`.

Explicit staging `flutter run --no-pub -d emulator-5554 --dart-define-from-file=config/staging.local.json`
built in 52.7s and installed in 21.7s. Actual Android Buyer rendering showed the
new inbox, search no-match/clear, an existing staging conversation with both
bubble sides, day chip, times, blue double-read ticks and rounded empty composer
with send disabled. Back returned to the selected Messages tab. The existing Buyer session was already restored;
no fresh account login, account creation or new message send occurred in this
presentation run. The Owner uses the same widgets and is covered by the tests,
but no fresh Owner native presentation pass was performed for this polish.

Visually reviewed Android evidence under `build/chat-verification/`:
`chat-ui-buyer-inbox-20261106.png`, `chat-ui-search-no-results-20261106.png` and
`chat-ui-buyer-thread-20261106.png`. The focused composer capture
`chat-ui-thread-keyboard-20261106.png` does **not** prove native soft-keyboard
presentation: the emulator IME did not appear. Keyboard/layout stress is verified
in widget tests only. No backend, schema, configuration or deployment change was
made for this slice.

Back/tab retention and embedded new APK labels are also recorded in
`build/chat-verification/chat-ui-verification-20261106.json`.

Latest presentation artifact: `build/app/outputs/flutter-apk/app-debug.apk`,
100,135,339 bytes, SHA256
`1add4084c2d835f5c00f05a9eb3c7ac1420ea0afa59fa33031e25a10375e660b`.
It is an **x86_64 emulator debug APK**, not a verified ARM phone build. This
supersedes the navigation-only APK hash below.

## Messages in bottom navigation - COMPILED / ANDROID VERIFIED - 2026-11-06

Baseline before this slice: `main/c282aa60315fe3ba2bd621d932815497586e2277`.
Messages is now a primary destination rather than only a Profile/More action:

- Owner: Home / Listings / Enquiries / **Messages** / More.
- Buyer: Home / Search / Saved / **Messages** / Profile.
- Buyer My Enquiries remains available inside Profile with app-bar and Android
  Back navigation. Back can leave even while its account read is pending;
  stale responses cannot replace the destination after navigation.

Both destinations reuse `ConversationListScreen`, whose own Scaffold accepts the
existing bottom bar. Selecting another tab disposes the inbox and cancels its
polling; opening a thread and returning keeps Messages selected. Account/session
generation keys and the existing private-state guards remain authoritative.
Standalone inbox navigation, chat sending/receipts, authentication and backend
contracts are unchanged. The fictional preview remains separate.

Local verification: **90 focused tests across seven files PASS**, covering direct
tabs, chat return, hidden polling, anonymous/logout boundaries and two delayed-read
Back regressions. Final analysis exits 0 with zero errors/warnings and 40 existing
informational style lints. Evidence:
`build/chat-verification/bottom-messages-focused-final-20261106.log` and
`bottom-messages-analysis-final-20261106.log`.

**Actual Android navigation passed on emulator-5554 with existing controlled accounts:**

| Account / action | Observed result |
| --- | --- |
| Buyer native sign-in | Real Buyer Home displayed Home / Search / Saved / Messages / Profile. |
| Buyer Messages tab | Fourth destination opened the existing controlled Owner conversation from staging, with the bottom bar visible and Messages selected. Actual PNG `buyer-messages-bottom-tab-20261106.png` was visually reviewed. |
| Buyer sign-out | Profile sign-out returned to unauthenticated role selection. |
| Owner role-first native sign-in | Real Owner dashboard displayed Home / Listings / Enquiries / Messages / More. |
| Owner Messages tab | Fourth destination opened the existing controlled Buyer conversation from staging, with the bottom bar visible and Messages selected. Actual PNG `owner-messages-bottom-tab-20261106.png` was visually reviewed. |
| Final Owner cleanup | Normal sign-out returned to Welcome Back / Sign In, acknowledged server sign-out/local clearing, and left zero encrypted-vault entries. |

No new accounts, chat messages, listings, payments or other business records were
created by these navigation checks. Both native controlled sessions used for this
slice were explicitly signed out; final app state is unauthenticated Sign In.
The existing staging backend was used; no new backend activation was required.

The initial presentation attempt encountered an Android **DeadSystemException**,
JNI pending exception and a disconnected shared-storage FUSE endpoint. The existing
emulator was rebooted with app data preserved, after which normal Android
onboarding and both role navigation checks recovered. This establishes an OS
failure event during this run, not a permanent root cause/fix for every earlier
black-screen observation. No renderer, theme or native-window changes were made.
Recovery capture: `build/chat-verification/bottom-messages-recovery-20261106.png`.

### Earlier Nov 6 navigation debug APK (superseded)

Explicit staging Flutter build/install succeeded (assemble 29.3s, install 16s).
Command, from `mobile-app/`:

```powershell
& 'C:\src\flutter\bin\flutter.bat' run --no-pub -d emulator-5554 --dart-define-from-file=config/staging.local.json
```

After the OS failure and emulator reboot, the already-installed staging APK was
reopened through `adb ... shell am start -n com.example.homezone_mobile/.MainActivity`;
no additional build or installation was needed for the recovered role checks.
The emulator artifact is **x64**, 100,135,339 bytes:
`build/app/outputs/flutter-apk/app-debug.apk`; the copy at
`build/app/outputs/apk/debug/app-debug.apk` has the same SHA256:
`2cf8f0f3c37a0d6064b0eafd7f8424e9deaec61b9419bb9cce23596e93b19962`.
This identifies the earlier Nov 6 navigation build, superseded by the presentation
artifact above. The Nov 5 artifact hashes and checks below are also historical;
x64 emulator verification does not establish physical ARM-device compatibility.

No backend/schema/migration/deployment/variable/production, commit or push changes.
This navigation work does not activate paid subscription purchasing.

Implementation date: 2026-11-05. Starting source baseline:
`49cb11af9d43a58b7f46c7029c27c694aa2d34af`.

Current status: **FREE CHAT AND RECEIPTS ACTIVATED ON STAGING / ANDROID VERIFIED**
after the founder's explicit activation/test approval. Plus purchases remain disabled.
The earlier source-only and blocked results below are retained as history and
are superseded by the activation evidence here. Production was not accessed.

## Message ticks and acknowledgements - BACKEND CONNECTED / ANDROID VERIFIED - 2026-11-05

This section supersedes earlier source-only, activation-pending and receipt-absent
entries below. The current receipt deployment is active on staging, with controlled
API and actual Android presentation evidence. The corrected Owner cold restart is
also device-verified below; successful receipts do not verify every application module.

- One grey tick: an outgoing message was acknowledged as saved by the server.
- Two grey ticks: the recipient app explicitly acknowledged receiving/decoding it.
- Two blue ticks: the recipient app explicitly acknowledged displaying it in the
  current foreground chat. This means displayed, not proof a human read the text.
- Incoming messages do not show sender ticks. No optimistic double ticks, delivery
  inferred from a GET, historical backfill or fake read confirmations are used.

### Contracts and protections

`ChatMessage` gains nullable `deliveredAt` and `readAt`. Migration
`20261105140000_chat_message_receipts` adds these fields and a CHECK requiring
delivery before/equal to read; existing rows remain null. It depends on the
existing chat tables from `20261105120000_buyer_membership_chat`. The approved
staging predeploy found 23 migrations and applied **only**
`20261105140000_chat_message_receipts` at 2026-11-05 11:52:05 UTC. No schema reset,
historical receipt backfill or destructive database operation was performed.

`POST /api/mobile/conversations/[id]/receipts` accepts only `deliveredIds` and
`readIds` arrays (default empty), each unique and at most 50, with a nonempty
union of at most 50. Read implies delivery; the Flutter client avoids duplicating
IDs between arrays. The existing 12KiB body bound still applies. All IDs must
belong to this conversation and have been sent by the other participant. The
whole batch validates before writes; own, missing or foreign IDs receive the
same generic 400. Only authenticated current participants can acknowledge.

The existing Auth.js/revocation, Origin/Sec-Fetch-Site, current profile, suspension,
published listing and ownership checks are preserved. Blocked pairs cannot
acknowledge or obtain fresh receipt state. The existing database-backed admission
infrastructure enforces a separate `messages-receipts` quota: 60/minute per
profile and the helper's aggregate 6,000/minute budget. Server-generated first
timestamps are written only while null, under the existing transaction/lock
order, and never regress. Receipts neither notify nor reorder the inbox.

History GET remains read-only. It now advertises `receiptsSupported: true` and
accepts an optional unique comma-separated `receiptIds` list, at most 50, for
the caller's own messages. Response `receipts` contains `{id, deliveredAt,
readAt}` independently of the message cursor, including empty forward polls.
Message/send projections also carry nullable receipt timestamps. Bodies,
credentials, cookies and receipt payloads are not logged.

Flutter rotates bounded snapshots across retained outgoing messages and merges
only server-confirmed status without regression. Parsed incoming messages are
explicitly acknowledged; read IDs additionally require an attached, laid-out
bubble substantially visible within the chat viewport after a 300ms debounce
(at least 60% of the smaller of bubble/viewport height). Covered routes,
background/inactive apps, offscreen bubbles and stale account generations do not
generate read acknowledgements. Scrolling and keyboard changes recheck visibility.
Failed acknowledgements are retried idempotently with Retry-After/backoff and a
nonblocking status-delay message; they never resend chat messages. Existing
send/retry safeguards and the compact composer remain unchanged.

An older backend without `receiptsSupported` is handled safely: no receipt POST
or new GET parameter is sent and saved messages retain one tick. There is no
private receipt WebSocket or background delivery service; updates use the existing
approximately four-second foreground polling. A recipient who has not opened the
thread has not downloaded its message bodies and will not produce delivery ticks.

### Approved activation and runtime evidence

Active staging deployment **`967b0c35-876f-42ec-8051-264fed2fd336` is SUCCESS**, created
2026-11-05 11:46:49.525 UTC. Target: project
`1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, environment
`2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, backend
`ea6ca516-4063-4ed1-be95-bebcc0d1af00`, database
`8a0f4b40-a4d6-4924-8b07-79e82065fe24`. CLI upload used the reviewed working tree
based on `1b091c0fdbb68030f5b14927322f61bcd140a603`; it is not a new committed SHA.
No variables were changed in this receipt activation. Existing realtime start,
empty config selector, engagement/checkout flags and photo volume were preserved.

Before migration, a staging database-volume backup was created and listed:
`4aadc027-526f-4f82-992c-0a3096646797`, 2026-11-05 11:45:34.731 UTC.
This supersedes older "no listed backup" observations. **Restore has not been
tested**; a listed backup does not establish proven recovery or a backup schedule.

| Check | Actual result / limit |
| --- | --- |
| Controlled receipt API acceptance | **35/35 PASS** using existing controlled Buyer/Owner accounts; no new accounts or OTPs. |
| Native outgoing tick progression | Actual Buyer Android send showed one grey tick; explicit Owner API delivery acknowledgement changed it to two grey ticks; read acknowledgement changed it to two blue ticks. Normal Android PNGs were visually reviewed. |
| Native recipient foreground behavior | Owner API reply stayed undelivered/unread while Buyer was backgrounded for six seconds. After resume, the actual Buyer conversation displayed it and acknowledged read. |
| Native traffic attribution | Same deployment logs show Dart message POST 200 at 11:55:45.567 UTC and receipt POST 200 at 11:55:12.629 and 12:07:13.346 UTC. |
| Composer and alignment | Send icon is beside the field with keyboard visible and a 48dp target. Outgoing bubbles are right-aligned; incoming bubbles are left-aligned. |
| Final Owner conversation | `receipt-owner-thread-final.png` was visually reviewed: outgoing right/blue double ticks, incoming left/no ticks, and send icon beside the field. |
| Accessibility evidence | Tick icon semantics could not be attributed conclusively from the Android accessibility dump. Visual PNG evidence, not an assumed accessibility label, establishes the displayed ticks. |
| Existing services | Public catalogue returned 200/source database/four properties; existing public property WebSocket returned 101/ready. |
| Test writes and cleanup | Three labelled messages in the existing controlled thread during this turn. All temporary API sessions signed out. Final Buyer and Owner native signouts were confirmed; Owner returned to unauthenticated role selection, with zero encrypted-storage entries and no private chat open. No new accounts, properties, OTPs, payments or contact-credit operations. |

Sanitized evidence is under ignored `build/chat-verification/`, including
`receipt-acceptance-20261105T113717Z-5220d26f.json`,
`receipt-deployment-status.json`, `receipt-deployment-log-summary.json`,
`receipt-deployment-source-manifest.json`, `receipt-backup-list.json`,
`receipt-backup-workflow.json`, `receipt-dart-http-evidence.json`,
`receipt-service-regression.json`, `device-receipt-send.json`,
`device-receipt-peerdeliver.json`, `device-receipt-peerread.json`,
`device-receipt-peer-reply.json`, `receipt-final-evidence.json`,
`receipt-owner-thread-final.png` and the `device-receipt-inspect-*.png` captures.
Use Railway/server timestamps for correlation; local/emulator clock skew exists.
No credentials, cookies, message bodies or secret values are included in the report.

### Local checks, latest APK and separate session defect

- Full backend `npm test`: **398/398 tests across 23 files**, plus **6/6 platform
  smoke assertions**, pass; TypeScript typecheck passes. Tests use synthetic
  stores/providers and loopback realtime sockets, not live database acceptance.
- Focused Flutter engagement/receipt tests: **32/32 PASS**. The complete Flutter
  suite after the session-persistence correction passed **585/585 across 42 files**.
  Evidence: `build/chat-verification/flutter-final-tests-20261105.log` and
  `flutter-final-tests-20261105-summary.json`. The earlier 581/581 run predates
  that correction and is superseded by this final run.
- Prisma schema validation and local compatible-client generation passed; these
  local operations did not establish deployed migration status. Exact predeploy
  execution and real receipt operations establish the staging evidence above.
- Actual cold restart exposed a separate session-vault read deadline of five
  seconds expiring before a session HTTP request. The source correction uses a
  20-second read deadline inside the ordered vault operation and preserves stored
  credentials on transient failures while refusing unverified authenticated access.
  **9/9 persistence tests pass.** The final APK was installed with data retained:
  the existing encrypted Owner session restored to the actual Owner dashboard
  with property image, then a second explicit force-stop/relaunch restored it
  again without login. **Owner cold restart is DEVICE VERIFIED on this emulator.**
  Same-deployment Dart session/account GETs both returned 200 after APK update
  (12:44:23.447 and 12:44:24.693 UTC), then again after explicit force-stop/start
  (12:44:52.107 and 12:44:52.650 UTC), matching actual Owner dashboard restoration.
  No claim is made about the precise native-storage latency/Keystore cause.
  Final native logout returned to role selection and cleared the encrypted vault.
  Sessions whose credential was lost
  during the earlier regression may remain until ordinary expiry; no broad
  revoke-all operation was performed or claimed.
- Explicit staging build uses
  `node scripts/build-android.mjs --mode service --config config/staging.local.json`.
  Latest APK: `build/app/outputs/apk/debug/app-debug.apk`, SHA256
  `8ef4ce33c96a0561c57b58dc49a769b6039ecb821a320b2183e8fd50fc4264b3`.
  Build record: `build/android-source-builds/2026-11-05T12-26-34-541Z-22636/build-record.json`;
  explicit service/staging configuration and exact staging origin were recorded.
  This final session-corrected artifact is installed and passed the controlled
  Owner cold-restart check; receipt evidence and restore evidence remain separate.
  A later vault-comment clarification does not alter the built executable behavior;
  source/artifact precision is noted in `receipt-final-evidence.json`.

The approved work included a staging backup, additive migration, deployment and
controlled session/message/receipt writes. No production access, variable changes,
secret rotation, database reset, account creation, commit or push was performed.

### Rollback and remaining verification

Rollback uses the last compatible backend/APK while retaining the additive
columns and receipt data. Do not drop columns, rewrite old messages or reset
migration history. Legacy clients ignore extra fields; this APK detects an older
backend and keeps single ticks. Rollback does not itself revoke user sessions.

## Historical compact chat composer checkpoint - 2026-11-05

The message field and circular send button now share one bottom row. The send
button sits to the right, remains 48px square, and stays aligned with multiline
input. Sending and uncertain-retry states keep the existing duplicate protection
and accessible tooltips. The 2,000-character limit remains enforced.

All 17 focused Flutter engagement tests passed, including a 320px-wide screen
with an open keyboard and four-line draft; analysis reported no issues. The
explicit staging debug build succeeded using
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
APK SHA256: `6e8dd55ac15f2279dfa235ec1419c7091498a93d87db68003b43e155db6e6d22`.
Build evidence: `build/android-source-builds/2026-11-05T11-03-10-301Z-8272/`.
ADB listed no connected devices at this check, so this layout has not been
installed or visually verified on Android. No new messages, backend changes or
deployment were needed for the composer correction. Receipts were absent at that
checkpoint; the activation and device evidence above supersede that limitation.

## Historical initial free-chat staging activation and Android check - 2026-11-05

### Exact target and root cause

Project `1f8c9007-2993-426c-bbd0-b8dd0a0b17da` (`homezone`), environment
`2181eadf-21a0-4ca3-8269-b6b6f28af9f4` (`staging`), backend
`ea6ca516-4063-4ed1-be95-bebcc0d1af00` (`HomeZone`), public domain
`https://homezone-staging.up.railway.app`. Current Railway metadata confirms
these identities, domain mapping and staging PostgreSQL service
`8a0f4b40-a4d6-4924-8b07-79e82065fe24` (`Postgres-9ZqA`). Private variable
comparison confirmed backend/database host, database and credentials match;
no credential value was printed or saved in the evidence.

The old active deployment was `d8ac7cd0-a7bb-4f92-b47e-86747023af2f`, SUCCESS,
created09:07:19.999UTC on commit `1b091c0fdbb68030f5b14927322f61bcd140a603`.
It already contained the chat routes. Its predeploy logs explicitly record22
migrations, applying `20261105120000_buyer_membership_chat` at09:11:18UTC and
successful completion. The confirmed503 cause was the **missing
`HOMEZONE_ENGAGEMENT_ENABLED` variable**, not an established DB failure or missing
route. Canonical staging URL compliance and existing realtime flag were correct.

### Changes and deployment

Saved exactly these nonsecret staging backend variables, initially with
`--skip-deploys`, then deployed the reviewed working tree through official CLI:

```text
HOMEZONE_ENGAGEMENT_ENABLED=true
HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED=false
```

New active deployment **`f3975667-61c6-4ea8-90ce-456aaea913bb` is SUCCESS**, created
09:39:50.602UTC. Local base commit remains `1b091c0...`; CLI upload included the
uncommitted backend timestamp and Flutter server-cursor corrections. No commit
or push was performed. Source hashes are recorded in
`build/chat-verification/deployment-source-manifest.json`; backend
`conversations.ts` SHA256 is
`fae48b5e1e50e53bcfb2790a48bcba7f71827c29ab6f69fb241f9fe801e4e3b6`.
Do not assume a future Git-only deployment includes the uncommitted corrections.

New predeploy logs at09:42:31UTC report22 migrations and **no pending migrations**.
The existing `prisma migrate deploy` hook ran; this task applied **zero new schema
migrations** and issued no direct SQL. No database account/property backfill,
reset or restore was performed. A direct schema-query attempt stopped before
execution because SSH keys were unavailable and no public DB endpoint was
configured; no key, public proxy or TLS exception was added. Migration readiness
is supported by the exact deployment execution logs and successful live chat
queries/writes, not a claimed independent schema catalog/checksum query.

Runtime manifest still starts `npm run start:realtime`; its existing empty
config-file selector and `/app/property-media` mount were retained. Public
catalogue GET after rollout returned200/source database; the existing property
WebSocket returned101/ready. `AUTH_URL`, `NEXTAUTH_URL`, `AUTH_STAGING_ORIGIN`,
authentication secrets, database credentials and volume configuration were not
changed. No Railway backup was listed for the DB volume at this initial check.
The receipt rollout above subsequently created/listed a backup; restore testing
and scheduling remain operational gaps. No destructive DB operation or new
migration occurred during this earlier rollout.

### Actual acceptance evidence

| Check | Result |
| --- | --- |
| Disabled gate removed | Unauthenticated chat GET now401 `Sign in to continue.`, instead of503. |
| Real authenticated API trial | **27/27 checks PASS** with existing encrypted controlled USER, OWNER and unrelated BROKER fixtures. No new accounts. |
| Buyer message / Owner reply | Actual staging create/reopen, saved message, Owner inbox/read/reply and Buyer forward-cursor read all200. |
| Idempotency and persistence | Same client message ID returns same stored ID; one copy. Fresh authenticated session reads both saved messages. |
| Isolation and revocation | Unrelated account read/send404; anonymous read401; post-logout old cookie replay401. |
| Actual Buyer Android app | Corrected staging APK installed with `-r` preserving app data; existing Buyer logged in. Native Messages showed persisted messages, sent a new labelled message, and Owner API readback matched its SHA256. |
| Automatic incoming update | While the Buyer conversation stayed open, a labelled Owner API reply appeared without refresh/navigation; message hash matched. |
| Actual Owner Android app | Buyer UI signed out. Role-first OWNER sign-in opened Owner dashboard; More -> Messages showed the same thread and Buyer message. Owner sent a labelled native reply; a separate Buyer session read its matching hash and mine=false. |
| Actual Flutter traffic | Railway HTTP logs identify **two Dart/3.12 (dart:io) message POSTs, both200**, on the exact new deployment:09:52:07.303UTC and10:13:55.505UTC. Subsequent Dart GETs returned200 at approximately4-second intervals. |
| Cleanup | All temporary API sessions signed out. Buyer/Owner native sessions signed out; final app screen is unauthenticated Sign In, with no private chat visible. |

Used only existing controlled property `cmw32s2dt0003ox0xo3ydesx7`, already
PUBLISHED and owned by the controlled Owner. Conversation
`cmw3d31et0001pp0xogbrl8km` contains **five labelled authorized test messages**:
two API-only acceptance messages, one native Buyer send, its Owner API reply,
and one native Owner send. Duplicate/denied sends created no extra messages.
Normal session/quota/notification writes also occurred. No listing was created
or published; no contact sharing, credits, report or payment was changed/tested.
Test records are retained; no cleanup deletion was authorized or performed.

Sanitized evidence under ignored `build/chat-verification/`:
`staging-before.json`, `staging-after.json`,
`staging-config-compliance-before.json`, `staging-database-target-guards.json`,
`staging-runtime-backups.json`, `staging-gate-after.json`,
`chat-acceptance-20261105T093052Z-b047953d.json`, `device-send.json`,
`device-owner-reply-latest.json`, `device-buyer-reply-visible.json`,
`device-owner-inbox-visible.json`, `device-owner-send.json`,
`device-owner-send-visible.json`, `owner-device-reply-readback.json`,
`staging-chat-http-metadata.json`, `staging-chat-posts.json`,
`device-cleanup.json`, `existing-services-after.json`,
`activation-acceptance-summary.json`, `buyer-chat-live-reply.png` and
`owner-chat-native-reply.png`. Credentials remained in the existing DPAPI store
or process memory; cookies, credentials and message bodies are absent from JSON
evidence. Android screenshots show only controlled labelled test conversation.
Use Railway/server timestamps for correlation: the host/device clock lagged by
approximately16 minutes.

Initial diagnostic helper stopped before messages because it incorrectly expected
profile.id; source confirms that endpoint intentionally omits it. Correcting the
helper yielded the full PASS. The first Owner UI snapshot was too early/offscreen
to confirm its send; no automatic retry was made. Server readback and later native
UI/hash confirmation proved exactly one saved message. Owner logout correctly
returns Sign In, rather than the role screen initially expected by the helper.
These observation corrections did not require application changes.

### Scope and rollback

This verifies a controlled staging **free-chat workflow** through actual Android
presentation and backend persistence, not every device/network/load condition.
Private chat still uses foreground HTTP polling (~4seconds); it has no private
WebSocket/background push, attachments or older-history browser. Read receipts
were absent during this initial check and were verified in the later rollout above.
Two roles were exercised sequentially on one emulator, with an authenticated API
peer for the automatic-update trial; two simultaneous physical devices were not
tested. Pair blocking/reporting, quotas and races have local tests but no live
stress/abuse trial. Paid plans/contact-credit spending remain runtime unverified
and checkout stays off. Production rollout/backup recovery are separate work.

Safe rollback is to disable `HOMEZONE_ENGAGEMENT_ENABLED` on this same staging
backend and redeploy/restart its existing compatible artifact, preserving realtime
startup and the photo mount. Keep paid checkout false. Retain schema/migration
history, messages and financial records; no drop/reset or destructive downgrade.
The prior deployment ID is recorded above if an artifact rollback is needed.

Permanent source changes in this activation task: documentation updates only
(this file, integration status and remaining blockers). The existing seven-file
cursor correction working tree was preserved and uploaded, not committed/reset.
Ignored local CLI/verification helpers and evidence were added. Production was
not contacted, no secrets were rotated and no real charge was attempted.

## Historical chat verification before activation - 2026-11-05

Review baseline: `main/1b091c0fdbb68030f5b14927322f61bcd140a603`; clean checkout
before this follow-up. Source corrections are not deployed by this check.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Staging chat availability | BLOCKED | Unauthenticated GET `/api/mobile/conversations` returned HTTP503 and `Chat and contact plans are not available yet.`; server Date 2026-11-05 09:16:14 UTC. Matches the fail-closed `HOMEZONE_ENGAGEMENT_ENABLED !== "true"` branch before authentication. |
| New membership route responds | VERIFIED HTTP boundary only | GET `/api/mobile/membership` returned401 Unauthorized without cookies. This proves neither entitlement/database access nor the exact deployed SHA. |
| Deployment/migration identity | UNKNOWN | Neither public response establishes an active deployment ID/SHA or whether `20261105120000_buyer_membership_chat` was applied. No DB inspection/CLI deployment/variable read was performed. |
| Backend send/reply and isolation | LOCAL VERIFIED | 19 synthetic handler/service tests and full TypeScript check passed. Buyer starts, sends, Owner reads/replies, Buyer reads reply; foreign read/send/block/report denied. |
| Flutter navigation/send/reply and session safety | LOCAL VERIFIED | 16 focused widget/contract tests passed; Dart analysis found no issues. Includes Buyer property action, inbox/reply projections, cursor invariant, idempotent retry, polling lifecycle and revoked-session clearing. |
| Corrected backend / Android packaging | COMPILED | Isolated Next.js build passed; explicit staging debug APK compiled. Neither build was deployed, installed or launched. |
| Real two-account delivery | NOT VERIFIED | No live messages, login sessions, account creation or database writes were performed. |

Read-only HTTP evidence: ignored `build/chat-verification/staging-readiness.json`.
It records both local observation time and server Date; the local clock lagged
the server, so use the server timestamp for deployment-log correlation. Redirects
were not followed, cookies were not sent or logged, and only the approved staging
host was contacted. Current HTTP503 is an activation gate, not evidence that the
database is broken or that the migration is absent.

The review found and corrected a backend cursor race: PostgreSQL `now()` is the
transaction-start timestamp. A send waiting on a lock could commit after another
send while receiving an earlier timestamp, falling behind a cursor already read.
`src/lib/engagement/conversations.ts` now selects the latest message timestamp
under the existing conversation lock and assigns `max(Date.now(), latest+1ms)`
to the new message and inbox update. No schema or existing record rewrite is
needed. The backward-clock regression failed before the fix and passes afterward.

Flutter `lib/features/engagement/engagement_screens.dart` also no longer derives
the read cursor from a locally acknowledged sent message after an empty read.
Only a server history-read cursor can establish that earlier messages were read.
Its deterministic regression failed before correction and passes afterward.
The existing serialized cookie transport mitigates overlapping wire requests;
this correction enforces the invariant rather than claiming a live observed
missing-message incident. No auth, session, permission or schema behavior changed.

Staging activation still requires separate approval to verify target/recoverability
and pending migrations, apply the approved set, deploy the corrected source,
enable `HOMEZONE_ENGAGEMENT_ENABLED` and exchange labelled test messages between
two approved existing accounts. Keep Plus checkout disabled for this chat trial.
Migration, settings/deployment and test-message/session writes are separate from
the read-only HTTP/local-fixture checks performed here.

Corrected APK: `build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes,
SHA-256 `ed31aba9b1d14b17e9c158446415c53a58e6e220bcd4b82e07b98fc1f9e3a87d`;
record `build/android-source-builds/2026-11-05T09-06-43-994Z-36712/build-record.json`.
Verified record/hash targets `https://homezone-staging.up.railway.app`, service
mode. No new migration is needed for the two cursor corrections; the original
chat schema migration still requires its staging status and deployment approval.

Follow-up changed files: this document, `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`,
`HOMEZONE_REMAINING_BLOCKERS.md`, `src/lib/engagement/conversations.ts`,
`tests/engagement.test.mjs`, `lib/features/engagement/engagement_screens.dart`
and `test/engagement_test.dart`. No environment, auth or permission code changed.

## Product implemented in this slice

| Experience | Price / allowance | Behavior |
| --- | --- | --- |
| Free | INR0, no subscription expiry | Existing browsing, saving and publishing remain unchanged. Buyers start property conversations; listing owners reply without paying. |
| HomeZone Plus | INR299, 30 days, 10 unique listing-owner contacts | Only a captured, correctly priced payment grants access. The owner must explicitly agree to share a separate contact number. |

Renewal is manual, not recurring. A new owner costs one credit, independently of
the number of that owner's listings. Reopening an already unlocked owner costs
no new credit, but still requires an active paid plan, a currently published
property, current ownership, current sharing permission and no participant block.
Contacts are not a guarantee of ownership, availability, response, visit or sale.
Phone syntax is normalized; this does not prove ownership of the number.

Pro and sponsored/Boost plans are not added in this slice. Existing listing and
service payment products retain their previous prices and workflows. No fake
subscription, automatic trial, sample message or free-credit grant is created.

## Flutter entry points

- Property details: **Chat with Owner** and **View Owner's Number**.
- Buyer account menu and workspace More: **Messages** and **Membership & contact credits**.
- Owner/Broker/Builder profile: **Manage contact sharing**.
- Membership shows Free and Plus, actual allowance/expiry where present, and an
  honestly disabled purchase button: **Purchases unavailable in this build**.
- Existing fictional buyer preview remains separate and receives no real account
  entitlement. Existing API client, Auth.js cookie/session coordinator, secure
  session storage, profile gate and role routing are reused.

Contact GET is an inspection only. If a new contact is eligible, the UI explicitly
asks for confirmation before POST consumes a credit. Contact numbers are not
included in public catalogue/detail projections. The sharing number is independent
of `Profile.phone`, email and the mobile PIN login identity. Sharing is off by
default. Enabling it requires an explicit checkbox; turning it off prevents future
disclosure, including previously unlocked contacts. It cannot retract a number
someone already saw or copied. Users can voluntarily share information in chat;
this implementation does not claim to prevent that.

## API contracts

All routes below use the existing Auth.js session and fresh database profile.
Responses are private/no-store. No request accepts a client-supplied price,
credit count, participant identity, owner identity or role assignment.

| Route | Request | Response / purpose |
| --- | --- | --- |
| GET `/api/mobile/membership` | None | `plan`, `eligible`, `active` allowance/expiry or null, `mobileCheckoutAvailable:false`, `checkoutNotice`. Does not create a profile/payment. |
| GET `/api/mobile/contact-preferences` | None | `phone`, `sharingEnabled`, `consentVersion`; private to the current account. |
| PATCH same | `phone`, `sharingEnabled`, `consentAccepted` | Validated saved preference. Only OWNER/BROKER/BUILDER can enable sharing. Consent marker is exactly `owner-contact-v1`. |
| GET `/api/mobile/properties/[id]/contact` | None | `status`: available, plan_required, limit_reached, unavailable or self; optional phone, alreadyUnlocked, remaining. No credit spent. |
| POST same | No body | Explicit unlock; same status union. Transactionally spends one credit and creates the unique buyer/owner ledger record. |
| GET `/api/mobile/conversations` | None | `conversations`: at most 100 participant-scoped property summaries. No phone or message text in inbox summaries. |
| POST same | `propertyId` | `conversation`; only USER buyers initiate to a published property's current OWNER/BROKER/BUILDER. |
| GET `/api/mobile/conversations/[id]/messages` | Optional `after`; optional unique comma-separated `receiptIds`, at most 50 own message IDs | `messages` including nullable deliveredAt/readAt, `nextCursor`, `hasMore`, `blocked`, `blockedByMe`, `propertyTitle`, `receiptsSupported:true`, `receipts`. Receipt snapshots refresh independently of history cursor. First read is latest 50 in chronological order; cursor reads page forward. |
| POST same | `body`, `clientMessageId` | Persisted `message`; body 1-2000 characters. Same sender/conversation/client ID + same body is idempotent; changed body with reused ID is rejected. |
| POST `/api/mobile/conversations/[id]/receipts` | `deliveredIds`, `readIds`; unique arrays, nonempty union of at most 50 peer message IDs | Server-generated first delivery/read timestamps; read implies delivery. Recipient-only, transactional, idempotent. GET never acknowledges. |
| PATCH `/api/mobile/conversations/[id]` | `blocked` | Updates only the caller's pair-wide block; blocks also prevent paid contact disclosure across the pair's properties. |
| POST same | `reason`, 3-500 characters | Idempotent report marker and entry in existing protected `/admin/reports` queue. |

Only conversation participants can read/send/report/block. Fresh role,
suspension, property publication and ownership checks run before access.
Property transfer never transfers a private conversation to the new owner.
When a property is unavailable/unpublished, its conversation is unavailable;
the UI must not suggest its history is still readable. Persistent pair blocks
survive property/conversation deletion. Each person can undo only their own block.

Reports use existing `Report` records with a peer profile reference and bounded
reason, not automatic account sanctions. Admin review does not add a public
chat-reading endpoint. New-message notifications contain generic text and a
conversation reference, not message bodies or contact numbers.

## Private update transport and failure handling

Private chat uses authenticated HTTP, polling about every four seconds only
while the conversation/inbox is visible and the app is foreground. Existing
public property WebSocket traffic is unchanged and carries no chat/contact data.
There is no private WebSocket, background push, attachment or older-history
browser. Receipt status also refreshes over foreground HTTP. Inbox is bounded to 100; first view shows latest
50 messages, forward paging catches new messages, and Flutter retains at most 500.

Reads are single-flight, honor Retry-After, preserve confirmed content during
background refresh and show loading shimmer, empty or explicit error states.
Private state is bound to identity, role and session-cookie generation, and cleared
on account/session changes, including report drafts and revealed numbers.
An uncertain send is never automatically resent; explicit retry uses the same
client ID and body. No local optimistic message is presented as server success.

## Database and concurrency

Migration file: `prisma/migrations/20261105120000_buyer_membership_chat/migration.sql`.
It is additive and was applied on staging by the initial chat deployment. It adds:

- `PaymentProduct.BUYER_PLUS` and Subscription contactLimit/contactsUsed (existing
  subscriptions default to zero; the migration grants no premium access).
- `OwnerContactPreference`: explicit disclosure permission/number/version.
- `OwnerContactUnlock`: unique buyer/owner pair, subscription reference.
- `PropertyConversation`: unique property/buyer conversation and fixed owner.
- `ChatMessage`: unique conversation/sender/clientMessageId.
- `ConversationReport`: unique conversation/reporter.
- `BuyerOwnerBlock`: durable pair-wide two-way independent flags.

Receipt migration `prisma/migrations/20261105140000_chat_message_receipts/migration.sql`
was applied in the approved receipt deployment above. It adds nullable delivery/read
timestamps and a delivery-before-read CHECK; no historical receipt state is inferred.

Foreign keys, indexes and SQL CHECKs constrain allowances, consent, normalized
phone syntax, distinct participants and message/report lengths. The contact
ledger's subscription FK is RESTRICT: do not delete referenced financial history
as a cleanup shortcut. No phone snapshot is stored in that ledger.

Sorted Profile locks, then Property/Conversation or Subscription locks serialize
permission changes and writes. Unlock counter + ledger commit together; concurrent
retries cannot double-debit a pair. Valid overlapping plans use available credits
in expiry/ID order. Entitlement/payment changes commit together under a Payment
row lock. Controlled free-chat/receipt transactions passed on staging as recorded
above; synthetic tests and those trials do not establish PostgreSQL contention,
load performance or paid-credit concurrency behavior.

## Quotas and security

Reuse existing database-backed RegistrationBudget counters, atomic updates and
bounded cleanup (at most 50 expired rows/request), with isolated `engagement:v1:`
keys. Keys contain internal profile IDs, not phone/email/message text.

| Action | Per account |
| --- | --- |
| Inbox, messages, contact reads (separate buckets) | 60/minute each |
| Delivery/read acknowledgement (separate bucket) | 60/minute |
| Send message | 30/minute |
| Start conversation | 10/minute |
| Contact unlock | 20/minute |
| Update contact sharing | 10/minute |
| Block/unblock | 20/minute |
| Report | 10/hour |

Each action also has a global budget of max(1000, per-account-limit x100) in its
window. These are abuse controls, not unlimited-throughput commitments. Native
cookie requests remain supported; browser writes require the configured Origin
when present and reject cross-site fetches. Existing middleware, CSRF, HTTPS,
auth/revocation/suspension and public-role boundaries remain intact. JSON bodies
are bounded to 12KiB and strict schemas. Sanitized failure logs contain fixed
stage labels only, not exception objects, PINs, credentials, phones or messages.

## Billing and activation gates

Activation settings (nonsecret flags; no secret values are documented):

- `HOMEZONE_ENGAGEMENT_ENABLED`: literal true only after migration + deployment
  are approved and ready. Otherwise chat/contact routes return 503, not fake data.
- `HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED`: separate, default-off WEBSITE checkout
  gate; requires engagement enabled and all existing Razorpay keys.
- Existing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` must
  be correctly scoped/tested. Canonical `AUTH_URL`, `NEXTAUTH_URL`,
  `AUTH_STAGING_ORIGIN` must agree on the staging origin.

Server-priced website POST `/api/payments/checkout` accepts `product:BUYER_PLUS`
only for an active USER and exact canonical HTTPS browser Origin. It rejects
unrelated property/service fields, reserves durably per buyer, reuses one matching
pending order, and leaves ambiguous order outcomes for reconciliation instead of
creating another charge. Existing checkout process limits remain; the durable
reservation protects against distributed duplicate orders. No new payment SDK.

Client callback `/api/payments/verify` does NOT grant Plus. Only a valid signed
Razorpay captured webhook with matching stored order/payment/amount/currency
activates exactly one 30-day/10-contact subscription. Webhook input is bounded to
256KiB. Authenticated partial/full refund notifications revoke Plus fail closed;
late captures cannot restore a refunded plan. An unmapped concurrent refund gets
a retryable 503 so revocation is not acknowledged and lost. Chargeback/dispute
automation and unresolved-order reconciliation remain operational release gates.

**Native purchase is not implemented or activated.** Flutter always receives
`mobileCheckoutAvailable:false` and never calls a payment-creation endpoint for
this plan. Existing `MOBILE_WEB_PAYMENTS_ENABLED` is not authorization to sell this
digital feature through an external app checkout. Select distribution/payment
channel before implementing native purchase: private APK, Google Play and Apple
have different requirements. Store rules generally require their billing for
digital access, subject to specific exceptions/programs; confirm the applicable
path using [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
and [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/).
This source change claims no store approval or legal compliance.

Before paid activation also approve price/tax display, refund/support terms,
privacy/retention, invalid-contact review, dispute handling and provider test mode.
No automated contact replacement or refund execution is claimed. Owner sharing
permission is implemented; it is not a substitute for approved legal policy text.

## Historical initial activation procedure; paid verification still pending

1. Founder approves the exact staging project/environment/backend/database IDs,
   additive migration and recoverability plan. Reconcile the FULL pending migration
   set: `railway.json` predeploy runs `npm run db:migrate`, not just this migration.
2. After approval, apply the approved staging pending set using the existing
   deployment procedure and regenerated compatible Prisma client. This task did
   neither; no production operation is permitted.
3. Approve/deploy this source artifact preserving existing realtime start/volume
   settings. Keep both new flags off initially. Confirm startup/schema/routes.
4. Approve engagement activation and controlled two-account writes using existing
   authorized Buyer + Owner accounts and an approved published property. Verify
   private chat, idempotent retry, logout clearing, foreign-account denial,
   pair-wide block/unblock/report and owner's explicit contact opt-in/out.
5. Choose/implement the native billing channel separately. Approve provider/store
   sandbox transactions and credit-ledger writes. Test captured/duplicate/failed/
   delayed/refunded events, expiry, simultaneous unlocks and ownership changes.
   Do not charge a real user or seed an ACTIVE plan to pretend payment works.
6. Verify actual Android presentation and HTTP responses, not only widget fixtures.
   Collect sanitized status/timing/account-role and UI outcomes, never phones,
   message bodies, cookies, payment secrets or credentials.

No account creation, provider request, charge, DB access, Railway variable change,
deploy/restart or production access occurred during that initial source-only
implementation task. The approved staging activations and writes are recorded
at the top of this document; paid acceptance remains pending.

Rollback: disable the new checkout/engagement gates through separately approved
staging configuration change, then use the last compatible artifact. Preserve
new tables, messages, consent, credit/payment records and revocation history;
do not drop/reset them to roll back code. Reconcile pending/paid/refunded orders
before re-enabling. Plan how captured/refund webhooks remain processed during a
rollback; never remove the only revocation handler while paid plans remain active.
If a disclosure incident occurs, stop further disclosure; previously seen numbers
cannot be remotely erased. Production rollout is a separate approval.

## Local evidence

- Prisma schema-only diff and client generation succeeded against local files
  using a dummy unavailable loopback datasource; no schema introspection/migration.
- Full TypeScript check and Next.js production compilation passed, including
  lint/type validity, static page generation and the six new route paths. Build
  used a dummy unavailable database and disabled provider configuration; this is
  not live PostgreSQL/payment verification. An initial process-only build fixture
  used an invalid blank monitoring URL; correcting that synthetic URL allowed
  the build to finish. No environment file was changed for the build.
- Backend fixtures: 89/89 passed (engagement, Plus payments and existing payment,
  mobile API and session regressions); synthetic stores, not a live database.
- Flutter focused engagement: 12/12 passed; broader workspace/profile/catalogue/
  gallery/live-listing batch: 85/85 passed (includes an earlier 9 engagement cases).
  The two counts overlap and must not be added as distinct tests.
- Dart analysis for new engagement source/tests: no issues found.
- Explicit staging debug APK compiled, no install or launch. See current status
  document for hash/provenance and backend compilation result.

Reproduce new local fixtures: `npm run test:engagement` from repository root and
`flutter test --no-pub test/engagement_test.dart` from `mobile-app/`.
Build staging APK: `node scripts/build-android.mjs --mode service --config config/staging.local.json`.

## Changed source inventory

Backend: `src/lib/engagement/{http,blocks,contact,conversations,membership}.ts`,
`src/lib/payments/{buyer-plus-checkout,catalog,service}.ts`,
`src/lib/api/validation.ts`, `backend/api/payments/{checkout,verify,webhook}/route.ts`,
and mobile API routes for membership, contact-preferences, property `[id]/contact`,
conversations, conversation `[id]`, and `[id]/messages`.

Flutter: `lib/features/engagement/{engagement_repository,engagement_screens}.dart`,
`lib/features/marketplace/marketplace_screen.dart`, and
`lib/features/workspace/{workspace_screen,workspace_dashboard,workspace_profile_screen}.dart`.

Data/checks: `prisma/schema.prisma`, the migration above, `package.json`,
`tests/{engagement,buyer-plus-payments}.test.mjs`, `mobile-app/test/engagement_test.dart`.
Documentation: this file, `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md` and
`HOMEZONE_REMAINING_BLOCKERS.md`. No dependency was added.
