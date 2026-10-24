# HOMEZONE - Staging registration readiness and authorization

Status: ON HOLD. This document is preparation, not authorization to deploy,
apply migrations, contact services, send messages or create accounts. No remote
state was inspected. Historical validation is distinguished from current checks.

Current infrastructure gate and corrected future test matrix:
[INFRASTRUCTURE_READINESS_GATE.md](INFRASTRUCTURE_READINESS_GATE.md).
That source-reviewed gate supersedes the historical readiness decisions and
obsolete resend expectations below; it does not grant remote authorization.

Further local hardening: [LOCAL_BLOCKERS_VALIDATION.md](LOCAL_BLOCKERS_VALIDATION.md).
authOrigin no longer falls back to production; explicit staging requires matching
canonical origins. Registration/reset Resend dispatch now requires a valid exact
STAGING_EMAIL_RECIPIENTS allowlist when AUTH_STAGING_ORIGIN is present. Earlier I2
and recipient statements below are historical. No infrastructure gate is approved.

## Subsequent local security fixes (supersedes R1-R5 below)

The findings and validation counts in this original review are historical.
[REGISTRATION_SECURITY_FIXES.md](REGISTRATION_SECURITY_FIXES.md) documents the
subsequent fixes: new-ID resend replacement with a fresh bounded attempt budget,
actual quota deadlines, authoritative expiry metadata, consistent client clocks,
and shared request admission before parsing/lookup. The old descriptions below
must not be used as the current API contract. No infrastructure gate is waived:
staging and production remain **NOT VERIFIED**, and live testing remains ON HOLD.

## Scope and local baseline

Branch main, commit 9cba8d77afabedd5fbf32af638a3ee45615487e5. Initial state:
36 modified and 33 untracked files, nothing staged. All existing work is retained.
Read IMPLEMENTATION_HANDOFF.md, STABILIZATION_REPORT.md,
REGISTRATION_IMPLEMENTATION.md and build/qa-registration/validation-ledger.md.
The older reports' disabled-registration/font-blocker statements are historical.

The registration handler validates a strict, bounded JSON body (4096 bytes),
normalizes email, hashes passwords with existing scrypt, and stores pending
credentials in EmailRegistration, not User. Six-digit codes use randomInt and
purpose-bound HMAC-SHA256 with OTP_PEPPER, with constant-time comparison.
Activation conditionally increments attempts, checks expiry again, consumes the
verifier and creates User/PasswordCredential/Profile in one transaction. Role
is fixed USER. Existing accounts, including legacy casing, are not overwritten.
The OTP response has no authentication cookie; Flutter then invokes the existing
CSRF -> password callback -> independent client-provenance session verification.
Verified state alone enables account operations; /buyer is the service catalog
when configured, and /buyer-preview remains explicitly fictional. Profile details
can be completed later. Public catalog browsing itself is not an auth capability.

## Findings

| ID / severity | Evidence | Consequence / required action |
|---|---|---|
| R1 MEDIUM - confirmed local UX defect | src/lib/auth/email-registration.ts:77,116; five-guess admission excludes attempts >=5, resend rotates the code without checking exhaustion | Resend returns 202 and sends an unusable code after five failures. Preserve the attempt bound; reject exhausted resends with a safe restart instruction and align both clients before the main staging journey. A new start remains subject to email quotas. |
| R2 MEDIUM - confirmed retry-contract defect | src/lib/auth/email-registration.ts:125 always emits Retry-After:60 | Three/email/hour or aggregate hourly exhaustion can persist long after the advertised interval. Return a delay derived from the actual limiting budget; validate Flutter/browser feedback. No unrestricted fallback. |
| R3 LOW - expiry display is approximate | handler:110,123 starts expiry before sending but returns expiresIn:600 after sending; registration_screen.dart:125 starts local expiry on receipt | Provider/network latency makes the displayed expiry later than server expiry. Prefer authoritative expiry/remaining TTL. Server expiry still rejects late activation. |
| R4 LOW - partial injected-clock use | registration_screen.dart:81,125,192 uses injected clock for enablement but DateTime.now for countdown | Non-default clocks can make the label inconsistent with button state. Not an authentication bypass; use one display clock and assert exact countdown values later. |
| R5 MEDIUM - incomplete request admission | email-registration.ts:104-107 reads a resend challenge before delivery admission | Unknown/consumed IDs can cause DB lookups without consuming a delivery quota. Quotas bound sends/guesses, not all incoming traffic. Require ingress request/concurrency limits before staging abuse tests; consider bounded admission before lookup in a focused hardening phase. |
| I1 HIGH - staging isolation/automatic-migration gate (existing infrastructure gap) | railway.json:8; package.json db:migrate; prisma/schema.prisma datasource | A future deployment applies ALL pending migrations to DATABASE_URL before startup. Labelled staging is not isolation evidence. Owner attestation and migration/recovery approval must precede deployment. |
| I2 HIGH - configuration does not guarantee staging isolation (existing) | src/lib/auth/redirect.ts:28-30; env.ts:85,159 | Missing AUTH_URL/NEXTAUTH_URL falls back to the production origin when NODE_ENV=production. assertProductionEnv is not called by startup, and its generic audit omits OTP pepper/sender/staging approval. An approved explicit manifest is mandatory; ops:env is not a readiness or isolation certificate. |
| I3 HIGH - distributed abuse prevention incomplete (existing) | password-signin-limit.ts; api/rate-limit.ts:29,93 | Password sign-in is process-local. General recovery/mutation limits use memory and accept forwarded-IP headers without a proven trust boundary. Keep the first test single-instance; multi-instance rollout needs approved shared enforcement and trusted ingress. |
| I4 MEDIUM - operational observability/redaction incomplete (existing) | logging/logger.ts:41-47; backend/db.ts | General errors retain original text/stack; development enables SQL logging. SENTRY_DSN currently changes a label, not proof of an installed exporter/alerts. Approve redacted monitoring and test it before failure injection. |
| I5 MEDIUM - deletion/retention unresolved (existing release gate) | Prisma User/business relations; no reviewed deletion workflow | No claim that deleting User is safe. Approve deletion/anonymization, backup retention, support/privacy/deletion URLs before public account creation. Disposable staging accounts also need a cleanup owner and approved procedure. |

No authenticated-session bypass was confirmed by this focused review. This is not
a penetration test or proof of security. No application or migration fix was made
in this phase; new tests explicitly capture R1/R2 rather than claiming them fixed.

## Required staging environment manifest

Values, connection strings and secrets must remain in an approved secret manager;
this document records names/purposes only. Do not paste the remote environment or
run an env dump. Backend runtime configuration is distinct from Flutter build defines.
Every remote value/presence/approval below is NOT VERIFIED LOCALLY.

Review process variables, service references and packaged env files as a single
resolution chain without exposing values. Prisma has no hardcoded production URL,
but an inherited variable or env file can still supply one when an operator thinks
staging configuration is absent. Application startup checks cannot protect a
preDeploy migration that has already run. Do not reuse the inert-config Next QA
build or the default offline APK as an approved staging artifact: future authorized
builds must use the reviewed non-secret staging origins/defines from this manifest.

| Variable | Purpose / staging requirement |
|---|---|
| DATABASE_URL | Secret PostgreSQL target used by both Prisma runtime and migration CLI. Dedicated staging database and least-privilege role; owner verifies host/service/database/schema non-secret identity and no production reachability. No code isolation guard or alternate production URL exists; a wrong supplied URL is still dangerous. |
| AUTH_SECRET | Required staging-only cryptographic Auth.js secret, consistent across workers. Schema accepts 16 characters, but provision at least 32 random bytes through approved custody; never use the development fallback. Rotation invalidates existing cookie authentication. |
| OTP_PEPPER | Secret HMAC key, at least 32 characters for registration (generic env schema only requires 16). Provision high entropy, preferably 32 random bytes encoded safely; share within staging, distinct from production and AUTH_SECRET. |
| AUTH_STAGING_ORIGIN | Explicit approval of the public staging HTTPS origin. No path, credentials, query, fragment, IP literal, reserved local/test host or production origin; local code validates this contract. |
| AUTH_URL | Takes precedence over NEXTAUTH_URL in canonical origin selection. If present, must equal the approved staging origin; never inherit a production setting. |
| NEXTAUTH_URL | Explicit same staging origin used by existing auth/deployment audit. Set consistently with AUTH_URL and AUTH_STAGING_ORIGIN. |
| NEXT_PUBLIC_SITE_URL | Non-secret public site origin used by other server/UI integrations. Pin to staging to prevent wrong links; not a database isolation mechanism. |
| RESEND_API_KEY | Secret, separate approved transactional-email credentials. Adapter calls the fixed HTTPS Resend API; do not use a production unrestricted key. |
| RESEND_FROM_EMAIL | Verified staging sender, preferred by the adapter. Generic schema expects a bare email address, not a display-name string. Owner verifies domain/provider restrictions and SPF/DKIM/DMARC externally after authorization. |
| EMAIL_FROM | Fallback sender only when RESEND_FROM_EMAIL absent; also used by optional SMTP magic links. If both exist, verify precedence intentionally. At least one approved sender is required. |
| NODE_ENV | Use production runtime behavior for staging; "staging" is not an accepted enum value. This alone does not choose a database or disable the production-origin fallback. |
| LOG_LEVEL | Use reviewed non-debug logging; this flag alone does not redact all errors. Avoid development SQL logging for credential tests. |
| PORT | Hosting-supplied listening port, if supplied by the platform. Verify routing to the Next start command; not a client API origin or trust contract. |
| AUTH_GOOGLE_ENABLED | Explicit false for this password-registration-only verification. No Google credentials needed in scope. |
| AUTH_MAGIC_LINK_ENABLED | Explicit false; registration email uses Resend, not SMTP magic links. |
| AUTH_MOBILE_OTP_ENABLED | Explicit false; existing demo phone OTP is separate and must not be mistaken for verified email auth. |
| DEMO_LOGIN_ENABLED | Explicit false; production already suppresses this provider but do not rely on inherited settings. |
| DEMO_MOBILE_LOGIN_ENABLED | Explicit false; does not substitute for disabling AUTH_MOBILE_OTP_ENABLED. |
| OTP_DEV_LOG_CODES | Explicit false. New email registration does not consult this flag or expose codes; separate legacy OTP behavior still exists. |
| HOMEZONE_ENFORCE_ENV | Optional generic audit switch, not automatic startup protection. Do not fabricate AI/payment credentials merely to satisfy that broad audit. |
| PASSWORD_SIGNIN_WINDOW_MS | Optional positive integer: default 300000, max 3600000; provisional password-limiter window. |
| PASSWORD_SIGNIN_ACCOUNT_ATTEMPTS | Optional positive integer: default 10, max 10000. Approve test quota and targeted-denial implications. |
| PASSWORD_SIGNIN_TOTAL_ATTEMPTS | Optional positive integer: default 1000, max 100000. Aggregate per-process ceiling. |
| PASSWORD_SIGNIN_MAX_ACCOUNTS | Optional positive integer: default 10000, max 100000. Retained process-local bucket capacity. |
| HOMEZONE_ENABLE_API | Flutter non-secret build define. Explicit true only in the separately authorized service-mode build; default false remains offline. |
| HOMEZONE_API_ENV | Flutter define: staging for that build. |
| HOMEZONE_API_BASE_URL | Flutter define: the exact approved staging HTTPS origin. No fallback host. Must match canonical backend origin, without credentials/path/query/fragment. |
| HOMEZONE_IMAGE_HOSTS | Optional comma-separated, exact reviewed HTTPS photography hosts for the staging fixture media. Empty/unapproved hosts show fallback, not demo inventory. No wildcards, secrets or production-private media. |

Conditional integrations are NOT required for the first registration test. Keep
outbound access restricted to its approved scope; absence of a feature flag is not
proof that a public endpoint is inaccessible. Inventory these inherited variables
without displaying their values, and omit/unset unused credentials:

| Conditional variables | Purpose / treatment |
|---|---|
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Only for separately approved Google OAuth; keep provider disabled. |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD | Only for separately approved SMTP magic-link delivery. They do not redirect registration Resend delivery to a local mail sandbox. |
| DEMO_EMAIL, DEMO_PASSWORD, DEMO_MOBILE_PHONE, DEMO_MOBILE_OTP | Demo-provider credentials; do not enable for real account verification or copy production values. |
| WHATSAPP_OTP_PROVIDER, WHATSAPP_OTP_API_KEY | Separate phone provider/demo utility; no approved phone integration in this scope. |
| SENTRY_DSN | Optional monitoring configuration; actual exporter/redaction/alerts must be demonstrated, not assumed from variable presence. |
| CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, UPLOAD_MAX_BYTES | Upload/media management; not needed for plain registration or public catalog reads. Only staging media may be authorized. |
| OPENAI_API_KEY, OPENAI_MODEL, GEMINI_API_KEY, GEMINI_MODEL, ANTHROPIC_API_KEY, ANTHROPIC_MODEL | Separate AI services; disabled/out of test scope through credentials/egress/access policy, not assumed protected by login. |
| RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET | Payments; no payment actions or production keys in this test. |
| HOMEZONE_APPLICATION_ID, HOMEZONE_PACKAGE_ID_APPROVED | Owner-approved Android identity for later release; debug preview identity is not release approval. |
| HOMEZONE_SIGNING_STORE_FILE, HOMEZONE_SIGNING_STORE_PASSWORD, HOMEZONE_SIGNING_KEY_ALIAS, HOMEZONE_SIGNING_KEY_PASSWORD | Externally held Android release-signing material, not needed for local debug QA; never pass through Flutter defines. |

AUTH_TRUST_HOST is not a substitute for ingress verification: backend/auth.ts
already sets trustHost:true. The owner must restrict direct-origin access, validate
Host/proto, and define which ingress overwrites/strips client headers. Registration
and the password limiter do not trust forwarded IPs; the older general rate utility
does. Synchronize worker clocks. Do not claim Railway performs these tasks without
its actual service/ingress evidence.

## Email and secret handling gates

- Approve controlled recipient mailboxes and a provider-enforced restriction/test
  policy. The application has NO staging-recipient allowlist. A separate environment
  label or API key alone does not prevent sending to arbitrary entered addresses.
- Verify sender, domain ownership, quotas, bounce handling and access to provider
  message content; OTPs are necessarily visible in authorized delivery content.
  No message contents, headers, codes, passwords or tokens belong in QA artifacts.
- API acceptance is not inbox delivery. Confirm receipt only in the separately
  authorized test. The adapter has a 10-second timeout; non-2xx/throw returns false.
  Handler failure deletes only its matching pending verifier; account activation
  and external delivery cannot be undone by cancelling a client request.
- Store OTP_PEPPER and AUTH_SECRET separately with environment-specific access,
  ownership and rotation runbooks. Do not print generated secrets in a terminal.
  Pepper rotation invalidates pending OTPs and resets correlation with per-email
  quota keys; aggregate quotas remain. Coordinate rotation across all instances;
  do not rotate to evade a rate limit. Length checks do not prove entropy.
- Database failure is fail-closed. Generic 503 responses redact application errors,
  but operations still needs safe status/count/latency observability without PII.

## Migration compatibility and recovery review (NOT executed)

Source: prisma/migrations/20261024000000_email_registration/migration.sql.
PostgreSQL migration lock, User table and original exact email unique index exist
in migration source. Earlier password-auth and session-revocation migrations must
also be present/applied in the actual target. Prisma models and new table/index
names agree by source inspection. This does NOT verify applied history or drift.

The new migration first creates User_email_normalized_key on lower(User.email),
excluding nulls, then creates EmailRegistration and RegistrationBudget with expiry
indexes. The functional index is not representable in schema.prisma; preserve it
in migration history and include it in future drift/rebuild reviews. Do not replace
migrate deploy with db push. No SQL/migration/schema command against a DB was run.

Before any deployment the owner must verify:

1. Exact dedicated service/database/schema and restricted credentials. No shared
   or production data; no copied production users. Migration role and runtime
   permissions reviewed separately where supported. No unsafe URL fallback exists
   in Prisma; DATABASE_URL is the single configured selector.
2. Applied history/checksums, pending migrations, database version, extensions,
   collation and schema/search path; rehearse ALL pending migrations on a disposable,
   isolated target. No such target is authorized or used in this phase.
3. Count-only legacy duplicate audit. Do not include actual emails in the report.
   Suggested OWNER-ONLY, separately authorized preflight (NOT run here):

   ```sql
   SELECT count(*) AS duplicate_groups, coalesce(sum(n - 1), 0) AS extra_rows
   FROM (
     SELECT count(*) AS n FROM "User"
     WHERE "email" IS NOT NULL
     GROUP BY lower("email") HAVING count(*) > 1
   ) AS duplicates;

   SELECT count(*) AS normalization_candidates FROM "User"
   WHERE "email" IS NOT NULL
     AND ("email" <> btrim("email") OR "email" <> lower("email"));
   ```

   The new index does not trim whitespace. Legacy case/whitespace normalization
   requires an explicit account-preserving decision; exact-case password/recovery
   lookup behavior elsewhere must also be reviewed. Never auto-merge/delete users
   or overwrite credentials/roles to make the index succeed.
4. Regular CREATE UNIQUE INDEX can block writes and fails on conflicting rows.
   Approve lock/statement timeout and maintenance budget. No explicit transaction
   wrapper or rollback is declared by this SQL: rehearse failure/recovery, inspect
   actual migration state, and never assume all DDL rolled back after an error.
5. Encrypted backup/snapshot, tested restore, named recovery operator, RPO/RTO and
   approval to pause traffic. Store identifiers privately; no connection strings
   in a ticket. Confirm a restore works before relying on it.
6. Rollback order covering app version, schema compatibility and accounts/sessions
   created during the test. Do not roll back to unverified-account signup or blindly
   drop tables/delete User rows. Stop traffic and use a reviewed restore/forward-fix
   plan; a DB restore cannot unsend an email or undo an external action.

Railway runs npm run build, then preDeployCommand npm run db:migrate (Prisma
migrate deploy), then npm start -- --hostname 0.0.0.0. Inspecting railway.json is not
permission to execute this sequence. Migration approval must come BEFORE deployment.

## Authorization checklist

| Gate | Classification now | Evidence / acceptance |
|---|---|---|
| OTP/password/session sequence, no fictional live fallback | VERIFIED FROM LOCAL SOURCE; mocked tests only | Files traced above; live behavior still unknown. |
| Existing local registration suite and extension | VERIFIED LOCALLY when results recorded below | Mocked provider/storage, no PostgreSQL locks exercised. |
| Dedicated staging app and dedicated database; no production access | REQUIRES INFRASTRUCTURE OWNER CONFIRMATION | Non-secret project/service/database IDs, credential/network isolation evidence. Names alone insufficient. |
| HTTPS origin and canonical URL manifest | REQUIRES INFRASTRUCTURE OWNER CONFIRMATION | AUTH_STAGING_ORIGIN plus consistent AUTH_URL/NEXTAUTH_URL/site/mobile origins. |
| Exactly one app instance/process serving the test | REQUIRES INFRASTRUCTURE OWNER CONFIRMATION | Disable autoscaling/overlapping deploys/workers for password-limiter tests; count Node processes, not just service labels. |
| Migration history, duplicate review, backup and recovery | REQUIRES INFRASTRUCTURE OWNER CONFIRMATION | Reviewed replay and recovery evidence for isolated target. |
| Email sender and controlled recipient restrictions | REQUIRES INFRASTRUCTURE OWNER CONFIRMATION | Separate credentials and approved destination list; no unrestricted sends. |
| Named authorizer and written endpoint/test scope | NOT VERIFIED LOCALLY | Start/end time, attempt/email ceiling, devices, accounts, stop conditions and prohibited actions. |
| Negative tests, registry/DB faults, quota exhaustion and replay | REQUIRES INFRASTRUCTURE OWNER CONFIRMATION | Separate explicit authorization; no real customer/shared data, no production faults. |
| Trusted ingress, repeated Set-Cookie, HTTPS cookie/TLS behavior | NOT VERIFIED LOCALLY | Owner contract and subsequent native/browser observations. |
| Monitoring, incident, recovery and cleanup owners | REQUIRES INFRASTRUCTURE OWNER CONFIRMATION | Names/on-call and redacted evidence/retention plan. |
| R1/R2 fixes or explicitly accepted diagnostic scope | NOT COMPLETE | Fix known unusable resend/retry hints before claiming the full journey is ready. |
| Account deletion/privacy/retention policy | NOT VERIFIED LOCALLY | Public release gate; controlled staging needs disposable-account cleanup and data policy too. |

No item in this table authorizes tests. Live testing stays on hold while required
approvals/safeguards are missing. No service/provider/database state is verified.

## Controlled verification matrix (future, separately authorized only)

Record each case as NOT RUN until executed, with build/commit, instance count,
non-secret fixture alias, timestamp, status and observed state. Never retain raw
request bodies, HAR cookies, OTPs or session/reset/CSRF tokens. Do not record SMTP
content/screenshots of codes. A pass must include the actual session/account result.

| Case | Steps and expected result | Scope/stop condition |
|---|---|---|
| Service entry | Authorized mobile build uses staging defines. Offline preview remains separately labelled. Open registration via sign-in. | Wrong origin/config or any production resource: STOP. |
| Registration / email | Disposable controlled email and fictional name, strong password. POST signup -> 202 challenge metadata; no authenticatable User before verification. Receipt checked privately in approved mailbox. | Provider rejection -> safe failure, never claim receipt from 202 alone. |
| Wrong / expired code | Wrong six-digit guess -> generic 400, no session. After server expiry, correct old code -> 400. Abandon/retry paths remain safe. | Respect approved count/duration; do not accelerate a shared server clock. |
| Verification / replay | Correct fresh code -> verified true, one activation, verifier consumed. Replay fails. Two simultaneous verifications yield at most one activation. | No real customer address. Actual PostgreSQL race check requires its own approval. |
| Automatic authentication | Observe CSRF bootstrap, password callback, then independent GET session (without capturing secrets). Only verified session permits authenticated navigation/account reads. | Failed callback/session -> no verified navigation, safe retry/sign-in. Verification itself does not issue a session. |
| Discovery | Service home requests published staging catalog. No listings -> useful empty state. Retrieval failure -> error/retry, never fictional inventory shown as real. Profile completion stays optional. | Only authorized fixture catalog/media; no production media or seeded real customer data. |
| Sign-out / sign-in | CSRF-protected logout and server registry revocation; local state clears. Sign-in restores a fresh verified volatile session. Reuse/revocation tests only if approved. | Lost logout response means revocation uncertain, not proven success. |
| Resume / restart / expiry | Resume independently verifies same identity and expiry. Expired/invalidated session loses protected access. Restart starts without stored credentials; sign-in required. | No disk session persistence is claimed; no changing shared DB clocks. |
| Resend | Before 60s -> 429/disabled UI. After cooldown -> new code; earlier verifier invalidated unless randomly identical digits; attempt count never reset. After five guesses -> currently unusable resend (R1). | Fix/accept diagnostic scope first. Do not repeatedly send to probe behavior without authorization. |
| Hourly rate limit | Approve at most three deliveries/email/hour, 100 aggregate/hour, 1000 verification requests/hour; named attempt ceiling can be lower. Quota persists across worker restart via DB. | Aggregate exhaustion can deny everyone. Prefer existing mocks; NEVER send 100 emails just to exhaust a real provider without separate explicit approval. Current retry hint R2 is inaccurate. |
| Failures | Approved provider-rejection/timeout, unavailable registry/storage, lost response and stale client operations fail safely; no new verified state or false successful mutation. | Fault injection forbidden until owner approves target/recovery. Unknown outcomes require reconciliation, not blind retries. |
| Native HTTPS / cookies | Approved Android/iOS devices, certificate chain, real proxy attributes and repeated/chunked Set-Cookie preservation, cookie path/security and error updates. | No broad TLS bypass, no trusting arbitrary forwarded headers. |
| Duplicate / isolation | Two controlled accounts, duplicate starts including case variations, concurrent signup. No password/role overwrite, no cross-account saves/profile access. | Only disposable fixtures; avoid already-existing real accounts. |
| Cleanup | Named owner confirms approved disposal/restoration, mail retention, session invalidation and artifact sanitization. | No automatic deletion workflow exists; do not improvise cascading deletes. |

## Remaining production boundaries and next step

Registration quotas are shared in PostgreSQL; password sign-in and general route
limits are not. First controlled tests must be single-instance, with approved
ingress request concurrency/body/time/egress limits. Rate-limits are provisional
and allow targeted account/email denial and aggregate exhaustion. Invalid/missing
resend IDs perform a DB lookup before delivery admission: there is no universal
edge request budget proven by repository code. Malformed bodies must also be
bounded at ingress. Clock synchronization and DB transaction timeout/capacity
need operational ownership. Memory process cleanup does not provide durable quotas.

Idle expired pending personal data can remain until an admitted delivery cleans
up to 100 records; no scheduled retention erasure is implemented. Consumed records
clear password/code verifiers but retain name/email until cleanup. Registration
requires email proof only for newly created accounts; it does not retroactively
verify or disable legacy users. Account deletion/anonymization, legal consent,
privacy/support URLs, backup retention and telemetry approval remain release gates.
Secure persistent session restoration is deliberately absent. Local session clearing
is not server revocation, and cancellation cannot undo an accepted server request.

Next focused implementation: correct R1/R2 without relaxing attempts/quotas and add
client feedback regressions. In parallel, owner supplies the authorization/isolation,
origin, restricted-email, migration/recovery and ownership evidence above. Do not
begin staging actions as a consequence of documentation or passing local tests.

## Current-phase validation

Results are appended after execution. Earlier 287 Flutter / 94 Node counts and
Android screenshots in qa-registration are historical, not current rerun claims.
No build, emulator launch, migration, database query, live provider request or remote test
is needed to produce this checklist. Mocked provider fetch interception is local.

Checks actually rerun in this phase (all exit 0):

| Command | Current result |
|---|---|
| node --test --test-isolation=none tests/registration.test.mjs | 21 reported tests including the parent group; six new adversarial cases. |
| npm test | TypeScript check, six smoke checks, and 100 reported Node tests (21 auth, 21 leads, 19 sessions, 8 password limiter, 10 mobile API, 21 registration). |
| flutter --no-version-check test --no-pub --reporter expanded test/registration_test.dart test/password_auth_protocol_test.dart test/protocol_ownership_test.dart test/ownership_clearing_test.dart test/sign_in_integration_test.dart test/marketplace_test.dart | 70 passed, injected/mock transport only. |
| .\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma | Schema valid, cached schema engine with inert loopback configuration; no DB connection. Does not validate migration execution, data duplicates or live isolation. |
| git -c core.safecrlf=false diff --check | Exit 0, clean after documentation/test updates. |

Prisma used the installed PRISMA_SCHEMA_ENGINE_BINARY and loopback-only
PRISMA_ENGINES_MIRROR, without downloading engines. CI/analytics suppression and
--no-pub were used for cached Flutter tools. Current logs/status/hash evidence:
build/qa-staging-readiness. No packages were installed and no application code was
changed. No migration, full Flutter suite, static analysis/lint/build, emulator
launch, email send or staging/production/database connection occurred in this phase.
One final-status PowerShell wrapper exited 1 because ErrorActionPreference=Stop
treated Git's existing LF/CRLF warning on stderr as an error. The standalone
non-mutating diff check above was then run with an explicit exit capture and passed;
no test, schema or whitespace failure was suppressed.

Final branch/commit remain unchanged: 36 modified, 34 untracked, nothing staged.
Only this new checklist, REGISTRATION_IMPLEMENTATION.md's cross-reference and
tests/registration.test.mjs changed in this phase. Hash comparison confirmed all
69 initial changed files remain, and all except those two intentional existing-file
edits are byte-identical to the recorded initial state. Older QA evidence was kept;
new logs/status/hash evidence use a separate directory. No Git history changes.

The new cases verify late failure preserves a replacement challenge, a stale
resend read cannot resurrect consumed state, expiry is rechecked mid-verification,
and insufficient pepper/missing sender fail closed. Two also reproduce R1/R2 while
asserting that attempts and hourly quotas remain enforced; green security tests do
not mean those UX/contract defects were fixed. Controlled futures are released and
awaited, env/fetch state restored, fake time used without sleeps, and the test group
has a 30-second deadline. Fixture transactions are serialized in memory and cannot
establish real PostgreSQL contention, migration behavior or multi-instance results.
