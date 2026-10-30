# HOMEZONE PIN authentication staging deployment checklist

Role-first update, 2026-10-30: review the current required role request contract
and public whitelist USER/OWNER/BROKER/BUILDER/SERVICE_PROVIDER before rollout.
ADMIN/SUPER_ADMIN/unknown/missing role must be rejected, and duplicate registration
must not change roles. Existing profile enum supports this without a new migration.
Coordinate backend/new APK rollout; old PIN APKs omit role and receive HTTP 400.
Validate role selection before forms, Back/form-switch preservation, authenticated
session/profile role match, mismatch signout/no dashboard, correct workspaces,
restart bypass for valid sessions and role-first entry after logout. Previous
default-USER-only acceptance criteria are superseded by the selected allowed role.
No new role-first runtime proof or deployment authorization is implied.

2026-10-30. Preparation only; unchecked items are NOT verified settings.
Companion: HOMEZONE_STAGING_AUTH_READINESS.md. **Current decision: HOLD.**

## Gate 1 — exact source and target

- [ ] Review the full current diff AND untracked registration route/service/forms/
  tests; preserve all work. Fix the exact intended deployment commit/artifact.
  Existing HEAD does not include the uncommitted implementation.
- [ ] Owner identifies HOMEZONE project ID, STAGING environment ID, backend service
  ID and database service ID, database name/schema and isolation from production.
  A familiar hostname or staging URL alone is insufficient.
- [ ] Privately trace runtime DATABASE_URL and migration-runner effective reference
  to that same staging database/schema, including shared variables/overrides.
  Confirm production is a different intended target; do not print full URLs.
- [ ] Owner supplies sanitized migration history, all attempts/status/checksums/
  error logs, and compares it with the exact artifact's 21 local migrations.
  Identify the precise pending set; no failed record or checksum mismatch ignored.
- [ ] Owner confirms actual schema/partial effects/drift, particularly User,
  Profile(phone,role,verificationStatus), User.sessionVersion, AuthSession,
  MobilePinCredential and MobilePinLoginBudget. Confirm uniques, cascade FK,
  three PIN checks, resetAt index, defaults and required enums.
- [ ] Confirm migration privileges, runtime table/sequence privileges, connection
  budget, KDF memory/capacity and short transaction/lock timeouts are suitable.
- [ ] Record backup timestamp, scope, retention, recovery owner and usable restore
  evidence before any authorized database write. Prefer a recoverable staging
  snapshot; do not delete/recreate staging or modify production.

## Gate 2 — privately verify configuration

Owner checks STAGING Variables/reference relationships without sharing values,
screenshots of secrets or complete database URLs. All effective values remain
UNVERIFIED in this review.

| Name | Required state / format |
|---|---|
| DATABASE_URL | Required; PostgreSQL Prisma URL referencing independently verified staging database/schema; pool/TLS parameters reviewed privately |
| AUTH_SECRET | Required stable high-entropy secret across replicas; shared env schema minimum 16 characters is not an entropy guarantee. Provision at least 32 random bytes through approved secret management; do not use development fallback |
| NODE_ENV | production for deployed Next.js staging; environment name does not require development mode |
| AUTH_URL / NEXTAUTH_URL | One explicit canonical origin required by authOrigin; set both consistently to https://homezone-staging.up.railway.app when both exist. AUTH_URL takes precedence, not permission to leave conflicts |
| AUTH_STAGING_ORIGIN | Required to approve this nonproduction HTTPS origin; exact staging origin, no credentials/path/query/fragment; neither approved production origin permitted |
| NEXT_PUBLIC_SITE_URL | If used, align staging public links to the same origin; it does NOT select authOrigin or replace AUTH_URL/NEXTAUTH_URL |
| AUTH_MOBILE_PIN_ENABLED | Leave disabled until schema/configuration/source gates pass; later literal true includes provider at process initialization AND enables enrollment |
| MOBILE_PIN_PEPPER_V1 | Required independent high-entropy secret; 32–256 characters, no outer whitespace; same across hash/verify replicas; secure recovery backup/custody |
| MOBILE_PIN_RATE_LIMIT_KEY | Required distinct high-entropy HMAC secret, same length/whitespace rules and consistent across replicas; rotation changes quota buckets |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | Optional positive integer <=20; default 5 failed authentications |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | Optional positive integer <=86400000; default 900000 |
| MOBILE_PIN_GLOBAL_ATTEMPTS | Optional positive integer <=10000; default 300 total requests |
| MOBILE_PIN_GLOBAL_WINDOW_MS | Optional positive integer <=3600000; default 300000 |
| MOBILE_PIN_MAX_ACCOUNTS | Optional positive integer <=100000; default 10000 failure rows |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | Optional positive integer <=10000; default 5000 raw requests |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | Optional positive integer <=1000; default 100 valid attempts |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | Optional positive integer <=10; default 3 |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | Optional positive integer <=100; default 10 |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional x-real-ip OR x-forwarded-for only after owner proves ingress overwrites it with one valid IP; forwarding chains/missing values fail closed. Unset means one shared conservative ingress bucket, not real per-IP limits |
| DEMO_LOGIN_ENABLED / DEMO_MOBILE_LOGIN_ENABLED / AUTH_MOBILE_OTP_ENABLED | Confirm disabled for real staging verification; the last flag directly selects the legacy mobile-demo provider. Do not infer provider absence from UI or one demo flag alone |
| LOG_LEVEL / SENTRY_DSN | Existing optional diagnostics settings; no new PIN logging variable. PIN diagnostics directly emit only fixed stage/category warnings with per-process suppression; verify collectors redact request bodies/cookies/secrets |

- [ ] Do not reuse AUTH_SECRET, OTP_PEPPER, password-limit key or another service
  key as either PIN secret. Source validates shape, not entropy/key independence.
- [ ] Keep v1 pepper stable/backed up. Parser and SQL support v1 only; a new version
  requires a separately reviewed parser/constraint/key transition, not key replacement.
- [ ] Verify ingress/host/proxy behavior and Secure/HttpOnly/SameSite cookies without
  changing trustHost or weakening CSRF/origin checks.
- [ ] Existing shared env-schema values must be valid if present. PIN does not
  require RESEND_API_KEY, sender, STAGING_EMAIL_RECIPIENTS, SMTP, OTP_PEPPER or SMS
  credentials. Retain existing website/admin/email functionality independently;
  do not delete its settings to simplify PIN activation.
- [ ] Review HOMEZONE_ENFORCE_ENV and application-wide readiness checks separately:
  broader environment audit groups are not new PIN dependencies. No missing
  effective variable is asserted by this source-only checklist.

## Gate 3 — policy and deployment approval

- [ ] Accept no phone-possession proof, low-entropy PIN, first-claim risk and
  potential sustained temporary/global denial; do not claim verified ownership.
- [ ] Accept generic duplicate/contact-collision acknowledgment and no automatic
  legacy linking. Define who handles legacy contact collisions and pepper loss.
- [ ] Keep Forgot PIN deferred; never use email password reset to change PINs.
- [ ] Approve a controlled new staging account/number privately. Do not put PINs
  or real-user identifiers in chat/logs. No accounts or OTPs are created by review.
- [ ] Review source/check results, including PIN-specific tests outside default
  npm test, and gaps in real PostgreSQL concurrency/capacity verification.
- [ ] Separately authorize the exact staging database migration/write scope,
  configuration changes and backend deployment. railway.json preDeployCommand
  runs npm run db:migrate (prisma migrate deploy), so deployment may apply ALL
  pending migrations, not only the PIN migration.
- [ ] Plan disable-provider/admission rollback without deleting accounts, changing
  pepper, resetting migration history or rolling back tables containing credentials.

Do not enable an incomplete provider to discover whether prerequisites exist.
No deployment is authorized by satisfying or writing this checklist.

## Gate 4 — controlled account verification after separate approval

Record actual Flutter action, endpoint/status, sanitized outcome and visible Android
UI for each item. Never retain raw credentials/cookies/OTPs or full response traces.

- [ ] Confirm APK identity/hash and explicit staging defines; source-equivalent
  supported command is node scripts/build-android.mjs --mode service --config
  config/staging.local.json from mobile-app. Do not reuse an old APK by filename.
- [ ] Visible Android startup and anonymous discovery; confirm staging only.
- [ ] Register approved number/PIN/confirmation, including a leading-zero PIN.
  Generic acknowledgment is not proof of created account. Proceed to separate login.
- [ ] Verify CSRF bootstrap, PIN callback and independent session/profile response;
  confirm selected public role/PENDING and unverified contact/email state, with no privileged links.
- [ ] Check duplicate/concurrent registration never overwrites binding/hash/role.
- [ ] Check wrong/unknown/malformed PIN, five failures, fixed expiry, success not
  consuming failure allowance, IP-distributed attempts and aggregate denial.
- [ ] Exercise real database transactions: simultaneous admissions, uniqueness
  rollback, cleanup vs active verifier, timeout/capacity and dependency failure.
- [ ] Restart/resume app and verify server-backed session restoration; verify
  vault unavailable/invalid credential does not fabricate an authenticated identity.
- [ ] Logout clears local credential/identity and revokes server session; failed
  remote signout is reported as uncertain. Revoked/expired/suspended sessions fail.
- [ ] Verify profile/role agreement and two-account isolation; no locally selected
  elevated role. Website/admin login and existing session protections still work.
- [ ] Review sanitized results and remaining defects before any broader rollout.

Only the two requested documents were created in this review. No source changes,
tests/builds/runtime/device/database operations, settings changes, deployments,
commits or pushes were performed; all pre-existing work remains intact.
