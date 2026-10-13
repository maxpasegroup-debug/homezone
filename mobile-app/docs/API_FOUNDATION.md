# API foundation — Phases 5A and 5C

The approved UI still runs entirely in local-preview mode. No screen creates an
API client. No live sign-in, cookie jar, bearer tokens, credential persistence or
production requests are implemented. Staging infrastructure, Phase 4D database
integration and the native Auth.js session contract remain NOT VERIFIED.

## Configuration for future integration

`ApiConfiguration.fromBuild()` requires both `HOMEZONE_API_ENV` (development or
staging) and `HOMEZONE_API_BASE_URL` (an approved application origin, not an /api
path). Missing or invalid configuration throws a generic configuration error.
There is no default host. These public build parameters are not secret storage.

For explicitly local development, the future integration build can use:
`flutter run --dart-define=HOMEZONE_API_ENV=development --dart-define=HOMEZONE_API_BASE_URL=http://localhost:3000`
On Android emulators, explicitly use the host alias `http://10.0.2.2:3000` instead.
Non-local targets and all staging configurations require HTTPS. On a physical
device, localhost means that device; use an approved HTTPS development endpoint.

For staging, obtain the approved origin from the infrastructure owner and supply
it through `--dart-define=HOMEZONE_API_BASE_URL=<approved HTTPS origin>` together
with `--dart-define=HOMEZONE_API_ENV=staging`. No staging hostname is proposed here.
The origin must agree with the backend's AUTH_STAGING_ORIGIN/AUTH_URL settings.
These flags do not activate networking in the existing preview screens.

## Network boundaries

`lib/core/api` owns configuration, JSON handling, a shared injectable transport,
connection/request deadlines, redirect rejection and error classification. Native
transport uses Dart HttpClient, verified TLS, controlled optional cookie headers but no cookie jar,
and a 1 MiB response limit. No automatic retries, application logging, or exception
body/URL disclosure are implemented. Close the client when its owner is disposed.
Web transport is outside this native foundation's scope.

HTTP failures use safe categories. Raw backend errors/details are deliberately not
exposed to UI/logs; field-specific validation mapping awaits feature contract
verification. Retry-After delta seconds are exposed; HTTP-date values are not yet
interpreted. Features will own loading, offline/retry presentation and empty states.

## Future boundaries — documentation only, no live repositories

### Phase 5C transport and parsing additions

`ApiClient.exchange` returns the raw response without declaring authentication
success. Ordinary `request` retains its JSON/error behavior. Native transport is
now constructed with the same `ApiConfiguration` as the client and independently
rejects cross-origin destinations, Host/Authorization injection and header controls.
It still uses verified TLS, explicit deadlines, no redirect following and a 1 MiB cap.

Response headers are represented as lists, including each `Set-Cookie` separately.
Dart HttpHeaders exposes those repeated values; the native adapter snapshots them
without comma splitting. CookieInstruction preserves names, raw values, scope,
Secure/HttpOnly/SameSite, Expires, Max-Age and other attributes. Replacements are
ordered instructions, not an implemented store. Max-Age takes precedence over
Expires for deletion decisions. If an upstream proxy combines cookie headers into
one string, this layer does not attempt unsafe comma-based reconstruction.

AuthRequestOptions supports only controlled Accept/Content-Type/Cookie and
X-Auth-Return-Redirect headers on the configured origin. Credential options are
restricted to /api routes and the Auth.js redirect header to supported auth paths.
Form-urlencoded and JSON bodies can carry a caller-provided CSRF token. There is
no CSRF bootstrap, automatic cookie sending, cookie jar or persistent storage.

AuthResponseParser validates same-origin callback destinations, classifies known
error destinations, recognizes null sessions, validates session structure/expiry
and preserves cookie deletion metadata. HTTP 200 or a callback URL is NOT proof
of sign-in: a future repository must query the actual session endpoint afterward.
Parsers make no requests and do not expose raw errors or cookie values in exceptions.
Raw metadata remains sensitive; do not log it or display raw error URLs to users.

The future session manager must process cookie instructions from raw responses
before status/auth parsing, including error responses; enforce host/domain/path
and cookie prefixes; timestamp receipt for relative Max-Age; atomically replace
chunks; isolate staging/development stores; and persist only through approved
secure storage. Renewal/logout races and revocation failures need explicit lifecycle
handling. The in-memory lifecycle is implemented. Live UI wiring and persistent sessions remain absent.

Tests use synthetic responses and mocked transports, including header-gate and
response-size checks. Actual wire-level header delivery, upstream proxies, secure
persistence and staging session lifecycle remain unverified. Live authentication
and all existing preview screens remain disconnected from backend services.

| Component | Source-grounded contract and pending work |
| --- | --- |
| Authentication repository | Auth.js GET/POST /api/auth/[...nextauth] handles browser CSRF/session/sign-out. Password signup POST /api/auth/password/signup returns user data, not a mobile session. Native sign-in/renewal/logout contract is PENDING verification and approval; bearer support is not established. |
| Session controller | Future owner of session state, expiry, unauthorized transitions and approved credential transport. Browser JWT cookies are checked through the Phase 4D registry. Native persistence/renewal is MISSING; do not add cookies/storage until approved. |
| Profile repository | GET /api/profile returns {profile}; PATCH validates profile updates and authenticates through auth(). Exact mobile field/role/onboarding mapping is PENDING. Do not redefine backend roles locally. |
| Property repository | GET /api/properties parses marketplace filters and returns {properties}. Detail GET is not exported by backend/api/properties/[id]/route.ts (PATCH/DELETE exist). Verify actual website detail data flow, filters, pagination and saved-property contracts before replacing demos. |

Repository implementations must preserve existing backend workflows and authorization.
Do not invent detail, refresh or bearer endpoints. Keep the four demo listings and
local favorites until approved contracts are verified against isolated staging.

## Required gates

### Phase 5E parsing and response metadata hardening

Cookie parsing now preserves valid cookie names/values exactly, including valid
quoted values and percent-encoded octets. It rejects invalid cookie-octets (such
as literal commas, whitespace, backslashes or non-ASCII values), rather than
rewriting them. Expires commas remain intact; Set-Cookie is never comma-split.
Attribute names are case-insensitive. Duplicate attributes, assigned Secure/
HttpOnly flags, missing required attribute values and non-integer Max-Age fail
with sanitized errors. Max-Age overrides Expires. Supplied clocks make deletion
checks deterministic; parsing alone does not authorize storage or transmission.

AuthCookiePolicy recognizes only installed Auth.js session and CSRF names,
including numeric session chunks, with separate HTTP-development/HTTPS names.
Storage eligibility requires the exact origin, host-only scope, explicit Path=/,
HttpOnly and HTTPS Secure. Domain attributes are rejected. No chunks are combined.
Other parsed families, including callback-url, are not approved by this policy.

A deletion is a scoped instruction, never eligible for storage or transmission.
On the exact trusted origin it may omit Secure/HttpOnly, but must still identify
the expected name and host-only Path=/. An omitted Path uses the response request's
default directory: at /api/auth/signout that is /api/auth, not /. Such a deletion
cannot safely identify an existing Path=/ credential and is rejected, not widened.
An empty value without deletion/expiry metadata is not automatically a deletion.
The in-memory store now executes scoped deletion and atomic chunk-cohort changes.

ApiTransport.send now has an optional onHeaders observer. The native adapter
captures validated status and each repeated header before reading body bytes.
Its testable readBody helper retains metadata on UTF-8, size, stream and deadline
failures. ApiResponse reports bodyFailure separately. ApiException can carry
responseMetadata, whose string representation excludes header/credential values.
Raw metadata is sensitive and must remain private to future protocol handling.

ApiClient.exchange remains response-returning on completed readable responses and
throws sanitized exceptions with received metadata on body/redirect failures.
request and auth parsers preserve metadata on HTTP/JSON/schema failures. Callers
can inspect responseMetadata.toResponse() for independently parsed cookie
instructions and then apply AuthCookiePolicy with the trusted request URI/clock.
Exceptions never mean a deletion has already been executed.

Headers are available only if actually received before the caller deadline. The
client ignores late header notifications; connection failures or early cancellation
cannot supply nonexistent metadata. A proxy-combined Set-Cookie field is not
reconstructed. A malformed header batch can be rejected; parse individual fields
with CookieInstruction.parse when independently inspecting other instructions.
An injected/custom transport must implement onHeaders for the same early-header
guarantee; a transport that throws without reporting received headers cannot recover
them through this abstraction. Actual native/proxy wire behavior remains untested.
Secure persistence and live session integration remain absent; the in-memory store
and coordinator provide explicit cookie snapshots.

## Phase 5H security boundaries

Coordinated snapshots require both an unchanged store lifecycle and an active
originating request ticket. Completion, failure, timeout and generation changes
close that ticket. No mutex is held during network waits. Already-created options
and submitted server work cannot be retroactively cancelled.

Sequential CSRF, callback and session operations use separate coordinate calls.
Capture the workflow generation before starting and pass expectedGeneration on
every step to reject stale workflows after account or environment switching.
Nested coordination remains prohibited; inherited stale callback contexts are
also rejected.

A response permits at most one positive CSRF assignment, even if duplicates are
identical. Deletion followed by replacement and replacement followed by deletion
are ordered and supported; a second positive assignment is rejected. Any malformed
or rejected batch clears all volatile credentials under the existing fail-closed
policy, including CSRF and session state. Valid CSRF-only updates preserve the
session cohort and never establish authentication.

Session parsing requires a client-owned identity record for the configured origin
and environment. ApiClient.exchange creates this private record only on the new
response it returns for GET /api/auth/session without query or fragment. The parser
checks this record, the exact URI, status, schema, expiry and absence of Location
headers. Public URI labels, response JSON and headers cannot mint the record.
Copying or relabeling a response loses provenance, even if its body and cookies
look valid. The public provenance query can check a record but cannot create one.
Tests acquire provenance through mocked transport requests, not a parser bypass.
Custom transports remain trusted dependencies; a malicious transport is outside
this boundary. Callback or cookie presence does not prove sign-in.

Phase 5J tests use explicitly fake, populated session cookies. They verify local
request binding and lifecycle rejection, not Auth.js cryptographic validity.
Actual JWT verification, database registry checks, native/proxy cookie delivery,
renewal and server revocation still require isolated staging verification.

Auth options, response metadata and API exceptions provide redacted toJson
representations for JSON diagnostics. Raw protocol fields remain accessible for
transport/cookie handling and must never be manually dumped or crash-reported.
No secure persistence, network repository, screen integration or live authentication
has been added. Local logout is not proof of server revocation.

Infrastructure owner must confirm isolated PostgreSQL, no production data, approved
HTTPS host, separate secrets, migration/test-data authorization and safe test email.
Complete docs/STAGING_AUTH_VERIFICATION.md at repository root, including migration
replay/drift, concurrency/rollback, password changes, logout replay and browser tests.
Then approve a native session contract before connecting authentication. Release
identifiers, signing and Android release networking remain separate later work.
# Phase 5F: volatile cookie lifecycle foundation

`InMemoryCookieStore` accepts only the Phase 5E policy-approved Auth.js session
and CSRF families for its explicit environment and exact origin. It has no
persistence or authenticated-user state. Cookie values remain private except
at the explicit `CookieRequestSnapshot.requestOptions()` protocol adapter;
never pass those options to UI, diagnostics, crash reports or logs.

Each response supplies an independent session replacement cohort: either the
unchunked cookie or contiguous canonical chunks starting at `.0`. Old fragments
are never merged into a new cohort. Instructions are processed in field order;
old-cookie cleanup followed by replacement is supported. Duplicate positive
assignments, mixed forms, gaps, or deletion of a newly assigned fragment reject
the batch and clear credentials. A deletion-only response clears the entire
session cohort. Any expired chunk invalidates the whole cohort. Max-Age expiry
is measured from receipt using the injected clock. CSRF expiry is independent.
Unrelated valid cookies are ignored; malformed headers fail closed.

Contiguity cannot establish the expected chunk count or JWT validity. This rule
depends on Auth.js emitting its complete replacement cohort (as local source
does), and cannot detect a missing final chunk. Only a valid `/api/auth/session`
response can establish a future authenticated snapshot. No refresh endpoint is
introduced; server registry absolute expiry remains authoritative.

`CookieRequestCoordinator` serializes credential-bearing operations using a
single-flight asynchronous queue; public operations may bypass it. Snapshots
are immutable and acquired at dispatch, not admission. State commits are
synchronous; no mutex is held during network waits. Nested scheduling fails
instead of deadlocking. A bounded operation timeout releases a stalled queue
(default 30 seconds); it does not cancel the underlying operation. Each ticket
may commit response metadata once, including error/failed-body metadata, and
only for its exact request URL while active in the current lifecycle generation.

Logout immediately increments the generation, clears memory and closes new
credential snapshots. Account switching and environment changes also advance
the generation and reopen an empty boundary. Obsolete queued operations and
late responses cannot restore credentials. Old snapshots cannot create new
request options after a commit or clear. Already-materialized options and
requests in flight cannot be retroactively erased: future integration must
dispatch exclusively through the coordinator and never retain options.

Local invalidation is **not server-side logout or revocation**. No network
signout, durable pending logout, retry, persistent cookie jar or secure storage
is implemented. Injected sign-in uses the protocol described below; default
launch and buyer data remain offline previews. Secure persistence requires separate approval; actual
cookie renewal, database revocation and browser/native compatibility still
require isolated staging verification.


## Phase 5R password protocol harness

PasswordAuthProtocol orchestrates explicit CSRF bootstrap, form-encoded password callback and independent client-provenance session verification. It uses the existing client and coordinator; it is not instantiated by preview screens. It processes response cookies before parsing and received error metadata before propagating failures. Failed workflows locally invalidate their own generation without clearing a newer account. Concurrent calls on one harness are rejected; obsolete workflows cannot publish results. Callback success alone never establishes authentication. No automatic retries, signup, recovery, profile fetching, persistence or server logout are provided. Starting a new attempt clears prior local account cookies; this is not server revocation. Only injected mocks were used for tests; actual transport and backend lifecycle require authorized isolated verification.

## Phase 5T harness hardening

Before the password callback, the harness requires an applicable policy-approved CSRF cookie from the current snapshot. The installed Auth.js contract uses a 64-character lowercase hex token and SHA-256 hash separated by a pipe; percent encoding is decoded only for comparison, never rewriting stored cookie values. Token/cookie agreement and hash syntax are checked locally; only the server verifies the secret-bound hash. Missing, expired, deleted or inconsistent state aborts before credentials are submitted.

Successful harness results omit cookie instructions and provide redacted JSON diagnostics. API failures process response metadata internally, then strip it before propagation. Protocol parser metadata remains internal and must not be manually logged. Coordinator hasProtocolCookie exposes presence only for protocol checks, never authentication state or cookie values. Concurrency tests cover same-harness rejection, shared-coordinator supersession, intermediate error-cookie application and newer-generation preservation. No UI, persistence or server revocation was added.

## Phase 5V injectable sign-in UI

HomezoneApp accepts an optional SignInController; only injected configurations connect the existing sign-in screen to PasswordAuthProtocol. The controller returns a safe error message or verified success without exposing session/cookie metadata. Callback acceptance alone never navigates. Duplicate submission is disabled; successful verification opens the existing buyer demo route. Buyer listings/profile remain demo data, and preview sign-out does not revoke the in-memory backend session. Signup/recovery/social screens remain local previews. main.dart supplies no controller or native client, so the ordinary launch reports sign-in not configured and sends no requests. No live target, persistence or server logout is activated. A later authorized composition phase must configure client ownership and session/logout behavior before live use.

## Phase 5X app-owned volatile state

HomezoneApp owns the injected final SignInController for its lifetime and disposes it (including its exclusively owned API client) on replacement/unmount. Do not share one client/controller across app roots. No controller is created by sign-in widgets; default main.dart remains offline. The controller stores only the verified user id, role, server-provided absolute expiry and coordinator generation. SessionScope exposes this safe state across routes. Expiry and coordinator lifecycle invalidation clear identity; state never survives app restart. No cookie or CSRF value is copied into widget state.

SignInOutcome has private constructors and explicit verified/failure signaling. Only the final protocol-backed controller can publish success. Each widget retains its own operation cancellation handle; disposal cancels pending authority only if its generation is still current. Completed handles cannot clear successful or newer sessions. Requests already accepted by the server cannot be undone; cancellation and local exit never claim server revocation.

The existing buyer route remains a demo, never an authorization guard. Verified entry records state before navigation; explicit preview entry clears local verified access. Profile distinguishes verified in-memory sign-in from demo data. Leave verified access clears local state/cookies and returns to sign-in; preview sign-out retains its disclosure. Protected APIs must still enforce server authorization. Signup, recovery, real profile data, persistence and server logout remain absent.

## Phase 5Z owner-scoped clearing

clearLocalSession checks the controller's owned generation at mutation time. Only the current owner may invalidate the coordinator and its cookies; an obsolete undisposed owner drops only its own stale identity. Cancellation, timer expiry and local profile exit use this scoped operation. Coordinator.invalidateForLogout remains the explicit app/protocol-wide boundary, not a widget shortcut. No new global invalidation call sites were introduced.

SignInController accepts an optional clock for deterministic expiry checks; expiry still comes from independently verified server data. Tests advance a controllable clock and Flutter fake timers without wall-clock sleeps. Covered cases include explicit obsolete-owner clearing, exact-expiry reads before timer processing, old timer isolation, bootstrap/callback disposal and late completion after newer success. These checks do not establish current server validity or server revocation; no live services or persistence were added.

## Phase 5AB exclusive protocol ownership

Each API client can belong to only one PasswordAuthProtocol, and each protocol
can be claimed by only one SignInController. Claims are synchronous, permanent
for that resource lifetime and never transferred after disposal. A second
controller, a second protocol using the same client, or a controller trying to
claim a busy standalone protocol fails closed: it receives a safe failure and
has no lifecycle listener, generation, clearing or disposal authority. Separate
clients/protocols may still share a coordinator for generation-scoped supersession.

Admission checks the private controller identity before clearing prior account
state or starting I/O. It returns an immutable attempt with its admitted
generation; controllers never infer ownership from the coordinator after a
rejection. Direct standalone signIn calls are allowed only on unclaimed
protocols. After controller ownership is established they cannot bypass it.
Only the claiming controller can close its protocol's client. Application
composition must not directly close resources owned by another controller;
these checks enforce controller sharing boundaries, not isolation from arbitrary
trusted Dart code holding a client or coordinator reference.

Mocked tests hold an active request while a rejected controller clears and
disposes, then complete independent session verification. Cancellation still
invalidates local authority only; it cannot undo server-side work. No persistence,
server logout, live configuration or staging verification is introduced.

## Phase 5AD reentrant admission

Coordinator transitions commit boundary, cookie clearing and any environment
replacement before notifying synchronous lifecycle listeners. beginAccountSwitch
returns its own minted generation, captured before notification; it never returns
a nested transition's generation. No outer transition writes state after listeners,
so nested logout or environment changes cannot be undone by the outer operation.

Protocol admission uses that returned generation and verifies it is still current
and ready after listeners return. A superseded admission fails before network
dispatch and before returning an attempt to its controller. Its busy flag is
released without clearing newer credentials. Nested admission on a different
legitimate protocol may win; admission on the already-busy protocol still fails
without a transition. Mocked tests dynamically re-enter admission through a
controller listener, then verify the winning identity, generation and exact
synthetic session cookie survive outer-owner clearing and disposal.

## Phase 5AF lifecycle exception policy

Transitions still commit all state before notifications and use a captured
listener snapshot. Each synchronous listener failure is isolated so later captured
listeners run. Additions participate in later dispatches; removals do not cancel
callbacks already captured. Failures are reported after notification through
FlutterError using only a fixed failure category and an empty stack. Original
errors, callback identities, credentials and protocol metadata are never reported.
If a custom FlutterError handler throws, a non-sensitive reporter-failure counter
records that failure without interrupting invalidation. Diagnostics never restore
state or change generation ownership.

Controller disposal marks the owner disposed and drops identity before callbacks.
Each timer/listener/invalidation/client/framework cleanup step is independently
attempted; failures produce the same sanitized diagnostics rather than skipping
later steps. Repeated disposal does not retry closing resources. This guarantees
cleanup attempts, not successful recovery from an arbitrary failing transport.
No persistence, server logout or live environment integration is introduced.

## Phase 5AH bounded diagnostic reporting

LifecycleDiagnostics guards synchronous reporting at its entry boundary. A nested
report returns immediately without invoking FlutterError again; the outer guard
is released in finally even if the handler throws. Later independent reports
remain enabled. Original exception text and stacks are still excluded.

reporterFailures counts thrown diagnostic-handler calls; suppressedReports counts
reentrant reports. Both process-local, non-sensitive counters saturate at 65,535
and never emit further reports. Saturation limits count precision, not delivery
of independent reports. Only fixed categories and an empty stack reach the
existing FlutterError handler. This does not prevent unrelated trusted code from
changing that global handler or scheduling new asynchronous work outside reporting.
