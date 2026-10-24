# Registration implementation and rollout gates

Latest local hardening: [LOCAL_BLOCKERS_VALIDATION.md](LOCAL_BLOCKERS_VALIDATION.md).
Production/staging canonical auth selectors now fail closed without a valid
explicit origin. Staging registration/reset Resend delivery requires the exact
STAGING_EMAIL_RECIPIENTS server allowlist; owners must supply approved recipients.
No remote email/database verification or staging authorization is implied.

Registration uses POST /api/auth/password/signup, /signup/resend and /signup/verify.
The original signup no longer creates an immediately usable unverified account.
Name, normalized email and a strong password are required. Role is always USER;
profile completion is optional. Browser signup was updated to the same contract.

EmailRegistration holds pending name/email, scrypt password hash and a purpose-bound
HMAC-SHA256 code verifier. Random six-digit codes expire after 10 minutes; five
atomic guesses per challenge. An admitted resend replaces the challenge ID and
verifier and grants five new guesses; the old challenge stays unusable. Successful verification consumes
and erases the verifiers in the same transaction that creates User, verified email,
PasswordCredential and Profile. Existing accounts are never modified. Verification
returns no authentication cookie. Flutter automatically invokes the existing
CSRF/password callback and independently validated session protocol, then /buyer
(the service-backed marketplace). Invalid/missing sessions never enter verified
state. Password/code are transient memory only and cleared when abandoning the
route. Local invalidation cannot undo submitted requests or account activation.
A lost verification response may require existing sign-in/recovery; no unsafe OTP
replay or custom authentication ticket was introduced.

Required staging configuration: existing DATABASE_URL, AUTH_SECRET, approved
NEXTAUTH_URL/auth origin, RESEND_API_KEY and verified RESEND_FROM_EMAIL (or EMAIL_FROM),
and OTP_PEPPER of at least 32 securely generated characters. Share the pepper across
instances; rotating it invalidates pending codes and resets email quota key
correlation. Never log it or codes. No development pepper fallback. Missing provider
configuration fails closed; actual delivery is unverified. Provider acceptance is
not proof of inbox delivery. Pending state is removed on an unconfirmed send, with
conditional matching so older failures cannot remove newer challenges.

The new migration must be reviewed and applied only to an explicitly authorized,
isolated database. It has NOT been applied by this implementation. PostgreSQL shared
conditional counters survive restarts: provisional 100 deliveries/hour aggregate,
3/email/hour, 60-second email cooldown; 1000 verification requests/hour aggregate.
A separate shared 5000/hour request budget precedes body parsing and pending-ID
lookups, including malformed and unknown resend IDs. These are provisional limits.
All instances acquire aggregate then email counters; unavailable storage fails
closed. No forwarded-IP header is trusted. Ingress request/body/time/concurrency
limits and shared password-signin enforcement still require owner approval. A
source can exhaust an aggregate quota or target an email's allowance: no production
DoS resistance is claimed. OTP endpoints cap JSON at 4096 bytes. Bounded cleanup
removes up to 100 expired challenges and old quota rows on admitted deliveries;
idle retention and scheduled erasure ownership must be defined before rollout.
Pending records contain personal data. DB backup retention also needs approval.

No account deletion endpoint was invented: property ownership, leads, payments,
audit and retention obligations require an approved deletion/anonymization policy.
Mobile registration is implemented, but public release/account-creation rollout
remains blocked by privacy/terms/support/deletion policy and delivery authorization.
No invented consent or marketing enrollment. Secure persistent session restoration
remains unavailable; restart requires sign-in, resume revalidates volatile sessions,
and existing Auth.js server logout/registry revocation behavior is retained.

## Font build dependency

The layout no longer calls next/font/google. System Arial/Helvetica/sans-serif and
Consolas/Liberation Mono/monospace stacks preserve the existing font CSS tokens and
layout rules with platform-dependent metrics. This is an explicit visual fallback,
not an exact Geist match. Installed Next.js includes internal dev-overlay Geist
binaries, but their internal path and separately unverified font licensing were not
made a runtime/build dependency. No binaries were copied or downloaded. Approved,
licensed, repository-owned Geist assets can replace this fallback later.

Database uniqueness also includes a PostgreSQL functional unique index on
lower(User.email), covering competing writes from other account-creation paths.
Activation checks legacy email casing without altering the existing account.
Before applying the migration, the owner must assess case-insensitive duplicates
and approve any remediation. It deliberately fails instead of merging or deleting
accounts. Prisma does not represent the functional index in its schema.

## Local validation evidence for this implementation

Flutter 3.44.0 / Dart 3.12.0, cached tools only. No packages installed.
- dart format --output=none --set-exit-if-changed lib test: exit 0, 71 unchanged.
- flutter --no-version-check analyze --no-pub: exit 0, no issues.
- Final registration widget tests: exit 0, 8 passed. Focused registration, protocol, ownership, clearing, sign-in and marketplace suite: exit 0, 70 passed.
- flutter --no-version-check test --no-pub --reporter expanded: exit 0, 287 passed.
- npm test: exit 0, 94 reported Node tests (including parent grouping tests),
  plus 6 smoke checks. Registration contributes 15 reported tests with mocked
  transactional storage and provider. These are not real PostgreSQL race tests.
- npm run lint: exit 0.
- prisma generate and prisma validate --schema prisma/schema.prisma: exit 0,
  using matching cached Windows engines and an inert loopback database setting.
  Neither operation connected to a database or applied migrations.
- Next production compilation passed with outbound TCP/fetch blocked and inert
  environment configuration. Logs are under ignored build/qa-registration.
- Cached Gradle --offline assembleDebug for android-x64: exit 0, BUILD SUCCESSFUL.
- Debug APK installed and launched on local emulator-5554 (Pixel_6); onboarding
  and the offline sign-in disclosure were visually inspected. No native live
  registration, real email or service-backed authentication was exercised.

Initial checks exposed two brace-style diagnostics and deterministic-test helper
issues (clock advancement and scrolling to lazily laid-out controls). These were
fixed without suppressions; the final suite passed. The first formatter invocation
formatted files but returned exit 1 because of sandbox telemetry-file permissions;
subsequent authorized cached-tool invocations passed. A whitespace check found
extra EOF blank lines introduced in package.json/session-security.test.mjs; fixed.
No production/staging endpoint or database was contacted. No migration was run.
Quotas assume synchronized application clocks. Infrastructure owners must approve
capacity, trusted ingress, request concurrency/timeouts, monitoring, idle personal data erasure and recovery. Existing password sign-in limits remain process-local.
Browser origin validation reuses the existing canonical authOrigin() contract,
including explicit AUTH_STAGING_ORIGIN approval for non-production HTTPS targets;
it never trusts internal request origins or forwarded-host headers. Native requests
without browser origin headers remain supported. Actual proxy behavior is unverified.

Android screenshots also confirm explicit buyer-preview entry opens the fictional
Home screen; this is offline navigation evidence, not live registration evidence.

## Subsequent staging-readiness review

See [STAGING_REGISTRATION_READINESS.md](STAGING_REGISTRATION_READINESS.md) for the
current environment manifest and migration/authorization gates. See
[REGISTRATION_SECURITY_FIXES.md](REGISTRATION_SECURITY_FIXES.md) for subsequent
resend, timing, admission and client corrections. The local counts above are historical results from
the implementation phase; they do not constitute staging authorization or live
email/database verification.
