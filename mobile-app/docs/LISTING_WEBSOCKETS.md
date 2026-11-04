# Listing WebSockets

Date: 2026-11-04; work began 2026-11-03. Source baseline:
`main/37e91ea07590bf781d54a751ccb9f6b4ded11c33`.

Status: implemented in source with local fixture verification. No live WebSocket
connection to Railway, deployment, account/property mutation or infrastructure
change is claimed by this work. Earlier successful Owner-to-Buyer acceptance
used foreground HTTP polling; it does not verify this new transport.

## Data flow

1. Existing authorized property mutation validates the actor, ownership, status
   and four-photo publication rule, then updates the record in a transaction.
2. With `HOMEZONE_REALTIME_ENABLED=true`, a mutation involving a previously or
   subsequently PUBLISHED property executes parameterized `pg_notify` in that
   same transaction. PostgreSQL delivers it only after commit; rollback delivers
   nothing. Private draft creation and draft uploads send no public notification.
3. Each custom-server replica maintains one dedicated PostgreSQL LISTEN session
   on `homezone_public_properties_v1`. This shares hints across replicas using
   the existing database; it does not rely on an in-memory broker or sticky routing.
4. The server coalesces hints and sends `{"v":1,"type":"properties.changed"}` to
   connected clients. On a subscribed connection it sends `{"v":1,"type":"ready"}`.
5. Flutter discovery, property detail and gallery screens use the existing
   repository/API client to fetch fresh data. Website property catalogue/detail
   and the server-confirmed USER dashboard refresh their existing server queries.
   Filters, pagination, photo host restrictions and authorization remain in force.

The WebSocket address for staging is:

```text
wss://homezone-staging.up.railway.app/api/mobile/properties/live
```

This is an HTTP Upgrade endpoint handled by `server.mjs`, not a second REST API
or a Socket.IO endpoint. An ordinary GET/404 does not establish whether a WebSocket
upgrade succeeds. The configured API origin must remain origin-only, without `/api`.

## Publication, photographs and access

Hooks cover property create/edit/delete, gallery changes, mobile photo attachment
and existing administrator publication/verification routes. A published listing
being removed or made private also triggers a fresh public read. Engagement
counters do not trigger notifications, avoiding read/view feedback loops. Payment
entitlement changes still converge through periodic HTTP refreshes.

The signal includes no property/account IDs, names, location, email, credentials,
photos or record bodies. Private data remains behind the existing authorized HTTP
APIs. The socket is public, receive-only and never accepts listing mutations,
subscriptions or authentication payloads. Browser cookies that accompany the
upgrade are ignored; native Flutter sends no credentials or cookies on this socket.
No new login/session/role logic is introduced.

## Reconnection and fallback

Flutter shares one connection per repository, only while a listing view is visible
and foreground. It closes on background/covered routes, reconnects with bounded
backoff/jitter and rejects redirects away from its exact configured endpoint.
HTTPS origins become WSS; only existing development-loopback configuration may
use WS. Certificate validation is unchanged. The fictional preview does not
create the service repository or connect.

Both clients reject unexpected, oversized or malformed protocol messages and
debounce valid hints. `ready` triggers a fresh read to recover changes missed
while offline. Flutter keeps existing generation/revision/session checks,
single-flight refreshes and server Retry-After deadlines. Website refreshes are
capped at one per second, preserve the current URL and pause while hidden.

Normal HTTP resynchronization remains: about 30 seconds with a ready socket,
about five seconds when unavailable. Existing Flutter HTTP failure backoff may
extend those intervals. LISTEN/NOTIFY is not durable delivery; missed events,
disconnections, app backgrounding and browser suspension must recover by rereading.
No exact delivery latency or uninterrupted connectivity is guaranteed.

## Backend runtime and configuration

`npm start` and `railway.json` are deliberately unchanged. They keep the current
Next CLI server. `railway.staging-realtime.json` is an unselected, staging-only
release template with the same build/predeploy/restart settings and the new
start command; merely adding this file does not change the running service.
The opt-in command is:

```text
npm run start:realtime
```

It runs a production Next custom HTTP server and accepts upgrades on the same
Railway PORT. It loads the usual Next production env files, with injected Railway
variables taking precedence. A single upgrade router prevents Next 15's lazy
upgrade registration from consuming a socket already handled by this gateway.
Unknown upgrade paths retain Next's existing handler.

| Requirement | Expected state before approved staging activation |
| --- | --- |
| `HOMEZONE_REALTIME_ENABLED` | Literal `true` for server and transactional notification hooks. Missing/other values disable this feature. |
| `DATABASE_URL` | Existing staging PostgreSQL connection, explicitly containing host, database and credentials; direct or session-pooled. Never expose its value. |
| `AUTH_URL`, `NEXTAUTH_URL`, `AUTH_STAGING_ORIGIN` | Existing canonical-origin rules; for this staging target use the same approved staging HTTPS origin. No forwarded-host inference. |
| `PORT` | Railway-injected listen port; default 3000 locally; integer 1–65535. |
| Runtime | Matching lockfile installation, built Next application, new `server.mjs`, `realtime/` modules and shared canonical-origin helper. |

LISTEN requires a persistent session. Known transaction/statement-pooler URL
options fail closed; an unlabelled pooler cannot be detected from source alone.
Confirm the effective connection topology privately before activation. Each
replica uses one extra PostgreSQL connection. No new table or migration is needed;
no Redis service, pepper, API key or secret is added.

Optional integer limits (defaults):

| Variable | Default | Allowed range |
| --- | --- | --- |
| `HOMEZONE_REALTIME_MAX_CONNECTIONS` | 2000 | 1–20000 |
| `HOMEZONE_REALTIME_MAX_CONNECTIONS_PER_IP` | 250 | 1–1000 |
| `HOMEZONE_REALTIME_HANDSHAKES_PER_MINUTE` | 300 | 1–1000 |

Limits use the actual socket peer address. Railway proxies may group many users
under one peer: confirm topology and capacity before rollout. Arbitrary forwarded
IP headers are not trusted. Handshake tracking is bounded/expired. These limits
are per replica, not a distributed authentication or account quota.

Other bounds: receive-only application messages, 256-byte inbound payload,
compression disabled, 64 KiB buffered-send threshold, 30-second ping and
15-second pong deadline. Browser upgrades require the canonical Origin; missing
Origin is allowed only for native-style requests without browser fetch headers.
Cross-site Origin/fetch metadata, query strings, Authorization and subprotocol
requests are rejected. Failure diagnostics contain fixed stage names only.

With the flag enabled, notification SQL failure rolls back the property write,
so the API does not acknowledge a commit that skipped its notification. Listener
outages independently close sockets and retry, while HTTP remains usable. Port
bind failure stops startup; shutdown closes sockets, listeners and HTTP/Next.

The Next custom-server path has different optimization characteristics from
`next start`, and is incompatible with standalone output packaging. This project
does not currently use standalone output. Keep this opt-in and validate the real
staging artifact before rollout. References: [Next custom server](https://nextjs.org/docs/app/guides/custom-server),
[PostgreSQL LISTEN](https://www.postgresql.org/docs/current/sql-listen.html),
[PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html),
[Railway replicas](https://docs.railway.com/deployments/scaling).

## Local checks and files

Run backend tests separately through the script so their injected module hooks
do not contaminate other fixture files:

```text
npm run typecheck
npm run test:realtime
```

The realtime script covers the gateway/PG listener using fake PostgreSQL and
ephemeral loopback sockets; real route transactions using fixtures; and the web
listener using a virtual clock/socket. Flutter tests inject sockets/transport and
cover shared leases, events, reconnect, lifecycle, stale requests and native
redirect rejection. These local checks do not connect to Railway or PostgreSQL.
Recorded final results are in the integration status document.

Source: `server.mjs`, `realtime/*.mjs`, `railway.staging-realtime.json`,
`src/lib/properties/realtime.ts`, existing
property/admin/mobile upload mutations, `src/lib/auth/canonical-origin.mjs` and
`redirect.ts` re-export, website `PropertyLiveRefresh`/`public-live-refresh.ts` and
three page mounts; Flutter `listing_realtime.dart`, marketplace repository/screen
and `main.dart`; package manifests and focused tests. Canonical-origin extraction
preserves the existing authentication-origin validation without duplicating it.

Final local evidence: 41 realtime backend/web tests, 31 existing Owner/admin
publication-photo checks, 22 canonical authentication checks, 20 session-security
checks and 41 registration checks passed. TypeScript checking and direct runtime
JavaScript syntax checks passed. The final five-file Flutter test run passed all
80 tests, including no-network implicit HTTPS443/development80 port regressions
and an actual loopback upgrade/redirect rejection. Focused analysis reported zero
errors/warnings and 15 existing informational lints (`--no-fatal-infos`, exit 0).
An actual runtime-module check caught the installed `@next/env` CommonJS export
shape; the loader now uses its default import and has real-module/empty-tempdir
regression coverage with sanitized logging. No repository env file is read by
that fixture. No Next application or PostgreSQL client is initialized by it.
These results do not establish live PostgreSQL notifications, a production Next
server artifact, Android presentation or Railway WSS delivery.

The updated staging debug APK build passed using the existing explicit config
workflow. Artifact: `mobile-app/build/app/outputs/apk/debug/app-debug.apk`;
184939163 bytes; SHA256
`ea60d7dc18ef7e430112f6420c4544a288894f6fefb6d8865b946553a2171026`.
Build provenance:
`mobile-app/build/android-source-builds/2026-11-04T02-43-22-860Z-27896/build-record.json`.
That directory also preserves the previous APK as `previous-app-debug.apk`.
The record confirms staging origin, service mode and a freshly written artifact;
runtimeVerified/liveServiceVerified are both false. No APK installation/launch
or device-to-staging WebSocket test was performed.

## Exact changed files

| Purpose | Files |
| --- | --- |
| Optional server, broker and upgrade ownership | `server.mjs`; `realtime/protocol.mjs`; `realtime/database-listener.mjs`; `realtime/websocket-server.mjs`; `realtime/http-upgrade-router.mjs`; `realtime/environment-loader.mjs` |
| Existing canonical-origin validation shared with Node | `src/lib/auth/canonical-origin.mjs`; `src/lib/auth/canonical-origin.d.mts`; `src/lib/auth/redirect.ts` |
| Transaction notification helper | `src/lib/properties/realtime.ts` |
| Existing authorized write hooks | `backend/api/properties/route.ts`; `backend/api/properties/[id]/route.ts`; `backend/api/properties/[id]/media/route.ts`; `backend/api/admin/properties/[id]/moderate/route.ts`; `backend/api/admin/properties/[id]/verify/route.ts`; `src/app/api/mobile/upload/route.ts` |
| Website subscription and mounts | `src/lib/properties/public-live-refresh.ts`; `src/components/properties/property-live-refresh.tsx`; `src/app/properties/page.tsx`; `src/app/properties/[id]/page.tsx`; `src/app/dashboard/page.tsx` |
| Flutter connection, invalidation and lifecycle | `mobile-app/lib/features/marketplace/listing_realtime.dart`; `mobile-app/lib/features/marketplace/marketplace_repository.dart`; `mobile-app/lib/features/marketplace/marketplace_screen.dart`; `mobile-app/lib/main.dart` |
| New and extended regression coverage | `tests/property-realtime-server.test.mjs`; `tests/property-realtime-writes.test.mjs`; `tests/property-realtime-web.test.mjs`; `mobile-app/test/listing_realtime_test.dart`; `mobile-app/test/listing_live_refresh_test.dart` |
| Dependencies, local commands and unselected staging template | `package.json`; `package-lock.json`; `railway.staging-realtime.json` |
| Documentation | This file; `mobile-app/docs/HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`; `mobile-app/docs/HOMEZONE_REMAINING_BLOCKERS.md`; `mobile-app/docs/OWNER_DIRECT_PUBLICATION.md` |

## Approved staging activation sequence — not executed

1. Confirm the exact staging service/domain/deployed SHA, direct PostgreSQL target,
   connection capacity and private canonical-origin compliance. Review current
   pending migrations and recoverability: existing Railway predeploy executes
   `npm run db:migrate` for all pending migrations, even though this change adds none.
2. Review this source/artifact and approve the exact staging-only release. Include
   the existing four-photo client/backend compatibility gate and upload-provider
   requirements; WebSockets do not provision image storage or change publication.
3. After separate approval, set only staging `HOMEZONE_REALTIME_ENABLED=true`.
   In that staging backend service's Settings, select the custom config path
   `/railway.staging-realtime.json` (confirm the repository/root directory), then
   deploy the reviewed artifact. Confirm deployment details show
   `npm run start:realtime`; a dashboard command alone cannot override the current
   `railway.json` value. Do not select this template for production. Variable or
   config-path changes may restart or deploy the service. Railway documents that
   code configuration overrides dashboard settings and supports custom file paths;
   it currently also marks legacy config-as-code for retirement on 2026-12-01,
   so confirm the applicable mechanism when activating this existing service.
   Any required infrastructure-config migration is a separate approved action.
   See [Railway configuration](https://docs.railway.com/config-as-code).
4. Confirm sanitized `server_started` and `listener_ready`, then a WSS upgrade/101
   and `ready` from the staging host. A successful HTTP catalogue read alone is
   insufficient. Verify reconnect and fallback without exposing cookies or data.
5. Build the matching client with existing staging configuration when requested:

   ```text
   cd /d C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app
   node scripts/build-android.mjs --mode service --config config/staging.local.json
   ```

   Install/launch only as authorized. Collect actual Android presentation and
   safe timestamps; do not rely only on an internal Flutter render capture.
6. With separate approval for one controlled property mutation, leave Buyer
   discovery open and publish an authorized Owner draft with four valid photos.
   Record transaction success, hint receipt, ensuing HTTP response and visible
   matching listing/photo. Repeat authorized edit/unpublish/reconnect checks.
   Do not create accounts, publish test records or send private data merely to
   claim realtime success.

## Rollback

Approve any staging rollback independently. Restore the service's previously
recorded config path (`/railway.json` for the current source) and verify the prior
start command (`npm start -- --hostname 0.0.0.0`); disable the feature flag on all
staging replicas, or restore a compatible prior artifact. New clients retain HTTP
fallback. No tables, records, photographs, session secrets or credentials should
be dropped/rotated to roll this feature back. Keep the four-photo-compatible
client/backend versions paired. Preserve evidence and any legitimately created
records; cleanup is a separate authorized mutation. Production is out of scope.
