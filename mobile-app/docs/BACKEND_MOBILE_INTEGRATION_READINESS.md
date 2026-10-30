# Backend-mobile integration readiness

Audit date: 2026-10-30. Scope: current source/configuration and existing evidence
only. This document does not authorize execution of its verification plan.

## Executive status

**PARTIALLY IMPLEMENTED overall; not production-ready.** The public catalogue
connection is historically VERIFIED for one real Flutter request. Authentication,
nonempty listings/details, role restoration and native Android presentation are
not verified. No current service/database/device health was checked.

Classifications: VERIFIED means a specifically identified observation exists;
IMPLEMENTED — NOT VERIFIED means source exists without runtime proof;
PARTIALLY IMPLEMENTED means a confirmed gap remains; BLOCKED means an external
prerequisite/authorization prevents progress; NOT IMPLEMENTED means the supported
implementation is absent. Historical verification is not transferable to a newer
APK or different workflow.

## A. Connectivity and configuration

**IMPLEMENTED — NOT VERIFIED for the current checkout/artifact.**

- `lib/main.dart`: API mode defaults false. With API mode enabled, invalid
  configuration shows an error, not an offline/production fallback. Startup waits
  for credential restoration before authenticated routing.
- `config/staging.local.json`: true API enablement, staging environment, origin
  `https://homezone-staging.up.railway.app`, empty image/media hosts.
- `scripts/build-android.mjs`: service mode requires an explicit JSON config,
  validates it and passes encoded Dart defines to assembleDebug. The JSON is not
  automatically loaded at application runtime. Build record/provenance and the
  installed artifact must be checked again for future verification.
- `lib/core/api/api_configuration.dart`: origin-only base URL, explicit environment,
  HTTPS except development loopback, safe endpoint construction. Environment name
  alone is not independent proof of infrastructure isolation: this generic parser
  accepts a configured HTTPS origin. Preserve the approved staging JSON; confirm
  defines/provenance before every device run.
- `api_transport.dart`: same configured origin, allowed headers only, no automatic
  redirects, normal certificate verification, 10-second connection timeout.
  `api_client.dart`: default 20-second request deadline; distinguishes HTTP,
  unauthorized, timeout/network, malformed body and other failure categories.
- `marketplace_repository.dart`: only public catalogue/detail GETs bypass cookie
  admission without cookies or cookie commits, with generation checks. Protected
  calls require verified identity and coordinated cookie/session handling.

## B. Marketplace

**IMPLEMENTED — NOT VERIFIED**, except the historical empty catalogue below.

`src/lib/properties/mobile-catalog.ts` selects only PUBLISHED properties, stable
sort tie-breakers, page 1–1000/pageSize 1–24, take-one-extra hasMore. Mobile uses
pageSize 12 and revision/generation checks for stale pagination/filter responses.
Refresh, loading, empty and error states exist; no fake data is substituted.

`src/app/api/mobile/properties/[id]/route.ts` returns a public published projection
in `{property, source:"database"}`, 404 otherwise; private documents, owner contact
and review notes are excluded. `MarketplaceRepository.detail` checks source and
returned ID. Mapping includes all requested detail fields and accepts nullable
values and numeric Decimal strings. `LivePropertyScreen` loads by ID, retries,
renders category/amenities/coordinates and opens a zoomable scrollable gallery.
Current uncommitted detail corrections must remain in the reviewed build baseline.

`listing_media.dart` uses credential-free HTTPS image requests, exact hosts,
port 443, no credentials/fragments/redirect following, image MIME validation,
8 MiB cap and deadlines. Relative/invalid/disallowed URLs fall back.
`public_listing_media_button.dart` requires approved initial host and confirmation;
MainActivity repeats URL checks. External browser redirects after handoff are
provider/browser controlled, not continuously enforced by the app allowlist.
Empty staging lists intentionally prevent remote image loading and media handoff.
Do not interpret those fallbacks as a catalogue connection failure.

## C. Authentication

| Workflow | Classification | Evidence/limitations |
|---|---|---|
| Email registration | IMPLEMENTED — NOT VERIFIED | RegistrationScreen sends name/email/password to POST /api/auth/password/signup; strict server validation, existing scrypt hashing |
| Email OTP/resend | IMPLEMENTED — NOT VERIFIED | POST /signup/resend with challengeId; replacement challenge metadata, server cooldown and delivery configuration required |
| Email OTP verification | IMPLEMENTED — NOT VERIFIED | POST /signup/verify with challengeId/code; ten-minute TTL, five attempts, atomic consumption/account creation; no fake success |
| Password login | IMPLEMENTED — NOT VERIFIED | GET /api/auth/csrf, form POST /api/auth/callback/password, independently verified GET /api/auth/session |
| Persistence/restoration | IMPLEMENTED — NOT VERIFIED | Scoped platform vault, server session verification before identity, bounded storage operations |
| Logout/revocation/expiry | IMPLEMENTED — NOT VERIFIED | CSRF signout, AuthSession registry, local invalidation and secure-store clearing; failed remote revocation remains uncertain |
| Recovery/reset | PARTIALLY IMPLEMENTED | POST /api/auth/password/forgot and /reset exist, but AccountAccessScreen lacks fresh admission after locally-invalidated cookie boundary; automatic reset-link app handling absent |
| Phone registration | NOT IMPLEMENTED / BLOCKED | Existing phone OTP routes require authentication; sendOtpMessage reports delivery unavailable/provider_integration_pending |

Key sources: `lib/features/auth/sign_in_controller.dart`,
`lib/core/api/password_auth_protocol.dart`, `cookie_request_coordinator.dart`,
`session_vault.dart`, `features/marketplace/registration_screen.dart`,
`account_access_screen.dart`; backend `backend/auth.ts`,
`src/lib/auth/email-registration.ts`, `registration-admission.ts`,
`session-registry.ts` and password route handlers.

Registration admission now reopens an invalidated anonymous generation only via
the controller owner, refusing active authentication/restoration/logout. OTP
resend/verify do not reopen it. Protocol ownership, serialized cookie tickets,
generation checks, stale response rejection and bounded waits remain in source.
They require concurrency verification; source existence is not a race-proof claim.

## D. Roles/profile

**IMPLEMENTED — NOT VERIFIED.** Prisma Profile.role stores USER, OWNER, BROKER,
BUILDER, SERVICE_PROVIDER, ADMIN or SUPER_ADMIN. Mobile registration explicitly
creates USER, not a client-selected role. Offline RoleScreen choices are local
preview only. Auth.js reads Profile.role into the server session. Flutter uses
that verified identity; ProfileDashboardGate fetches GET
/api/mobile/account?view=profile before dashboard presentation and requires a
supported matching role and nonsuspended verification state. Unknown/missing or
mismatched data shows retry/sign-in feedback; nullable name/city/phone are not
new mandatory fields. USER uses marketplace, business roles existing workspaces,
admins existing website administration. Backend permissions remain authoritative.

The gate is a dashboard-entry check, not continuous authorization; existing
revalidation/protected handlers must still enforce subsequent changes. The profile
GET calls getOrCreateProfile and can create a missing default profile: future
authenticated verification is not guaranteed database-read-only merely because
the request method is GET. Use approved provisioned test accounts.

## E. Android

**BLOCKED for presentation verification; source startup IMPLEMENTED — NOT VERIFIED.**

MainActivity extends FlutterActivity, uses embedding v2 and calls the superclass
engine configuration. Main manifest enables INTERNET/hardware acceleration,
disables cleartext/backup and configures LaunchTheme/NormalTheme. Standard window
backgrounds are present in values/styles.xml. No source evidence identifies the
black-screen root cause. No permanent renderer override is justified here.
Startup provides a restoration loading frame, splash/onboarding and public
discovery. Earlier internal Flutter captures do not prove Android surface,
compositor or screenshot presentation. Emulator availability was not checked.

## F. Security findings and development priorities

1. **High readiness blocker:** recovery/reset can be locally rejected after logout
   or failed restore before HTTP. Correct via owned anonymous admission in a
   separately authorized source task, preserving verified-session boundaries.
2. **Phone flow remains blocked:** authenticated phone verifier reads before an
   unconditional consumedAt update; concurrent verification may reuse a challenge.
   Its limiter is process-local. Do not expose this as public registration or
   enable demo OTP as a substitute. Review before any future phone integration.
3. Secure storage is implemented with Android Keystore AES-GCM and iOS Keychain
   WhenUnlockedThisDeviceOnly, scoped by environment/origin. Storage failure may
   leave an otherwise valid session memory-only; restart and clear-failure behavior
   need actual verification. Local logout does not prove remote revocation.
4. Backend origin validation uses one explicit canonical origin; staging must be
   separate from both fixed production origins. Mobile password login retains
   Auth.js CSRF cookie/token binding. Native registration with no Origin is allowed
   by its contract; it is not a browser-origin bypass for privileged operations.
5. Unverified-email web accounts can authenticate under existing approved policy;
   authentication is not proof of email ownership. Mobile new accounts are created
   after OTP. No new role/team/organization associations are accepted by mobile signup.
6. Generic auth errors and sanitized client diagnostics avoid credential/body
   disclosure in inspected paths. This scoped review is not a repository-wide
   secret scan or security certification. Never save raw auth traces/logcat with
   cookies, passwords, emails, OTPs or tokens.
7. Published details/media, role/suspension enforcement, revoked sessions and
   cross-account isolation require evidence; none is inferred from migrations or
   a successful public request.

## Evidence already available

`STAGING_DEVICE_CONNECTION_EVIDENCE.md` records a real attached Flutter isolate
GET /api/mobile/properties?page=1&pageSize=12 at 2026-10-29T11:47:32.246Z,
approximately 805 ms, HTTP 200, source database, properties [], page 1,
hasMore false; request ID s5oMDMi9QV6PipMw5nX1uw. Discovery load was invoked through
the debugger after navigating, so this proves the real Flutter request path, not
ordinary visible tap-to-load operation. Internal render capture showed empty UI.
Railway log correlation was not performed. Android screencap remained black.

That document also records an earlier successful debug package build; the final
universal APK was not subsequently installed. It does not include all later
authentication/profile/media changes. Fresh source review/build provenance and
explicit execution approval are required; no artifact was inspected this audit.
Owner reports of all migrations applied/Next.js Ready remain historical reports,
not independently verified current schema completeness or service health.

## External prerequisites and authorization gates

- Owner privately verifies STAGING service/domain/repository/deployed commit,
  runtime and migration-runner database/schema identity; no production access.
- Owner confirms variable presence/compliance, never values in chat:
  DATABASE_URL, AUTH_SECRET, OTP_PEPPER, PASSWORD_SIGNIN_HMAC_KEY,
  RESEND_API_KEY, RESEND_FROM_EMAIL or EMAIL_FROM, STAGING_EMAIL_RECIPIENTS,
  AUTH_URL, NEXTAUTH_URL, AUTH_STAGING_ORIGIN, NEXT_PUBLIC_SITE_URL, NODE_ENV and
  disabled demo-login flags. Canonical auth URLs must agree with the approved
  staging origin; Railway-hosted staging may use NODE_ENV=production without
  becoming the production environment. Exact recipient/sender policy must pass.
- Device/emulator availability and Android presentation diagnostics authorized
  first. Separate approval for any fresh debug build, installation or launch.
- Approved staging accounts A/B and server-provisioned role fixtures; secrets
  supplied securely outside chat. Login/session/quotas themselves write server
  state, so approved auth execution must explicitly permit those scoped effects.
- Approved email recipient and explicit registration/OTP/resend/recovery delivery
  authorization. No real-user testing, mass requests or production recipients.
- Existing authorized published property and expected fields/media. If absent,
  obtain separate approval for supported website creation/review/publication;
  do not seed or insert records. Owner must approve exact media hosts and a later
  source/config build change before expecting images/browser links to work.

## Controlled staging verification sequence — NOT EXECUTED

For every step record reviewed commit, device/package/build provenance, staging
origin, UTC timestamp, sanitized outcome and evidence reference. Stop at unexpected
origin, identity, data mutation or security failure. Never export full auth bodies
or tokens. A blocked prerequisite is BLOCKED, not a pass. Execute in order only
after each required approval; do not clear app data to hide restoration failures.

| Step | Prerequisites and explicit authorization | Expected behavior and evidence | Pass/fail criterion |
|---|---|---|---|
| 1. Android display/startup | Available emulator/device; approved diagnostics and, if needed, build/install/launch using explicit staging defines | Actual visible onboarding/loading; normal Android screenshot plus foreground/package/build evidence | Pass only when Android presentation is visible; internal Flutter capture alone insufficient; black screen blocks UI verification |
| 2. Connectivity | Step 1; staging-only public read and sanitized Flutter profiling approval | Actual isolate GET to exact staging catalogue path; status/timestamp/request ID; owner correlates Railway log privately | Pass if actual Flutter response and staging destination attributable; unrelated browser/Node 200 fails attribution |
| 3. Empty catalogue | Authorized naturally empty filter/result; no data deletion | HTTP 200/database/empty array produces empty state, not error/mock rows; capture UI | Pass when empty response and rendered state agree; preserve existing data |
| 4. Published catalogue | Approved existing published fixture(s), paginated fixture set if available; public reads approved | Correct IDs/order/filter/refresh; hasMore and next page; unpublished records excluded | Pass only exercised cases; insufficient fixture coverage remains unverified |
| 5. Details | Approved published and unavailable fixture IDs; detail reads and any existing authenticated view-history side effect approved | Card opens matching ID; fields/null fallbacks and 404; detail retry after allowed network interruption | Pass if response ID, rendered fields and unavailable/error states agree; no stale detail |
| 6. Gallery/media | Exact hosts separately approved and included in reviewed build; public downloads/browser handoff authorized | Cover/additional photos, scroll/zoom; missing/disallowed URLs fallback; confirmation precedes external handoff | Pass for approved-media display and rejection cases; with empty lists verify fallback only, media loading remains blocked |
| 7. Email signup/OTP | Email configuration compliance; approved recipient; explicit account/challenge/quota writes and deliveries permitted | Start, resend after cooldown, invalid/expired/used code handling, actual verify; default USER account; sanitized timestamps/status only | Pass only real delivery/verification and independent sign-in/session confirmation; generic duplicate acknowledgment proves neither new account nor login |
| 8. Password login | Approved account and allowed failed-attempt quota writes; secure credential entry | Auth.js CSRF/callback/session chain; invalid credentials fail without plaintext storage/logging | Pass only server-confirmed correct identity and protected access; callback acknowledgment alone insufficient |
| 9. Restoration | Successful login; platform storage and app close/reopen authorized without data clearing | Session endpoint rechecks stored credentials, correct identity/role restored; storage failure reported safely | Pass if restart independently restores correct live session; local UI/cookie existence insufficient |
| 10. Logout | Approved test session and server revocation writes; subsequent protected check approved | Server signout acknowledgment, local clearing, protected rejection and no restoration on reopen | Pass only remote/local evidence agrees; local clearing alone leaves revocation unverified |
| 11. Profile/roles | Approved preprovisioned roles/status fixtures; existing profiles; auth state writes approved | Session/profile role match, right workspace, admin web direction; mismatch/suspension deny | Pass if no local promotion or repeated registration; any role/profile administration requires separate authorization |
| 12. Cross-account isolation | Approved A/B accounts and scoped fixture access; switch/login/logout authorized | No A saved data/profile/credentials visible as B; stale responses cannot publish identity or private data | Pass only both directions and pending-response case observed; no raw personal records retained |
| 13. Errors/recovery | Approved bounded network interruption, expired/revoked fixtures, recovery recipient/password-reset side effects; boundary fix first | Distinct timeout/network/HTTP errors, throttling honored, uncertain mutations not auto-retried, reset then secure login | Pass per exercised case only; revocation/expiry fixture setup, reset and email require separate permission, no clock/database manipulation |

## Remaining work and production assessment

Priority: establish Android presentation; separately correct/review recovery
admission; obtain private configuration/provenance evidence and fixtures; authorize
controlled stages above. Approve media hosts only when exact provider hosts are
known. Phone registration is a future supported-backend/provider project, not
part of completing email OTP. Additional registration roles need owner policy.

Production readiness is **BLOCKED**: no complete auth/role/security verification,
no nonempty detail/media evidence, unresolved Android presentation, unreviewed
release signing/distribution readiness, and no production database reconciliation
or deployment approval. Production is out of this verification plan.

## Audit activity and preserved state

Read-only Git status/diff and local source/document/configuration reads only;
no secret environment files read. Existing marketplace_screen.dart and
public_listing_media_button.dart modifications and untracked
PROPERTY_DETAILS_MEDIA.md were preserved. Only this new readiness document was
created. No tests, type checks, lint, builds, device operations, network requests,
database operations, environment/infrastructure changes, commits, pushes or
deployments occurred. Future commands/procedures here were not executed.
