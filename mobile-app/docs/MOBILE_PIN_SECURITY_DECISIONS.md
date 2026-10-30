# Mobile PIN security decisions — milestone 1B

2026-10-30. SOURCE REFINED — NOT COMPILED, TESTED OR RUNTIME VERIFIED.
Changes limited to the existing backend foundation and required documentation.

## Accounting and temporary protection

- `withMobilePinLogin` replaces boolean admission followed by an uncoordinated
  authentication operation. First transaction commits aggregate admission and
  allocates a number bucket under the global lock. Second locks the number bucket
  throughout the transaction-scoped credential reads and KDF. A successful returned
  identity never increments the failure count. Callback null (invalid PIN/unknown
  credential/suspended/missing or changed profile/binding) counts one failed
  authentication; operational exceptions roll back account changes. A later Auth.js
  session issuance failure does not retroactively make a correct credential a PIN failure.
- Number identity uses the existing canonical +91 helper. Counter keys use a
  dedicated HMAC purpose plus MOBILE_PIN_RATE_LIMIT_KEY, not phone/IP in cleartext.
  Replica or source-IP distribution does not produce a new number bucket.
- Default: five failed authentications in a fixed 900000ms window beginning at
  the first completed failure. The fifth fails; subsequent attempts are denied
  before checking the PIN until that deadline. No permanent lock, increasing ban
  or extension on blocked requests. After expiry, one new completed failure starts
  the next window. Success never increases the failure count and does not erase
  unexpired failures, avoiding concurrent-success resets bypassing protection.
- Default aggregate: 300 attempts per 300000ms, including correct credentials,
  malformed/unknown credentials and account-blocked attempts. Aggregate consumption
  commits before the verification transaction and is not refunded on storage/KDF
  errors. Invalid mobile shapes consume aggregate only; valid mobile + invalid PIN
  shape counts an account failure without expensive KDF. No IP trust is introduced.
- New failure namespace mobile-pin:v2:failures isolates previous v1 attempt counts.
  Global mobile-pin:v1:global remains shared. Old v1 account rows are untouched,
  not reinterpreted as failures. Controlled rollout must avoid mixed v1/v2 replicas;
  new namespace starts a new failure history while retaining global consumption.
  Do not rotate the HMAC key to clear attempts or enable mixed enforcement silently.
- Global lock never intentionally spans KDF. Cleanup selects up to 100 expired
  v2 rows FOR UPDATE SKIP LOCKED, so it does not wait on a verifier while holding
  global admission. Deleted/missing state between transactions denies, not recreates
  a bucket outside the capacity lock. Counts include expired rows pending cleanup
  to conservatively enforce a 10000-row v2 capacity. Success-only buckets eventually
  expire for cleanup; old v1 rows remain a bounded historical set.
- Number-row locks do span KDF and require an available database connection.
  Verification transaction: 2s maxWait/10s timeout; aggregate: 2s/3s. PostgreSQL time
  is sampled after locks and after verification; a failure crossing the previous
  deadline begins a fresh window. Two process-local KDF jobs remain the resource
  cap, in addition to distributed limits. Timeout/contention behavior is unverified.

This prevents an unbounded permanent/sliding account lock in the algorithm. It
cannot guarantee legitimate availability during a sustained distributed attack:
an attacker can consume successive windows or global budget. No OTP/possession
proof, trusted network/device abuse control or Forgot PIN is added. The six-digit
space remains small, and an identity can be squatted without number proof. Those
limitations need explicit acceptance before activation.

## Configuration

| Name | Current default / accepted setting |
|---|---|
| AUTH_MOBILE_PIN_ENABLED | Provider only included for literal true; leave off pending review and approved activation |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | 5 failed authentications; positive decimal integer <=20 |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | 900000; positive decimal integer <=86400000 |
| MOBILE_PIN_GLOBAL_ATTEMPTS | 300 total attempts; positive decimal integer <=10000 |
| MOBILE_PIN_GLOBAL_WINDOW_MS | 300000; positive decimal integer <=3600000 |
| MOBILE_PIN_MAX_ACCOUNTS | 10000 v2 failure-state rows; positive decimal integer <=100000 |
| MOBILE_PIN_RATE_LIMIT_KEY | Independent high-entropy 32–256 chars, no surrounding whitespace; same value across replicas |
| MOBILE_PIN_PEPPER_V1 | Independent high-entropy 32–256 chars, no surrounding whitespace; same v1 key across hash/verify nodes |

Bounds are implementation safeguards, not benchmarked production recommendations.
Policy changes can affect live windows; coordinate them rather than changing
replicas independently. No values were read/provisioned/changed in Railway.

## Diagnostics

New mobile-pin-diagnostics.ts accepts only closed unions of stage/category labels.
Warnings have a fixed message and no raw error, stack, SQL, request body, phone,
email, account key/id, PIN, salt/hash, pepper or cookie. Each label pair is emitted
at most once per minute per process (bounded label cardinality). Suppression is
only logging behavior; distributed auth protection remains database-backed.

Categories identify configuration, storage, KDF capacity and KDF operation failure.
Invalid credentials and normal quota denials do not produce identifier-bearing
logs. Hash errors use a fixed marker so the caller does not mislabel them as DB
errors. User-visible authentication remains generic null/Auth.js failure. No new
readiness HTTP endpoint or diagnostic secret exposure was introduced. A log event
does not reveal the exact DB cause; sanitized deeper diagnosis needs authorization.

## Query minimization/session compatibility

Both credential queries now select only id, userId and pinHash, with User id,
email/name/image needed for the unchanged Auth.js user shape, sessionVersion and
Profile.verificationStatus. Full profile/contact/role data are not selected by
this authorizer; existing session callback reads authoritative role afterward.
Queries run within the number-locked verification transaction. Existing hash/user/
version and suspension recheck remains; no account linking or profile mutation.

No backend/auth.ts provider definitions, CSRF/cookies/session-registry, session
revocation, protected APIs, roles, website/admin or Flutter behavior was altered.
Future PIN writes must still increment User.sessionVersion and revoke sessions
atomically; the read/recheck alone is not a future change-PIN transaction design.

## Pepper custody, backup and rotation

- Generate outside source/chat using an approved secret manager; store pepper
  separately from the database/backups and separately from the admission HMAC key.
  Length checks do not establish entropy. Never print either secret, hash or PIN.
- Give runtime only necessary access. Maintain access-controlled encrypted secret
  backup/escrow and documented restore custody. A database restore without its
  matching pepper cannot authenticate v1 credentials. Secret manager access/restore
  evidence must be checked privately; none was inspected here.
- Keep the key identified by MOBILE_PIN_PEPPER_V1 immutable for v1 records. Do not
  overwrite it to rotate: that invalidates every existing v1 hash. Current parser
  and SQL CHECK accept v1 only. The hash binds canonical mobile as well as PIN;
  a future number change cannot copy an old hash to a new identity.
- A future approved rotation needs version/key-id support, SQL constraint changes,
  reviewed dual-key transition and atomic rehash after a genuinely authenticated
  login while preserving binding/version checks. Offline rehash from existing
  scrypt output cannot produce a new peppered PIN hash without the PIN. Retain old
  keys until no permitted records/backups require them; define backup retention.
- Pepper compromise requires a separately approved incident plan, not assumed
  protection from hashing or silent re-enrollment. Lost pepper plus deferred
  Forgot PIN is an operational blocker. No rotation/recovery endpoint, default
  PIN, account merge or secret change is implemented in 1B.
- Admission HMAC key rotation also changes number buckets; coordinate invalidation
  and preserved global budget rather than silently resetting protection.

## Additional defects/limits reviewed

KDF active-job accounting now places HMAC derivation inside try/finally, so even
an unexpected pre-scrypt failure releases the job slot; fixed-category diagnostics
cover failure paths. Six-digit validation, versioned salted/peppered scrypt and
dummy unknown-user work remain. No new schema/migration is needed: existing budget
count/resetAt fields represent failed windows. Old all-attempt account rows are
not migrated or deleted. No source-level authentication bypass was established
by this inspection; untested code must not be treated as a security certification.

## Required later verification and blockers

Separately authorize generated-client/typecheck and regression/concurrency tests:
success leaves failures unchanged; five failures then temporary denial; unknown
and malformed cases; expired window and boundary-crossing KDF; multiple IPs and
replicas; simultaneous success/failure; aggregate spent on rolled-back operations;
SKIP LOCKED cleanup vs active verifier; capacity, lock/KDF timeout and crash;
configuration/storage diagnostics without secrets; unchanged CSRF/session/logout/
web-admin roles. No tests or compilation were run now.

Provider remains opt-in by unchanged source flag; effective infrastructure settings
unknown. Schema/client preparation, approved configuration/capacity, enrollment and
Flutter integration are still pending separate milestones. Do not enable or deploy
as part of this source refinement. No production/database/service access performed.

## Changes and execution record

Source: mobile-pin-admission.ts, mobile-pin.ts, mobile-pin-hash.ts and new
mobile-pin-diagnostics.ts. Documentation: updated foundation/review/implementation
plan and this new decision record. Existing working tree was clean at start.
An initial combined patch was rejected before application; subsequent edits were
applied without touching unrelated files. No schema/migration edits, database
connections/queries/writes, accounts, OTP, environment/Railway changes, tests,
builds, compilation, runtime requests, deployments, commits or pushes occurred.
