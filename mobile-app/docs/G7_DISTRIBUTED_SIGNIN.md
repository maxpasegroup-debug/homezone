# HOMEZONE - G7 shared password-sign-in admission

Local engineering update, 2026-10-24. **G7: BLOCKED** pending owner decisions and
authorized multi-instance verification. **Staging and production: NOT VERIFIED.**

Final review, cross-namespace cleanup fix and reproducible two-instance plan:
[G7_MULTI_INSTANCE_VERIFICATION_PLAN.md](G7_MULTI_INSTANCE_VERIFICATION_PLAN.md).
Earlier validation counts below are historical. G7 remains BLOCKED.

## Implementation

The password Auth.js provider in backend/auth.ts now awaits allowPasswordSignin
before user lookup/password verification. It uses the existing PostgreSQL
RegistrationBudget model/table; no new provider, schema change or migration is
introduced. The existing email-registration migration must already be applied to
an approved target before this server path can work. Missing table/secret/storage
fails closed; this phase applied no migration and connected to no database.

Runtime admission ALWAYS uses shared storage, including development server auth.
There is no automatic memory fallback or multi-instance mode switch. The old
createPasswordSigninLimiter helper remains a process-local reference tested by
existing cases; neither backend auth nor allowPasswordSignin invokes it. Default
Flutter offline preview is unaffected.

Keys are password-signin:v1:global and password-signin:v1:account:<HMAC-SHA256>.
The HMAC covers trimmed/lowercase identifier with a dedicated shared key, not the
password, cookie, IP or plaintext account identifier. No sensitive values/errors
are logged or returned. Known/unknown identifiers follow identical admission;
account lookup still has its existing timing differences, so timing-based account
enumeration resistance is NOT claimed.

Each admission is one interactive transaction. An upsert/no-op increment acquires
the fixed global row lock FIRST, serializing all participating instances' account
creation, capacity checks and increments. Database clock_timestamp() is read AFTER
the lock, avoiding instance-clock disagreement or time sampled before lock wait.
Expired fixed windows reset on admission; account windows start with their first
admission and rejected attempts do not extend them. Active policy/key must be
identical on every worker. The transaction returns false (committing aggregate
consumption) on account/capacity rejection; storage errors roll back and deny.

Global exhaustion stops before account lookup/cleanup. Every globally admitted
attempt consumes aggregate quota, even when an account is throttled or credentials
are missing. Account admission occurs before user lookup for both existing and
unknown accounts. Live account buckets are never evicted. At most 100 expired
account rows are physically removed per globally admitted request; live capacity
is counted under the same global lock. Cleanup is namespace-scoped and does not
erase registration quotas. Idle expired rows may remain until requests/approved
operations cleanup; resetAt is logical expiry, not a database TTL deletion promise.

This provides shared ACCOUNT and AGGREGATE budgets only. There is no trustworthy
client identity supplied by current ingress configuration; no client/client-account
IP budgets were invented and no forwarded headers are accepted by this API.
Those dimensions require an owner-approved ingress contract and edge enforcement
or a separately reviewed extension. Targeted account denial and aggregate
exhaustion remain possible. This is not comprehensive anti-abuse protection.

## Configuration and failure behavior

| Setting | Contract |
|---|---|
| DATABASE_URL | Existing Prisma datasource, same isolated database/schema for every worker. Required table: RegistrationBudget from existing registration migration. Owner verifies grants, pooling and target; presence is not isolation. |
| PASSWORD_SIGNIN_HMAC_KEY | NEW required server-only secret, 32-256 characters; provision high entropy (e.g. >=32 random bytes encoded safely), independent of AUTH_SECRET/OTP_PEPPER, identical on workers. Read directly by runtime, not included in generic ops:env audit. Missing/invalid key denies sign-in without querying storage. Never pass through Flutter defines. |
| PASSWORD_SIGNIN_WINDOW_MS | Existing positive decimal integer, default 300000, maximum 3600000. Shared fixed-window duration. |
| PASSWORD_SIGNIN_ACCOUNT_ATTEMPTS | Existing positive integer, default 10, maximum 10000. Shared normalized-account ceiling. |
| PASSWORD_SIGNIN_TOTAL_ATTEMPTS | Existing positive integer, default 1000, maximum 100000. Shared aggregate ceiling, no longer per process. |
| PASSWORD_SIGNIN_MAX_ACCOUNTS | Existing positive integer, default 10000, maximum 100000. Shared live account-bucket capacity, not process-local capacity. |

Do not hot-roll inconsistent key/policy versions. HMAC rotation changes account
keys and can reset account enforcement/cause capacity denial; it does not reset
the global key. Equal-length mismatched keys are not automatically detected.
Approve a paused/controlled transition and reconciliation/retention
procedure; never rotate or delete live counters to bypass quotas. Dedicated key
length checks do not prove entropy, secure custody or cross-worker agreement.
Before any future rollout, confirm the existing table migration, provision the
new key and drain older application workers using the process-local path. Mixed
old/new versions do not provide one shared enforcement boundary. No deployment or
rollout operation is authorized or performed by this local implementation.

Malformed counters/database time, missing tables, connection errors, transaction
timeout and invalid policy all deny; no raw exception is propagated. Interactive
transaction settings are maxWait 2000ms and timeout 3000ms. These are NOT a universal
end-to-end network SLA; owners must set compatible connection/pool/SQL lock and
statement timeouts and confirm cancellation/rollback under actual PostgreSQL.

Denial returns null to Auth.js, preserving generic CredentialsSignin before new
session issuance. No account-specific 429/Retry-After is added to distinguish
failure reasons or bypass the existing credential contract. Clients should not
automatically replay password attempts. Existing valid sessions are not implicitly
revoked by a denied fresh sign-in. CSRF checks, independent client session
verification, session registry, logout and ownership boundaries are unchanged.

## Operational and authorization dependencies

Infrastructure/DB/security owners must approve table reuse/capacity, same target,
least-privilege operations, key/policy provisioning, connection/lock budgets and
single-global-lock throughput. Registration cleanup now explicitly excludes the
password namespace so its application clock cannot expire password rows. That lock is intentionally simple and can become
a bottleneck; load/latency/capacity results are unknown. Registration cleanup also
shares this table; rehearse concurrent cleanup/expiry and deadlock recovery. No
unrestricted fallback is permitted when the database is unavailable.

Ingress owner must prove direct-origin restrictions, TLS/Host/proto correctness,
header overwrite/rejection and body/time/concurrency/client abuse limits. General
legacy rate-limit utility remains in memory and trusts forwarded headers; it is
not upgraded by this password change. Initial testing remains single-process until
distributed verification and ingress/client dimensions are approved.

Monitoring owners must observe generic auth failures, database availability,
transaction/lock/pool latency/timeouts, global exhaustion, live/expired capacity and
cleanup backlog using safe bounded labels, never account/HMAC keys, request bodies
or passwords. Current bool API intentionally does not expose detailed reason
codes; fine-grained redacted alert instrumentation remains an owner-approved task.
Redaction/alerts/retention are not established by merely passing these tests.

Before closing G7, separately authorize real isolated multi-instance requests:
same-account and rotating-account concurrency, persisted counters after worker
restart, exact expiry after lock wait, full capacity/cleanup, simultaneous OTP
traffic, database timeout/unavailability/recovery and generic denied sessions.
Prove configured ceilings across workers and no fallback/extra session issuance.
Approve client/client-account enforcement as well. No such test occurred here.

## Local regression evidence

tests/fixtures/shared-signin-store.mjs serializes and rolls back in-memory fixture
transactions; it is NOT PostgreSQL. Two independent limiter objects use the same
fixture store to exercise shared normalized keys, aggregate/account bounds,
capacity, exact store-time expiry, malformed state, failures and recovery. A new
runtime test requires the explicit key, and real Auth.js callbacks with mocked
storage prove denied/missing-account attempts issue no sessions and recovery does
not bypass exhausted account counters. Existing local-helper regressions remain.

## Commands and results

All commands ran locally with cached dependencies and mocked DB/auth fixtures:

| Command | Result |
|---|---|
| node --test --test-isolation=none tests/password-signin-limit.test.mjs | Exit 0; 14 passed, including 6 new shared cases and 8 retained local-reference cases. Final focused rerun after adding mid-transaction rollback assertion also exit 0, 14 passed. |
| npm run typecheck | Exit 0; tsc --noEmit. |
| npm test | Exit 0; TypeScript, 6 smoke checks and 127 reported Node tests: 22 auth, 21 leads, 20 sessions, 14 limiter, 10 mobile API, 40 registration. Repeated after the final fixture assertion; final result recorded below. |
| npm run lint | Exit 0; final rerun recorded below. |
| .\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma | Exit 0; matching cached Windows engine and inert loopback URL/mirror, no DB connection or migration. |
| git -c core.safecrlf=false diff --check | Exit 0 at interim checks; final check and hash/status comparison recorded below. |

No skipped/failing tests or diagnostic suppressions were introduced. Mock-store
transaction serialization is an assumption of the fixture; only authorized real
PostgreSQL tests can establish row-lock, isolation, deadlock and timeout behavior.
No real database, trusted-ingress identity or multi-instance load was verified.

No Flutter or Android changes/builds, remote requests, migrations, email sends,
package installs or production/staging verification are part of this phase.

Final npm test rerun: exit 0, 127 reported Node tests plus six smoke checks and
TypeScript. Final lint rerun: exit 0. Final git diff --check: exit 0.
Logs and initial/final status/hash evidence: ignored mobile-app/build/qa-g7.

Git remained main at 9cba8d77afabedd5fbf32af638a3ee45615487e5. Initial status:
38 modified/40 untracked; final 41 modified/42 untracked, zero staged. All 78
initially changed files remain; unrelated files were byte-identical to their
recorded hashes. Three previously clean tracked code/test files and two new files
explain the increase. Existing QA evidence was preserved; no index/history mutation.

Files changed in this phase: backend/auth.ts; src/lib/auth/password-signin-limit.ts;
tests/password-signin-limit.test.mjs; tests/session-security.test.mjs;
tests/fixtures/shared-signin-store.mjs (new); this report (new);
OWNER_EVIDENCE_REVIEW.md; INFRASTRUCTURE_OWNER_SIGNOFF.md;
INFRASTRUCTURE_READINESS_GATE.md; LOCAL_BLOCKERS_VALIDATION.md.

Decision: shared account/aggregate engineering is locally implemented and tested.
G7 remains **BLOCKED**; other gates remain **PENDING EVIDENCE**. Next action is
owner review of this database/key/policy design and trusted client controls, not
deployment or multi-instance testing without separate explicit authorization.
