# HOMEZONE integration implementation status

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
