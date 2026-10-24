# HOMEZONE - G7 verification approval package

Review date: 2026-10-24. **Current decision: NOT READY for infrastructure execution.**
**G7: BLOCKED. Staging: NOT VERIFIED. Production: NOT VERIFIED.**
All T1-T10 cases are **NOT RUN**, with owner evidence/authorization pending.
This package prepares approval; it neither grants authority nor certifies G7.

Sources: [G7_DISTRIBUTED_SIGNIN.md](G7_DISTRIBUTED_SIGNIN.md),
[G7_MULTI_INSTANCE_VERIFICATION_PLAN.md](G7_MULTI_INSTANCE_VERIFICATION_PLAN.md),
[OWNER_EVIDENCE_REVIEW.md](OWNER_EVIDENCE_REVIEW.md),
[INFRASTRUCTURE_OWNER_SIGNOFF.md](INFRASTRUCTURE_OWNER_SIGNOFF.md), and
[INFRASTRUCTURE_READINESS_GATE.md](INFRASTRUCTURE_READINESS_GATE.md).
Use this package's clarifications with the plan; they supersede ambiguous cleanup,
capacity, restart and rotation instructions, not its authentication safeguards.

## Implementation and evidence classification

| Classification | Evidence / limits |
|---|---|
| Verified by current source inspection | Auth.js provider awaits admission before account/password checking (backend/auth.ts:60). Limiter uses one transaction with global-row upsert/lock, post-lock database time, aggregate increment, capacity check/account increment; catches storage/config failure with no runtime memory fallback. Dedicated normalized-account HMAC key is required. Source inspection does not prove generated SQL or actual PostgreSQL isolation. |
| Verified source plus existing local regression | Registration cleanup excludes password-signin: in BOTH selection/deletion (email-registration.ts:90-92). registration.test.mjs:324 preserves global/account password rows that appear old to application time and confirms eligible registration-row cleanup. Removing the exclusion would break the assertions. Fixture transactions are simulated; skewed infrastructure was not exercised. |
| Historical locally executed tests, report/logs inspected this review | Latest G7 plan records targeted 75 tests; npm test exited0 with TypeScript, six smoke checks and 128 reported Node tests (22 auth,21 leads,20 sessions,14 limiter,10 mobile API,41 registration); lint/diff check exited0. Existing qa-g7-review log totals agree. These commands were NOT rerun in this documentation phase. |
| Required owner attestations, absent | Same isolated writable DB/schema; identical worker artifact, effective policy and secret version; approved client identity, scope/caps, migration/restore, restricted outbound, redaction/monitoring, incident and cleanup ownership. Secret length/presence cannot prove entropy or key equality. |
| Infrastructure behavior NOT VERIFIED | Real lock/upsert/first-row race, isolation, cross-worker ceilings, pooled connection/cancellation, rollback/recovery, throughput, TLS/ingress, restart and session outcomes. No real account action, email, DB operation or remote request ran here. |

Counters can be committed when admission succeeds even if later authentication
fails. Account/capacity rejection consumes aggregate allowance. Failure before
commit rolls back; lost commit acknowledgement is ambiguous and may consume quota
while returning denial. Never refund or auto-replay an uncertain attempt.

## Findings and corrections

| Severity | Gap or risk | Required correction / disposition |
|---|---|---|
| HIGH - owner blocker | Target isolation, authority and trusted client/client-account protection are not proven | Complete approvals below. Two-instance window is a narrowly authorized experiment, never implied rollout. G7 stays BLOCKED. |
| HIGH - configuration risk | Valid but different HMAC keys split account buckets; code cannot detect equality | Custodian attests effective identical secret reference/version and exact non-secret policy on both workers. Same alias pointing to different values is insufficient. Never export key/fingerprint; no mixed-key normal test. |
| MEDIUM - plan correction | Cleanup/recovery lacked per-case steps | Matrix below binds every case to mandatory C0 plus its specific cleanup. Fill executor/deadlines before authorization; cleanup itself needs permission. |
| MEDIUM - plan correction | Capacity can be masked by aggregate/account exhaustion; expiry can invalidate restart conclusions | T10 requires G>C with allocated probe margin and one allowed attempt per fresh account. T8 requires sufficient time remaining through restart; otherwise INCONCLUSIVE, not pass/fail from stale assumptions. Count all warmups/probes. |
| MEDIUM - destructive/fault risk | Generic locks/cancellation/outage can affect unrelated sessions or remain active | Dedicated isolated target; privately verified worker/transaction mapping, named lock owner, explicit release/cancel deadline, recovery access outside the fault path. No kill-all commands or shared-clock changes. |
| MEDIUM - coverage gap | Key rotation only appeared as a general warning | T8b below requires separately approved maintenance rotation at natural old-window expiry, no traffic/in-flight work, consistent new version and re-attestation. No preserving-old-account-budget claim is made. |
| MEDIUM - evidence risk | Default DB/app/runner tooling can retain params, cookies or credentials | Preflight safe capture with synthetic markers; disable unsafe collection BEFORE traffic. A redacted copy does not erase raw originals or make upstream logging safe. |
| INFORMATIONAL - observability | Generic CredentialsSignin cannot distinguish throttling from wrong password | Use valid disposable credentials and private count-only DB observations plus independent session verification. Any unrelated DB/password/session failure invalidates exact-success assertions. |

No new application-code defect was established in this documentation-only review.
The previous cross-namespace defect is fixed and regression-covered; mocks are
not a substitute for T10's separately authorized infrastructure observations.

## Common execution contract and cleanup C0

The underlying plan defines W (window), A (account ceiling), G (aggregate ceiling),
C (capacity), N/K/R (requests/accounts/parallelism), D (deadline) and the full
CSRF -> callback -> independent session protocol. Owners MUST supply numeric caps,
UTC window, per-instance allocation, setup/probe/session totals and stop budgets.
No example/default policy is silently approved. Each callback gets a fresh empty
cookie jar; never reuse an authenticated jar as a denied-session oracle.

**C0, mandatory after EVERY case:** stop new runner work and automatic retries;
release only that case's operator locks and restore its approved fault/routing
state; confirm no lingering test transaction or unhealthy worker. Record final
sanitized counter/registry/session observations. Revoke newly created fixture
sessions using the authorized existing logout/revocation workflow, then discard
volatile cookie/CSRF/password material. If logout/revocation cannot be confirmed,
record uncertainty and hand the session/account fixture to the incident owner;
do not claim successful cleanup. Do not delete users/live counters, reset budgets,
edit migration history or drop databases as improvised cleanup. Wait for natural
expiry before a new baseline; decommission a dedicated fixture target only with
separate explicit approval. Retain only approved sanitized evidence until its
expiry; record cleanup owner, completion and any residual data/access.

Universal STOP: any production target/data, lost isolation, secret capture,
uncontrolled recipient/service, unrelated affected user/session, unexpected role
change, exceeded cap/deadline/lock limit, failed monitoring/recovery access, or
verified fresh session after confirmed denied admission. Freeze traffic, release
identified test locks safely, notify incident owner, preserve sanitized evidence
and await explicit resumption. FAIL versus INCONCLUSIVE must explain the oracle.

## Ten-case readiness matrix

All rows are **PREPARED, PENDING OWNER EVIDENCE; NOT RUN**. Each row inherits C0,
fresh jars, independent sessions, private DB mapping and universal STOP. Base-plan
actions plus the corrections below constitute the required execution steps.

| Case / explicit preconditions | Execution steps and expected outcomes | Evidence required | Cleanup and case stop condition |
|---|---|---|---|
| T1 same account: two independent workers, healthy downstream, fresh baseline, A<N<=G, C>=1; finish before expiry | Bootstrap distinct jars; barrier-start N valid normalized variants split across A/B. One account row; account count A, global N; A verified successes and N-A generic denials only if all downstream dependencies stay healthy. | Attested instance allocation; private same-row equality; before/after counts/deadlines; safe per-request/session outcomes. | C0; revoke admitted sessions on both workers. STOP on split buckets/overshoot; unrelated error or window crossing => INCONCLUSIVE. |
| T2 aggregate: N>G, K<=C, request allocation per account<=A, no account/capacity masking | Send valid rotating-fixture callbacks across A/B, then bounded extra probes on each. Global G, total account increments G; no later account mutation; G fresh sessions only if healthy downstream. | Aggregate/per-account totals and per-worker observations; registry deltas with no raw IDs. | C0; retain exhausted counts, wait natural expiry. STOP on excess admission or unrelated blocker/window transition. |
| T3 expiry: exhausted fixtures, recorded independent global/account deadlines, approved before/after probe margin | Probe before applicable expiry; observe DB time, then probe A/B after blockers expire. Only expired windows reset; first count1/deadline, second shares it. No clock/row edits. | DB-relative time/deadline/count relations, private account mapping and verified-session booleans. | C0; leave expired rows for approved cleanup. STOP on premature reset; insufficient timing precision => INCONCLUSIVE, no exact-boundary claim. |
| T4 post-lock time: global row exists, nearest deadline can be crossed before 3s transaction timeout/approved tighter budget | Named DB operator locks global row; bootstrap ahead, dispatch callback before expiry; release after DB expiry within budget, then probe other worker. Expected post-lock fresh-window calculation. | Identified test lock/wait/release timing, DB deadline, resultant counter and session. No SQL parameters captured. | Release/rollback operator lock in a guaranteed cleanup path plus C0. STOP/release at hard deadline; transaction timeout => timing case INCONCLUSIVE, not permission to extend it. |
| T5 lock timeout: UNEXPIRED account row with count<A; global budget available after counted warmup; remaining window exceeds lock procedure | Operator locks that account row; dispatch callback; observer verifies global mutation and blocked account update. Let approved transaction/statement timeout occur, confirm rollback and lock release. No fresh session. | Private waiter/lock-owner identity; bounded latency; confirmed DB transaction outcome; baseline/final counts and registry/session delta. | Release operator lock, reconcile timeout and perform C0. STOP on wrong waiter, lingering lock or success; do not infer rollback just from HTTP. |
| T6 explicit rollback: same prerequisites as T5, targeted cancellation separately authorized | Hold target row, identify exact waiting transaction after aggregate update, cancel only that statement/transaction before commit, release lock; one approved recovery probe. Failed mutation absent; recovery increments once. | Private transaction mapping, sanitized cancellation/outcome and counter/session comparison. | Release own lock; confirm rollback/healthy connection; C0. STOP if identity cannot be isolated or cancellation touches another workload. No public debug endpoints or DB-wide cancellation. |
| T7 outage: A/B isolated runtime paths, healthy observer/recovery access, CSRF jars prepared beforehand | Authorized operator blocks only intended runtime DB access; bounded callbacks on A/B deny. Restore reviewed connectivity, reconcile in-flight outcomes, recheck same jars and permitted recovery probes. No memory fallback/new unauthorized session. | Fault window/path IDs, transaction phase summaries, post-recovery counter/registry/session observations; explicitly record unknown commit outcomes. | Restore exact approved connectivity, confirm observer and A/B healthy; C0. STOP on shared/production impact or missing recovery access; never auto-refund or retry ambiguous commits. |
| T8 consistency/restart AND optional T8b rotation: effective policy/key attested; restart completes before relevant deadline | T8a exhaust via A, probe B, restart A with identical version, probe again within W: counts persist and no new allowance. T8b only under separate rotation authority: pause traffic, drain BOTH workers/in-flight transactions, wait until old live windows naturally expire, provision same new version on both, re-attest and run a bounded new-window consistency probe. Never mix active versions. | Non-secret artifact/effective-policy manifest, custodian equality/version attestation, process-instance observations, natural-expiry proof and private same-row/count/session results. No key/hash export. | Restore agreed final version/state and C0; no hot rollback to old key with active traffic. STOP on mismatch/new allowance; restart crossing expiry => INCONCLUSIVE. Rotation subcase excluded unless explicitly authorized. Valid mismatched keys are not expected to self-reject. |
| T9 denied sessions/CSRF: each blocker isolated, fresh jars, no previous authenticated state; fault/config permissions explicit | On A/B test quota denials and separately approved missing/invalid key/store fault. Bad CSRF must fail before limiter mutation. Compare known/unknown safe outcomes and revalidate jars after DB recovery. No new AuthSession for denied attempts; existing unrelated sessions not implicitly revoked. | Count-only limiter/registry deltas, generic error categories, independent session booleans; artifact/provider contract. | Restore approved key/config/fault state through custodian, re-attest both workers and C0. STOP on secret output, CSRF counter mutation or denied fresh session authenticating. No config fault without separate scope. |
| T10 capacity/namespace cleanup: C distinct active fixtures, each <=A, G>C plus explicit warmup/probe headroom; isolated cleanup subcase | Fill C live buckets; next account denied for CAPACITY (not global); wait natural expiry and retry. Cleanup subcase uses local mocks unless restricted email/registration actions separately authorized. Verify namespace preservation before/after approved cleanup; no shared-clock manipulation. | Live/expired counts, aggregate consumption on capacity denial, cleanup batch/latency and untouched other-namespace counts; prior regression reference. | C0; retain live quotas and dispose mail/examples only under approved retention. STOP on capacity masking, live eviction, scan/lock breach or any unapproved email/account action. |

For every case, lock owner/executor/cleanup owner names, concrete parameters,
hard-release deadline and evidence references remain UNASSIGNED. Until completed,
these rows are not executable instructions. First-row creation/serialization
errors are availability findings; do not retry until success to manufacture a pass.

## Proof of two instances, one DB and equivalent configuration

- Infrastructure owner attests TWO distinct application processes/containers with
  same reviewed artifact and independently observed requests on each. The routing
  method must not expose a direct-origin bypass or trust a public identity header.
  Record instance aliases/version and request counts, not credentials or body logs.
- DB owner, under separate read authorization, privately compares each runtime's
  effective service/database/schema/role identity, writable primary and pool route
  with the migration runner. Compare actual migration history/checksums/drift and
  RegistrationBudget table/index definitions. Similar URL strings, one host alias
  or Prisma schema validity alone do not prove the same writable database.
- Custodian verifies effective identical PASSWORD_SIGNIN_HMAC_KEY material and
  immutable secret version through approved custody; publish only signed equality
  attestation and non-secret version references, never fingerprints or values.
  Application owner compares effective numeric W/A/G/C, deployment/config versions,
  Prisma/PostgreSQL/isolation/pool/SQL timeout settings and absence of old workers.
- Authorized T1/T2 observations then show the same private account-row mapping and
  shared aggregate mutation from requests proven to reach A/B. Owner attestations
  PLUS observed DB results are needed; neither alone certifies all failure modes.

## Explicit owner approval checklist - all pending

- [ ] Infrastructure/DB: isolated app A/B/DB/schema/restore target, production-denied
  roles/network, runtime/migrator identity and complete history/drift/duplicate review.
- [ ] DB/recovery: encrypted backup/integrity/retention, successful SECOND-target
  restore, RPO/RTO, lock/cancellation/outage procedure, named recoverer and tested
  partial-failure/compatible app recovery. No migration permission implied here.
- [ ] Security/secret custodian: key entropy/custody/equality/version, exact shared
  policy, old-worker drain, separately approved optional rotation and final state.
- [ ] Ingress/security: canonical HTTPS/Host/proto, direct-origin closure, safe
  instance routing, forwarded-header overwrite/rejection, repeated Set-Cookie,
  request/body/concurrency/time limits and trusted client/client-account protection.
- [ ] Monitoring/incident: safe capture demonstrated before traffic, metrics/alerts,
  response thresholds, named operator/observer/on-call and STOP/resume authority.
- [ ] Test/privacy/product: pre-provisioned disposable fixtures/custodians, no real
  customers; exact endpoints/cases/artifacts/UTC window, numeric budgets including
  warmups/CSRF/session/cleanup requests and per-case cleanup/retention acceptance.
- [ ] Outbound: unused email/OTP/OAuth/notification/payment integrations disabled
  and egress constrained. Registration is not required for G7 fixtures. Any T10
  mail subcase needs independent approval, exact staging recipient enforcement,
  provider restrictions and private controlled mailbox custody; otherwise EXCLUDE.
- [ ] Written authorization explicitly includes two-instance experiment, per-case
  DB reads/locks/cancellation/restart/connectivity faults and any config changes;
  everything else excluded. All prerequisite gates approved for that narrow scope.

Stop/recovery order: stop new work; safely release ONLY known test locks; restore
approved connectivity/routing/config through owners; reconcile DB/commit/session
outcomes; revoke fixture sessions when possible; sanitize evidence and notify.
Restore a DB backup only under its separate approved recovery plan, after traffic
is stopped and data/session effects reviewed. Never blindly delete counters/users,
drop tables, mark migrations resolved or revert credentials to resume a test.

## Evidence collection and redaction checklist

- [ ] Allowlist evidence fields: case/request/fixture/worker aliases, UTC/DB timing,
  status/category, latency, session-present boolean, count/deadline comparisons,
  artifact/policy/tool versions and owner ticket references. Record outcome and
  cleanup separately. Account-level DB mapping stays in authorized volatile/private
  observer handling; no raw account/HMAC row identifiers in shared artifacts.
- [ ] No passwords, OTPs, reset/CSRF/session tokens/cookies, Authorization headers,
  connection strings/credentials, HMAC/auth/OTP secrets, addresses or customer data.
  No HAR/body dumps, curl traces, process args/env dumps or SQL parameter logging.
- [ ] Disable unsafe runner/app/DB/proxy/provider/crash capture BEFORE execution;
  verify with synthetic sensitive markers locally. Restrict screenshots and shell
  history. Audit backend development query logging and generic exception capture.
- [ ] Access/retention/cleanup owner and deadline recorded; privately verify captures
  before sharing. If unsafe data appears, STOP capture/traffic, restrict the raw
  artifact, notify security and use approved containment/rotation/disposal. Do not
  copy it into a report or assume a redacted duplicate resolves the incident.

These are handling requirements, not a proof that existing tools cannot leak.
Without a successful safe-capture preflight the test is NOT READY.

## Decision template

Select exactly one; scope and sign-off evidence must be supplied by owners:

- **NOT READY** (current): required evidence/authority or corrections missing.
- **READY FOR AUTHORIZATION**: named reviewers accept all prerequisites and the
  completed per-case parameters/cleanup. This is a request for explicit scoped
  execution permission, NOT test completion or G7 closure; remote cases stay NOT RUN.
- **VERIFICATION COMPLETE**: authorized cases actually executed, signed results
  and DB/session oracles accepted, failures resolved/retested, residual risks and
  client controls approved, cleanup recorded. Only then may owners reconsider G7.
  This never implies production or Play Store readiness.

Decision: NOT READY. Reviewer/role: UNASSIGNED. Evidence bundle/artifact/target IDs:
UNASSIGNED. Included/excluded cases and parameters: UNASSIGNED. Named authority,
approval date/expiry, conditions and cleanup owner: UNASSIGNED. G7 remains BLOCKED.

## Local work and preservation

This review changed documentation only. No tests/builds were rerun, secrets
inspected, real sign-ins performed or infrastructure accessed. Fresh validation
is limited to document consistency/links, git diff --check and initial/final
status/hash checks; evidence uses ignored build/qa-g7-approval. Existing test totals
above are attributed historical results, not new execution. No new application
defect was confirmed; plan gaps were clarified here without code/config changes.
