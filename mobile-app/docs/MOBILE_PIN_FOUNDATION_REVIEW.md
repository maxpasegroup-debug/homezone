# Mobile PIN foundation review — milestone 1A

## Milestone 1B source follow-up — 2026-10-30

The milestone 1A findings below are retained as historical review evidence; their
line references describe the earlier commit. The approved 1B source refinement
now separates aggregate admission from serialized number-keyed failure counting:
success does not consume failed allowance, no permanent/sliding lockout, active
verification protected from cleanup with SKIP LOCKED. Configuration/storage/hash
failures have fixed-label rate-suppressed diagnostics. Both credential reads use
explicit selects. The three P2 source requests have been addressed in source;
no independent compilation/concurrency/runtime verification has been performed.

Pepper format remains v1 only. Rotation/loss, backup custody, first-claim ownership,
KDF/database capacity and effective staging configuration remain activation gates.
See MOBILE_PIN_SECURITY_DECISIONS.md for exact current semantics and residual risks.
The current assessment is SOURCE REFINED — NOT VERIFIED, not production approval.
No schema/migration, Auth.js provider/session callback, website/admin or Flutter
code changed in 1B. Existing restrictions and deferred registration/recovery remain.

## Historical milestone 1A review

Date: 2026-10-30. Reviewed commit: 9d730f2 (against parent 6beb356).
Working tree was clean before review. Source/text inspection only, using the
code-review skill; no compilation, tests, runtime requests or database access.

## Code Review

**Verdict: NEEDS DISCUSSION before activation.**
**Confidence: MEDIUM** — source relationships/contracts reviewed, execution forbidden.

The foundation is structurally compatible with the existing authentication model.
No confirmed P0/P1 source defect was established in this review. Activation remains
blocked by policy/configuration approval, schema/client preparation and unperformed
security/regression verification. This is not approval to enable or deploy it.

Read: MOBILE_PIN_BACKEND_FOUNDATION.md, MOBILE_PIN_AUTHENTICATION_AUDIT.md and
MOBILE_PIN_AUTHENTICATION_IMPLEMENTATION_PLAN.md. Their historical no-implementation
statements describe earlier audit dates; the milestone status addendum documents
the subsequent foundation. Milestone 1 explicitly keeps web/admin providers intact.

## Findings ranked by severity

| Priority | Finding / precise source | Proposed correction or decision |
|---|---|---|
| P2 | Account protection counts successful logins too and never resets on success: src/lib/auth/mobile-pin-admission.ts:24–34,68–69. Five total attempts exhaust the number's default 15-minute window; a third party can consume that budget. This is documented, not a hidden failure-only lockout | Owner must accept the fixed-window/all-attempt behavior before enabling, or approve a separately reviewed failed-attempt/cooldown design. Keep aggregate/hash admission even if failure counters are added; do not reset counters naively on concurrent success |
| P2 | Provider inclusion checks only the flag: backend/auth.ts:92–103. Missing pepper/rate key, invalid numeric settings, missing tables and KDF saturation all end as generic null authorization (mobile-pin.ts:27). No safe configuration-readiness signal exists | Add a future nonsecret compliance/preflight report distinguishing stage/category without numbers, credentials or raw exceptions. Keep failure closed and avoid making disabled PIN configuration break legacy website/admin startup |
| P2 | Both credential reads include the full User/Profile: src/lib/auth/mobile-pin.ts:13–20. Unnecessary contact/verification/profile fields enter memory although returned fields and suspension checks need only a subset | Replace includes with explicit selects in a narrowly approved follow-up. This is minimization; no credential or profile disclosure to the client was found |
| P3 | v1-only hash parsing and SQL hash CHECK are intentionally fixed: mobile-pin-hash.ts:4–5; migration.sql:12. There is no multi-version/pepper rotation implementation | Before future version expansion/enrollment at scale, define key retention/loss/rotation and a reviewed constraint/parser migration. Do not silently change the v1 key or add recovery now |

No application corrections were made. An initial review concern about JavaScript
end anchors was withdrawn: these regexes do not use multiline mode, so no trailing
newline acceptance defect was established. It is not a finding or reason to change
the validators. Later authorized tests should still cover all whitespace/control
characters and leading-zero PINs.

## Schema and migration consistency

**Consistent by inspection, not validated by Prisma/PostgreSQL execution.**

- prisma/schema.prisma:382,445–461 adds an optional User.mobilePinCredential
  inverse, unique credential userId and normalizedMobile, required pinHash and
  timestamps, and a dedicated budget model. User remains the stable account ID;
  Profile.phone and PasswordCredential are untouched.
- migration 20261030120000_mobile_pin_foundation creates exactly these two tables,
  matching primary keys, unique user/mobile indexes, resetAt index, User foreign
  key with cascading deletion/update and three CHECK constraints. TIMESTAMP(3),
  client-side cuid and updatedAt behavior match existing Prisma conventions.
- SQL checks enforce initial India canonical-number shape, v1 hash format and
  nonnegative budget count. Prisma does not express these checks; retain them in
  subsequent migrations. Additional countries/hash versions require deliberate
  SQL changes as well as helper changes.
- Migration starts with bytes 2D-2D-20 (comment), not EF-BB-BF. No BOM detected at
  the file beginning. No migration was executed or marked applied.
- No backfill, implicit phone matching or account creation is present. Unique
  constraints prevent duplicate bindings, but do not define registration semantics.
- Generated-client support was not established from the inspected local generated
  schema search; no client generator was run. Before any compilation, approved
  generation must provide the new mobilePinCredential/mobilePinLoginBudget delegates.
  Do not equate a changed Prisma schema with a current generated client or live DB.

## PIN normalization, hashing and secret handling

mobile-number.ts:4–15 implements bounded India-only syntax: national ten digits
beginning 6–9, +91 form or 91+national form, with allowed presentation separators;
all return +91 canonical form. Region dispatch rejects unsupported regions. It is
not number assignment/reachability/possession verification. Six-digit PIN validation
requires a string; leading zeros remain intact and no password rules are weakened.

mobile-pin-hash.ts:4–55 uses an explicit version/parameter envelope, random 16-byte
salt, 64-byte scrypt output, N32768/r8/p1/maxmem64MiB, a purpose-separated HMAC
prehash bound to canonical mobile and a separately provisioned v1 pepper. Fixed
parameters prevent database strings requesting arbitrary work. Comparison is
timingSafeEqual; malformed/unknown hashes use admitted dummy work and reject.
Intermediate buffers are cleared; JavaScript string erasure cannot be guaranteed.

Pepper accepts 32–256 characters without surrounding whitespace, but source cannot
prove entropy, secure provisioning, separation from the rate key or backup custody.
There is no plaintext PIN field, PIN logging or use of OTP/email delivery helpers.
Only two process-local KDF jobs run concurrently; extra jobs fail closed. Combined
distributed/process capacity and practical scrypt timing remain unmeasured.

Six digits provide only one million possible secrets. Pepper protection helps
against a database-only leak; compromise of database plus pepper still allows a
small exhaustive search. Do not certify this as high-entropy authentication or
claim online throttling prevents offline cracking. No Forgot PIN is implemented.

## Rate limiting / temporary protection assessment

mobile-pin-admission.ts:36–73 uses an isolated table and HMAC-purpose/key namespace.
Global-row upsert locks serialize participating replicas, database time is sampled
after lock acquisition, and successful admission commits global/account counters.
Exhausted account/capacity denials retain aggregate consumption when the transaction
commits. Failures roll back/deny, never admit through a fallback. All shapes consume
aggregate admission when available; malformed credentials stop before hashing.

Bounded cleanup removes at most 100 expired account rows per admitted aggregate
attempt. Live buckets are counted, not evicted; fixed capacity and transaction
timeouts bound some resource use. Legacy registration cleanup cannot erase this
table. Global row contention and count/cleanup performance need later measurement.

Default account budget is five attempts per 900000ms, global 300 per 300000ms,
live account capacity 10000. Account denial lasts until the original fixed window
ends, not 15 minutes from the most recent error. Success does not clear counters.
There is no escalating/permanent ban, failed-only counter, trusted network/device
abuse limiter or differentiated Retry-After contract. These are limitations and
policy decisions, not features already implemented. Predictable temporary/global
denial of service must be considered before enabling. Changing policy/key mid-window
across replicas can change enforcement; use consistent settings and controlled rotation.

## Auth.js, sessions and compatibility

backend/auth.ts adds one conditional `mobile-pin` Credentials provider, leaving
password/optional social/email/demo providers and existing jwt/session/signout
callbacks unchanged in the reviewed diff. The provider exists only for literal
AUTH_MOBILE_PIN_ENABLED=true at process initialization. The authorizer also checks
the flag at request time. No fallback to PIN demo accounts exists.

mobile-pin.ts:9–26 looks up only canonical credential identity, never Profile.phone.
It verifies before requiring a real nonsuspended profile, then rechecks credential
ID/user/hash/version/suspension after expensive work. Returns only stable Auth.js
user fields/sessionVersion, not phone/hash/role claims supplied by the client.

Existing issueSession/validateSession/revokeSession in session-registry.ts remain
authoritative, with hashed random session IDs, expiry/version and suspension checks.
The jwt callback invokes these and reads role from Profile; existing protected
middleware and role rules are not modified. Auth.js supplies CSRF cookies/callback
validation; canonical redirect and cookie behavior are unchanged. Nullable email
is supported by existing User schema and next-auth type augmentation.

Future PIN updates MUST increment User.sessionVersion atomically and revoke old
sessions. The two credential reads alone do not establish atomic protection against
arbitrary future update/enrollment code. No such write path is present now. Existing
email password reset changes PasswordCredential, not the PIN hash; no new recovery
or linking path was added. Default-off preserves current provider exposure, but
compilation still requires the new generated Prisma types even when the flag is off.

Website/admin runtime regression, adapter compatibility under actual phone-only
accounts, concurrent session issuance and unavailable database behavior were not
tested. No new bypass was established by source review; this is not a security
certification of all pre-existing endpoints.

## Environment configuration and missing evidence

No secret environment file or effective Railway settings were read. Actual presence
or compliance is UNKNOWN, not presumed missing.

| Setting | Required before activation |
|---|---|
| AUTH_MOBILE_PIN_ENABLED | Leave disabled until all gates reviewed; literal true only after explicit owner approval |
| MOBILE_PIN_PEPPER_V1 | High-entropy independent secret, 32–256 chars, no surrounding whitespace; retain securely for v1 hashes |
| MOBILE_PIN_RATE_LIMIT_KEY | Independent high-entropy 32–256 char secret, consistent across replicas; rotation/protection implications reviewed |
| MOBILE_PIN_ACCOUNT_WINDOW_MS / ACCOUNT_ATTEMPTS | Full second name is MOBILE_PIN_ACCOUNT_ATTEMPTS; defaults 900000/5; positive integers, caps 86400000/20 |
| MOBILE_PIN_GLOBAL_WINDOW_MS / GLOBAL_ATTEMPTS | Full second name is MOBILE_PIN_GLOBAL_ATTEMPTS; defaults 300000/300; caps 3600000/10000 |
| MOBILE_PIN_MAX_ACCOUNTS | Default 10000, positive integer up to 100000 |
| Existing DATABASE_URL / AUTH_SECRET / canonical auth settings | Privately confirm intended staging target; consistent AUTH_URL/NEXTAUTH_URL with approved AUTH_STAGING_ORIGIN, appropriate NEXT_PUBLIC_SITE_URL; preserve existing secrets |

Policy/secret validation is feature-local process.env handling rather than the
shared envSchema. No OTP/SMS/email-provider setting is required for this provider.
Readiness documentation does not establish configured keys or deployed tables.

## Can this support registration and login?

**In principle yes, conditionally; neither is operationally verified.** Foundation
hash/identity/provider/session primitives can support a future strict enrollment
endpoint. It must admit before hashing, validate confirmation, create User/default
USER Profile/credential atomically, preserve emailVerified:null/whatsappVerified:false,
catch only expected number uniqueness races, and never attach an existing account
through a phone match. Existing-account enrollment/collision policy remains unresolved.

There is no public registration/enrollment endpoint, authorized credential fixture,
Flutter phone/PIN protocol or account migration path yet. No account was created.
Do not enable the provider merely because these primitives exist. Provider activation
does not register users, configure secrets or apply tables automatically.

## Safe enablement gates — not executed

1. Approve source review/policy responses, particularly temporary-protection semantics
   and first-claim number identity without possession proof. Keep provider disabled.
2. Separately authorize generated-client preparation, typecheck/regression/security
   tests and KDF/capacity checks; none authorized or performed in this review.
3. Authorized infrastructure/database owner confirms staging-only target and full
   pending migration history, backup/restore readiness and exact deployment commit.
   Only then consider separate permission to apply the migration; do not assume the
   deployment runs only this new migration or infer production state from staging.
4. Privately provision/validate separate keys and consistent policy, only when
   authorized; never share secret values in chat. Schema presence independently
   verified later using authorized access, not inferred from source.
5. Implement/review enrollment in a later milestone; separately authorize account
   fixtures/data writes. Preserve stable IDs, roles and legacy web/admin behavior.
6. Explicitly approve staging activation/restart/deployment and controlled callback,
   session, revocation, duplicate/concurrency and role tests. Review results before
   any production proposal. Flutter integration remains separate authorization.

## Changes and checks performed

Only mobile-app/docs/MOBILE_PIN_FOUNDATION_REVIEW.md was created. Existing source,
schema/migration files, configuration and committed milestone were not modified.
Read-only Git status/log/diff and local source/document/byte inspection only.
No tests, builds, compilation, Prisma commands, migrations, database connections,
accounts, OTPs, HTTP requests, environment/Railway changes, deployments, commits or
pushes. No confirmed defect was silently fixed. Stop pending owner approval.
