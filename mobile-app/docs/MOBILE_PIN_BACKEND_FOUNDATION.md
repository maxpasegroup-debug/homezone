# Mobile PIN backend foundation — milestone 1

Date: 2026-10-30. IMPLEMENTED IN SOURCE, NOT COMPILED OR RUNTIME VERIFIED.
Read first: MOBILE_PIN_AUTHENTICATION_AUDIT.md,
MOBILE_PIN_AUTHENTICATION_IMPLEMENTATION_PLAN.md and BACKEND_API_INVENTORY.md.
Source matched their finding: no existing PIN identity/provider. Latest milestone
explicitly preserves website/admin authentication; global legacy-provider cutover
questions in the plan are therefore not implemented here.

## Scope and files

| File | Change |
|---|---|
| prisma/schema.prisma | User.mobilePinCredential relation; new MobilePinCredential and MobilePinLoginBudget models |
| prisma/migrations/20261030120000_mobile_pin_foundation/migration.sql | Additive empty tables, unique/index/foreign-key/check constraints; no backfill, linking, writes to existing users or destructive changes |
| src/lib/auth/mobile-number.ts | Bounded India-only canonical normalization and exact six ASCII-digit PIN check |
| src/lib/auth/mobile-pin-hash.ts | Salted, peppered, versioned scrypt generation/verification and bounded process KDF concurrency |
| src/lib/auth/mobile-pin-admission.ts | Separate configurable PostgreSQL aggregate/account admission and temporary protection; no legacy quota changes |
| src/lib/auth/mobile-pin.ts | Fail-closed credential authorization by canonical login identity, credential/version/suspension recheck |
| backend/auth.ts | Default-off mobile-pin Auth.js Credentials provider; existing providers/callbacks unchanged |
| This document and implementation-plan status addendum | Source handoff, configuration names, limitations and activation gates |

No dependencies added. No Flutter, existing password/reset/email/OTP handlers,
role policy, profile-contact edit, Android renderer or staging JSON changed.

## Number and credential contract

`normalizeMobileNumber(value, region='IN')` supports 10 national digits starting
6–9, the same number prefixed +91, or 91 plus ten digits. Spaces, parentheses and
hyphens are tolerated within a bounded 32-character input; output is always
`+91` plus ten national digits. Other regions, prefixes, Unicode numerals, trunk
0/0091 forms and other punctuation are rejected. This is an initial syntax policy,
not proof of allocation, reachability or possession. Additional regions require
explicit code/SQL constraint review, not permissive prefix stripping.

PIN input is a string matching ^[0-9]{6}$; leading zeros are preserved. No trimming,
numeric coercion, password-complexity rule or OTP verification. No PIN is persisted
in plaintext. Future registration must validate confirmation, perform separate
admission and create User/default USER Profile/credential atomically. That service,
duplicate acknowledgment UX and account enrollment are NOT implemented here.

MobilePinCredential has unique normalizedMobile and unique userId, pinHash, stable
id and timestamps; foreign key to User. It is independent of editable Profile.phone,
which stays contact data. No existing phone match, email match, upsert, default PIN,
synthetic email or account link is used. Database uniqueness prevents duplicate
credential bindings, but is not a complete public registration implementation.

## Hash design

Format: `scrypt:v1:n32768:r8:p1:<32 lowercase hex salt>:<128 lowercase hex key>`.
Each hash uses 16 cryptographically random salt bytes; derives 64 bytes with
scrypt N=32768,r=8,p=1,maxmem=64MiB. Before scrypt, HMAC-SHA256 uses the separate
MOBILE_PIN_PEPPER_V1 with purpose/version, canonical mobile and PIN binding.
Only the salt/version/hash is stored. Buffer comparisons use timingSafeEqual;
intermediate derived/input buffers are cleared where practicable. JavaScript
strings cannot be guaranteed erased from memory.

Unknown users and malformed/unsupported hash versions perform the same fixed-cost
dummy derivation after admission, then reject. The helper accepts only its fixed
version/parameters; stored values cannot request arbitrary KDF cost. At most two
derivations run concurrently per Node process; excess work fails closed, not queued
without bounds. This process cap supplements, never replaces, database protection.

Six digits have only one million possibilities. Salt/KDF do not create entropy;
database plus pepper compromise still permits exhaustive offline guessing. Costs
are explicit conservative source choices, not benchmarked deployment guarantees.
Capacity and security review are required before enabling. Missing/invalid pepper
denies authentication. Only v1 is supported: no key rotation or PIN recovery service
was added. Pepper loss makes credentials unusable; retain it securely and review
rotation strategy before real enrollment. Do not change the key casually.

## Persistent admission and temporary protection

New MobilePinLoginBudget is isolated from legacy RegistrationBudget cleanup/keys.
The global upsert takes a row lock; PostgreSQL clock_timestamp is read after lock
acquisition. The transaction counts global and HMAC-number-keyed attempts across
replicas; only expired account rows are removed, at most 100 per admission. Live
identity capacity is bounded, not evicted to admit attackers. Storage errors,
invalid configuration, lock timeout or capacity exhaustion deny; no permissive
process-local fallback. Unknown numbers and malformed shapes consume aggregate
budget; malformed PIN/number shapes never start a KDF.

Default account policy: at most five total attempts per 15-minute fixed window.
This counts successful and failed attempts and is NOT reset by successful login.
After exhaustion, all PIN login for that number is denied until that first-admission
window expires. It is temporary protection, not an escalating/permanent failed-PIN
lock and not 15 minutes from the most recent failed attempt. Aggregate default:
300 attempts per five-minute window; default 10,000 live account buckets. Denials
consume aggregate budget when possible, and return ordinary Auth.js failure rather
than exposing account-specific limits. No Retry-After contract is invented for
Auth.js credentials errors. Thresholds and fixed-window semantics need owner review
before enabling; deliberate lockout/global-budget denial of service remains possible.
There is no trusted per-network/device limiter in this milestone.

## Configuration — names only; none set or changed

Read directly from process.env within this isolated feature (as the existing
password limiter does); no global env-schema validation was broadened to break
legacy startup. Numeric parsing uses positive decimal integers and explicit caps.

| Variable | Requirement / default / bounds |
|---|---|
| AUTH_MOBILE_PIN_ENABLED | Only literal true includes the provider. Unset/other values leave it absent. A deployment restart would be required after an authorized change; none performed |
| MOBILE_PIN_PEPPER_V1 | Required for hash/verify; separate high-entropy owner-provisioned secret, 32–256 characters, no surrounding whitespace |
| MOBILE_PIN_RATE_LIMIT_KEY | Required for admission; distinct-purpose high-entropy secret, 32–256 characters, no surrounding whitespace; key rotation affects protection buckets |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | Default 900000; positive integer, maximum 86400000 |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | Default 5; positive integer, maximum 20 |
| MOBILE_PIN_GLOBAL_WINDOW_MS | Default 300000; positive integer, maximum 3600000 |
| MOBILE_PIN_GLOBAL_ATTEMPTS | Default 300; positive integer, maximum 10000 |
| MOBILE_PIN_MAX_ACCOUNTS | Default 10000; positive integer, maximum 100000 |

Existing DATABASE_URL, AUTH_SECRET and canonical Auth.js/origin settings are reused.
No new SMS/email/provider credentials, OTP_PEPPER or email delivery dependency.
Never send secret values through chat or logs. Current effective feature flag and
secrets were not inspected; default-off describes source behavior, not Railway state.

## Auth.js/session integration

When enabled at process initialization, existing GET /api/auth/csrf and form
POST /api/auth/callback/mobile-pin dispatch through the existing catch-all. Login
fields are phone and pin, plus Auth.js csrfToken/callbackUrl. No separate login
API, manual cookie minting or bearer token is introduced. Auth.js CSRF validation,
canonical redirects, JWT callbacks, session registry/revocation, sessionVersion,
expiry, protected API authorization and role normalization remain unchanged.

The authorizer admits before KDF, looks up only MobilePinCredential.normalizedMobile,
verifies hash (including dummy work for missing bindings), requires a real profile
and rejects SUSPENDED. After expensive work it rechecks binding/hash/user/version
and suspension. It returns only Auth.js user fields and sessionVersion, never phone
or hash. The existing issueSession callback rejects a changed User version before
session issuance; later validation handles revocation/suspension. Future PIN changes
must increment User.sessionVersion atomically and revoke sessions; no change-PIN
or enrollment helper exists here. Rechecks are not claimed a substitute for that
future transactional version rule.

Existing password, Google/email and demo provider code remains unchanged. PIN
foundation does not replace or silently disable web/admin login. No profile role
or verification flag is changed; no phone possession, email ownership or team/
organization privilege is inferred. Default USER assignment belongs to future
registration, not the login authorizer.

## Migration, compilation and activation boundaries

Migration SQL was written, NOT executed. It creates the two new tables, primary
keys, unique normalizedMobile/userId indexes, User foreign key, resetAt index and
CHECK constraints for Indian canonical mobile, versioned hash shape and nonnegative
budget count. Existing contact-phone index/data are not changed. Prisma models do
not express these SQL checks; preserve them in future migrations. CHECK constraints
restrict current version/region and require a reviewed additive change for expansion.

Generated Prisma client has NOT been regenerated. The existing build/install
workflow must generate the client from the updated schema before compilation can
recognize the new delegates. No generator, typecheck, tests or build was run.
Source is not claimed compile-validated. New migration joins normal migrate-deploy
inventory; adding it does not authorize deployment or any earlier pending migration.

Before any future migration, authorized owner must reconcile target identity and
migration history/schema, confirm staging isolation and backup/restore evidence,
and approve the exact deployment commit/pending set. Production untouched.
Before enabling the provider, separately authorize generated-client/build/security
checks, applied schema confirmation, secret provisioning, policy/capacity review
and real staging account enrollment. There are deliberately no new credentials
to authenticate until a later authorized registration/enrollment milestone.

## Later verification, not executed

Review normalization boundaries and equivalent Indian formats; six digits/leading
zeros; salt uniqueness/version/unknown/malformed hash handling; failure on missing
keys; no credentials in diagnostics; aggregate/account window expiry and capacity;
concurrent replicas/clock/cleanup behavior; correct/incorrect/unknown PIN responses;
suspension and sessionVersion race; unchanged web/admin/CSRF/logout behavior;
foreign-key/unique/check constraints; absence of linking/profile role mutation.
All require separate test/build/runtime/database authorizations as applicable.

Registration, Forgot PIN, OTP, Flutter integration, legacy-user cutover, real data
enrollment and production activation are outside milestone 1. No accounts created.

## Checks actually performed

Local document/source inspection and read-only Git status/diff. New source and SQL
were reviewed as text only. No typecheck, tests, builds, Prisma generation/commands,
database connections/queries/writes, accounts, live requests, OTP, environment or
Railway changes, deployments, commits or pushes. Existing work preserved.
