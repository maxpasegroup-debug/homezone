# HOMEZONE - G7 final local review and multi-instance verification plan

2026-10-24. **G7: BLOCKED. Staging: NOT VERIFIED. Production: NOT VERIFIED.**
All infrastructure cases below are **NOT RUN / NOT AUTHORIZED**. This is a plan,
not permission to provision, deploy, query a database, change policy, authenticate,
inject faults or create accounts. No remote action occurred in this review.

Approval-readiness addendum:
[G7_VERIFICATION_APPROVAL_PACKAGE.md](G7_VERIFICATION_APPROVAL_PACKAGE.md).
Its per-case cleanup, capacity/restart prerequisites, optional rotation scope and
evidence rules clarify this plan. Current decision is NOT READY; G7 stays BLOCKED.

## Code review

Source-review verdict: **NEEDS DISCUSSION** for infrastructure/client controls;
confidence **MEDIUM** because real PostgreSQL behavior remains unverified.

| Finding / disposition | Evidence | Assessment |
|---|---|---|
| P1 - fixed: cross-namespace cleanup could erase password counters under clock skew | src/lib/auth/email-registration.ts, admitDelivery cleanup; tests/registration.test.mjs | Registration cleanup previously selected every old RegistrationBudget row using application time. A sufficiently advanced application clock could classify a live database-time password row as old. Both selection and deletion now exclude password-signin: rows. Regression preserves global/account rows that look old to application time while still deleting an eligible registration row; it would fail against the previous implementation. No actual skewed server/database was tested. |
| P2 / deployment prerequisite: valid but different HMAC keys are not detected automatically | password-signin-limit.ts: createSharedPasswordSigninLimiter | Different worker keys split account buckets; global quota remains shared. Missing/short keys deny, but equal-length mismatches do not. Owner must attest identical secret-manager version and policy; no automatic configuration-consistency guarantee is claimed. |
| P2 / operational prerequisite: single global lock and storage timeout behavior unmeasured | password-signin-limit.ts transaction; shared table/index migration | Serializing on one row is deliberately simple. Throughput, connection exhaustion, cancellation, DB isolation and SQL generation must be observed on the approved toolchain/target. Prisma maxWait/timeout are not an end-to-end SLA. |
| Remaining G7 dependency | API accepts identifier only; general rate utility still trusts forwarded IPs | Shared account/aggregate quotas exist; trusted client/client-account protection and ingress contract remain unapproved. Targeted account denial and aggregate exhaustion remain possible. |

After the narrow cleanup fix, no further P0/P1 source defect was confirmed in this
review. This is not a penetration test or approval of actual distributed behavior.

### Traced invariants and limits

- backend/auth.ts awaits allowPasswordSignin before user lookup/password checking.
  Auth.js installed callback dispatch validates credentials CSRF before authorize;
  null becomes CredentialsSignin before JWT/session issuance. Registry/provenance,
  revocation and existing expiry safeguards are unchanged. A previously valid
  session is not revoked merely because a new attempt is denied.
- Shared admission writes only inside one interactive transaction: upsert/no-op
  update of the fixed global row, then DB clock_timestamp(), expiry reset,
  aggregate consumption, bounded expired-account cleanup, live-capacity count and
  account increment. All participating admissions acquire the same row first.
  Source is consistent with serialized account/capacity enforcement; actual Prisma
  SQL/locking and configured isolation still require observation. First-row races,
  serialization failures or deadlocks may deny conservatively, never fall back.
- Normal account/capacity denial commits aggregate consumption; global denial
  stops at its ceiling. An error before commit rolls back transactional writes.
  A connection lost during commit acknowledgement has an UNKNOWN outcome and may
  consume quota even though the request is denied. Do not claim every transport
  failure implies zero counters, refund it, or retry automatically.
- Password keys are normalized-account HMAC-SHA256 under a dedicated 32-256
  character shared key. Entropy/custody/equality cannot be proved by a length
  check. No passwords/IPs/plaintext identifiers are stored by the limiter. Stable
  HMACs remain sensitive pseudonymous data; do not log them or use them as labels.
- Database time is sampled after the global lock. Expiry is resetAt <= DB time;
  request rejection never extends an account window. Expiry is logical, not a TTL
  daemon. Registration cleanup is now isolated from password rows; operational
  cleanup must preserve this ownership too.
- Runtime configuration/storage failure denies with generic credential error and
  no memory fallback. Known/unknown identifiers use the same admission, but existing
  password lookup timing differences remain; timing enumeration resistance is not
  established. No new account-specific Retry-After/429 contract is introduced.

## Required approvals and preflight - all PENDING EVIDENCE

| Owner | Required signed evidence before dependent activity |
|---|---|
| Infrastructure + DB | Dedicated app instances A/B and ONE isolated PostgreSQL database/schema; runtime/migrator target agreement; production-denied roles/network policy; actual migration/checksum/drift history and RegistrationBudget/index definitions; reviewed backup/restore. No migration is authorized by this plan. |
| Security + secret custodian | Same high-entropy PASSWORD_SIGNIN_HMAC_KEY secret reference/version on A/B, independent from AUTH_SECRET/OTP_PEPPER; no values or secret fingerprints in reports. Same policy manifest; controlled rotation/rollback, drain old process-local workers and prevent mixed versions. |
| DB + application owner | Approved W/A/G/C policy below, table reuse/grants, isolation level, DB/Prisma versions, pooling, connection/lock/statement/transaction budgets and capacity. Existing runtime maxWait=2000ms, timeout=3000ms; approve compatible settings, do not silently increase them during tests. |
| Ingress + security | Canonical HTTPS/Host/proto, direct-origin restrictions, repeated Set-Cookie, header overwrite/rejection and trusted address contract; client/client-account abuse controls. Approved routing must identify A/B without exposing a direct-origin bypass or trusting caller-supplied identity headers. |
| Monitoring + incident/DB | Named operator/observer/on-call, redacted metrics and DB observations, thresholds, stop/resume authority, scoped cancellation/outage mechanism and successful recovery rehearsal. No raw SQL parameter/body capture. |
| Test authorizer + privacy/product | Named disposable account/mailbox fixture aliases, strong credentials held privately, real customer data excluded; exact endpoints, cases, request/session/concurrency/time ceilings and retention/cleanup. Explicit separate authority for two instances, restart, faults, SQL locks/cancellation, quota tests and recovery. No email/registration is required to exercise pre-provisioned sign-in fixtures. |

Authorized artifact, origin, DB identity and config evidence must match BOTH
instances. Default offline APK/build success is insufficient. Until G7 closes,
normal staging plans remain single-process; a two-instance verification window
requires a specific exception limited to this isolated experiment, not rollout.

## Reproducible protocol and measurements

Owner supplies and signs these non-secret parameters; none is selected here:
W=window milliseconds, A=account ceiling, G=aggregate ceiling, C=live bucket
capacity; N=request count, K=fixture accounts, R=parallelism, D=case deadline,
lock/latency ceilings and per-case/total request budget. For same-account tests
choose A < N <= G; for aggregate tests choose N > G, C >= K and per-account attempts
<= A. Approve values small enough for controlled tests and large enough to finish
before W. Never change values mid-case or reuse a live window as an empty baseline.

For each independent case, use a dedicated approved database copy or wait for
natural expiry and verify count-only baseline. Never clear live counters to make
a test pass. Pause unrelated traffic/automatic retries. Record all setup/warmup
attempts: they consume quota. Keep cleanup verification separate from mutation.

Runner protocol (future authorized execution only):

1. Prove requests reach both A and B through approved routing and the same public
   origin/config. Use sanitized instance aliases, not attacker-selectable IP headers.
2. Allocate a NEW cookie jar for each attempt with no existing authenticated
   session. Bootstrap GET /api/auth/csrf, retain token/cookie only in volatile runner
   memory, then POST /api/auth/callback/password with the existing form contract.
   Start callbacks behind a controlled barrier; do not share CSRF state across jars.
3. Use correct credentials for existing disposable fixtures when counting admitted
   successes. Wrong passwords alone cannot distinguish limiter denial from normal
   failure. Only an independently validated GET /api/auth/session response counts
   as authenticated; callback redirect/HTTP status alone does not.
4. DB observer privately maps fixture aliases to relevant rows and reports counts,
   deadline relations and transaction outcomes, never raw HMAC keys/identifiers.
   Record instance, UTC/DB timestamps, case/request alias, safe status/error category,
   latency, session-present boolean and count-only registry deltas. No passwords,
   cookie/CSRF/session values, email addresses or HAR/body/SQL-parameter dumps.
5. Do not blindly follow a redirect to an unapproved origin. Mark any unexpected
   storage/downstream failure or window crossing INCONCLUSIVE, not evidence that
   a lower success count proves the intended limiter boundary.

Universal STOP: wrong/production target/data; uncontrolled routing/recipient;
secret disclosure; unauthorized account/privilege action; lost monitoring or
recovery owner; cap/deadline/lock budget exceeded; unexpected schema/data mutation;
or valid session issued after confirmed denied admission. Stop traffic, preserve
sanitized evidence and use the approved incident plan; no automatic retry/resume.

## Multi-instance cases - all NOT RUN

Each row inherits the protocol, universal STOP and separate permission above.

| Case / preconditions | Test actions | Expected DB behavior | Expected response/session | Evidence to capture / additional STOP |
|---|---|---|---|---|
| T1. Same account; healthy A/B, empty baseline, A < N <= G; C >=1 | Barrier-start N valid callbacks across both instances for one fixture. Include approved case/whitespace variants; complete before expiry. | Exactly one shared account bucket, admitted account count A, global count N (account denials consume aggregate). No counter exceeds its ceiling. | In a healthy downstream path A independently verified fresh sessions, N-A generic CredentialsSignin failures/no sessions. | Per-worker request totals, private same-row equality result, counts/deadlines and verified-session booleans. STOP on split buckets, overshoot or unexpected error; latter makes exact-success assertion inconclusive. |
| T2. Aggregate; fresh baseline, N>G, K/C/per-account allocation prevents account/capacity throttling | Barrier-start rotating valid fixture credentials across A/B. Send one additional valid attempt to each worker after exhaustion, within same window. | Global count G; sum of account increments G. Later requests do not create/increment accounts once global is full. | G successes only if healthy downstream; remaining callbacks generic/no sessions. | Count-only global/account totals, no new registry rows for denied requests. STOP on either worker independently admitting beyond G or case crossing expiry. |
| T3. Natural expiry/recovery; known exhausted row and recorded DB resetAt | Before expiry probe denial; after DB time >= resetAt send approved sequential probes through A then B. Observe account/global deadlines independently; do not modify clocks/rows. | Only actually expired windows reset; first new admission counts1 and establishes a fresh deadline, next worker shares it. No premature eviction/reset or doubled allowance. | Denied before relevant expiry, admitted after all applicable blockers expire; no success inferred solely from a response code. | DB-relative timestamp comparisons, old/new counts/deadlines, worker/session results. Exact millisecond boundary remains local fake-time coverage unless DB scheduling evidence supports it. STOP on premature reset or ambiguous timing. |
| T4. Time sampled after lock; deadline near enough to cross within approved transaction budget | DB owner briefly locks global row. Start one callback before expiry, release after DB expiry but before request/transaction stop budget. Then probe other worker. | Admission uses post-lock DB time and resets expired window; no stale pre-wait timestamp. Both workers observe same new window. | Fresh verified success if no other blocker; if timeout occurs, fail closed and mark timing case inconclusive. | Sanitized lock wait/time/release observations plus resulting count/deadline. STOP if wait exceeds approved bound; release/cancel only the named test transaction. |
| T5. Lock timeout; rows initialized by counted warmup | DB owner holds an existing fixture ACCOUNT row; a callback increments global then waits to update that account. Keep/release lock only within signed timeout procedure. | On confirmed transaction timeout/cancellation, uncommitted aggregate/account changes roll back and locks release. Observe DB final state, do not assume from HTTP. | Generic denied callback; fresh jar has no verified session after recovery. | Baseline/final counts, blocked statement class (no parameters), transaction outcome/latency and no new registry session. STOP on lingering lock, budget breach or admitted result. |
| T6. Mid-transaction rollback; separate targeted cancellation authority | Hold fixture account row as T5; after observer confirms aggregate mutation and blocked account update, cancel ONLY the identified worker transaction before commit. Release test lock, then perform one permitted healthy probe. | Failed transaction changes absent after rollback; healthy probe adds exactly one admission. Other fixture/session data unchanged. | Cancelled attempt fails generically/no new session; healthy recovery succeeds subject to remaining quotas. | Private worker/PID mapping, sanitized cancellation/outcome, count snapshots and session boolean. STOP if transaction identity cannot be isolated; never cancel unrelated sessions or add ad-hoc public debug endpoints. |
| T7. DB unavailable/recovery; two fresh jars with CSRF prepared before fault | Approved mechanism denies runtime DB access on A/B only; send bounded callbacks. Restore access under owner control, inspect counters then send permitted probes. | No memory fallback. Requests failing before a transaction cannot create rows. Confirm any in-flight transactions after recovery. Lost commit acknowledgement can conservatively consume quota; reconcile, do not refund. | During failure no new authenticated session; after restore existing ceilings remain enforced. Session GET during outage alone is not proof—recheck with the same jars after recovery. | Connectivity/transaction phase summaries, final counters/registry and request/session outcomes. STOP on fallback, unexplained extra session or recovery failure. Never take down a shared/production DB. |
| T8. Key/policy consistency and worker restart | Custodian attests same secret version/policy without exposing values. Exhaust same fixture via A, probe B; restart only A with identical reviewed artifact/config and probe again within W. | One account bucket and persistent aggregate/account counts despite process recreation. No new allowance from restart. | B/restarted A remain denied until applicable expiry. | Secret version reference/access attestation (no fingerprint), artifact/policy IDs, private same-row result and counts. STOP on mismatch/new bucket/reset. Valid-but-different keys are NOT detected automatically: do not introduce them as a routine live test or claim automatic rejection. |
| T9. Denied-session oracle and CSRF | With each quota exhausted, invalid key/missing config or approved store fault, use fresh jars on A/B. Separately submit invalid/missing CSRF and a known/unknown identifier under approved scope. | Limiter-denied attempts issue no AuthSession row. CSRF rejection precedes admission and preserves counters. Existing unrelated sessions remain valid unless independently revoked. | Generic CredentialsSignin for limiter denial; normal framework CSRF error for bad CSRF. Neither yields a verified fresh session. | Count-only counter/registry deltas, safe error categories, independent session results after DB recovery. STOP on callback-only success, secret/error disclosure, counter mutation for confirmed CSRF rejection or wrong-user session. |
| T10. Capacity and cleanup coexistence; explicit low-capacity/load scope | Fill C live fixture buckets without global exhaustion, request another; then wait for expiry and retry. In a separate approved case exercise bounded registration cleanup with mocked/restricted delivery. | Live buckets not evicted; capacity denial consumes aggregate. Expired slots recover; password and registration namespaces do not erase each other's live rows. | Safe denial at full capacity, recovery after expiry; no hidden extra sessions. | Live/expired counts, bounded cleanup/latency and unchanged cross-namespace counts. STOP on premature deletion, scan/lock budget breach or any unapproved email. Skew testing requires dedicated isolated workers/fixture controls, not a shared system clock change. |

Run T1/T2 on initialized rows and, if separately approved, first-row creation in a
fresh disposable DB. Observe actual SQL/upsert behavior; conservative unique or
serialization errors may be fail-closed but are availability findings, not proof
of exact healthy success counts. No permissive retry is permitted to mask them.

## Evidence bundle and closure decision

Per case retain: signed scope/case version; source/artifact/Prisma/PostgreSQL and
DB isolation versions; non-secret A/B/DB/schema IDs; policy/secret-version references;
baseline assumptions; request allocation/barrier/timing; redacted DB/lock/counter
and session outcomes; PASS/FAIL/INCONCLUSIVE/NOT RUN; reviewer and UTC timestamp.
Cleanup and retention need a named owner. Test-created sessions must be revoked
through an approved workflow; deleting counters or users is not a substitute.

G7 closes only after security/DB/infrastructure owners accept shared key/policy,
capacity/timeouts, trusted client/client-account protection and actual successful
isolated multi-instance evidence, with failures resolved/retested. Documentation,
unit mocks or a working single instance cannot close it. Other gates remain
PENDING EVIDENCE; no deployment or test authorization is implied.

## Local checks in this review

Only the cleanup guard, its regression and documentation changed. Focused command:
node --test --test-isolation=none tests/password-signin-limit.test.mjs
tests/registration.test.mjs tests/session-security.test.mjs: exit0, **75 passed**
(14 limiter +41 registration +20 session, including grouping tests).
Full checks actually executed after the fix:

| Command | Actual result |
|---|---|
| node --test --test-isolation=none tests/password-signin-limit.test.mjs tests/registration.test.mjs tests/session-security.test.mjs | Exit 0, 75 reported tests passed. |
| npm test | Exit 0; tsc --noEmit, six smoke checks and 128 reported Node tests (22 auth, 21 leads, 20 sessions, 14 limiter, 10 mobile API, 41 registration). |
| npm run lint | Exit 0. |
| git -c core.safecrlf=false diff --check | Exit 0. |

No Flutter, Android or production build was rerun; no Dart/schema changes were
made. No Prisma/database command was needed for this source review.

Branch remains main, commit 9cba8d77afabedd5fbf32af638a3ee45615487e5. Initial:
41 modified/42 untracked; final: 41 modified/43 untracked, nothing staged. All 83
initial changed files remain. Hash comparison found no unrelated edits. Existing
QA artifacts were retained; new logs/status/hash evidence use qa-g7-review.

Files changed: src/lib/auth/email-registration.ts; tests/registration.test.mjs;
G7_DISTRIBUTED_SIGNIN.md; INFRASTRUCTURE_OWNER_SIGNOFF.md; this new plan.
No real PostgreSQL test, sign-in, migration, provider send or remote action occurred.
