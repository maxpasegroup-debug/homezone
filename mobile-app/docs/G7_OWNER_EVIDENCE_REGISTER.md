# HOMEZONE - G7 owner evidence register

Prepared: 2026-10-24. **G7: BLOCKED. Staging: NOT VERIFIED. Production: NOT VERIFIED.**
Execution decision: **NOT READY**. No owner evidence is accepted and no remote
activity is authorized by this register. All people, infrastructure identifiers,
secret references, limits, signatures and dates must be supplied by actual owners.

Reference requirements:
[approval package](G7_VERIFICATION_APPROVAL_PACKAGE.md),
[ten-case plan](G7_MULTI_INSTANCE_VERIFICATION_PLAN.md),
[owner evidence review](OWNER_EVIDENCE_REVIEW.md),
[owner sign-off](INFRASTRUCTURE_OWNER_SIGNOFF.md),
[infrastructure gate](INFRASTRUCTURE_READINESS_GATE.md).

## How to use this register

Local implementation/test reports exist; their existence does not satisfy the
owner attestations below. MISSING means the required scoped, reviewed owner bundle
has not been supplied, not that every related document or control is absent.
Existing test counts are historical; no tests were rerun to create this register.

Only these evidence statuses are permitted:

| Status | Meaning / permitted transition |
|---|---|
| MISSING | No qualifying submission/reference supplied. Current status of every entry. |
| SUBMITTED | Sanitized evidence and completed template received; review still required. |
| ACCEPTED | Named authorized reviewer records criteria met, matching target/artifact/scope, evidence reference, UTC date and expiry. Submission alone never implies acceptance. |
| REJECTED | Reviewer records failed criteria, risk, remediation owner and resubmission requirement. Retain review history without sensitive contents. |
| NOT APPLICABLE | Named approver justifies an explicitly excluded optional activity; cannot waive isolation, redaction, authority or another mandatory control. |

The dependencies column names evidence prerequisites, not permission to execute.
Paper review can proceed locally now. ANY remote evidence collection requires
accepted G7-E24 authority for that exact action first. Remote evidence may then
support the later, separate G7-E25 execution authority. This avoids requiring a
completed infrastructure test as a prerequisite for permission to collect evidence.
G7-E26 is post-execution evidence, never a prerequisite for initial authorization.

Do not execute commands from this register. Operators must use separately approved
procedures and scope. A signed document is insufficient if it does not identify
the actual environment/artifact and prove its stated control.

## Evidence register

### 1. Isolated application and database targets

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E01 | Dedicated app environment, primary database/schema and restore-target identity; no production data/reachability | Infrastructure + DB owner | Dated, signed redacted inventory plus private policy references | Non-secret IDs unambiguously identify isolated targets; role/network boundaries exclude production. Names/labels alone rejected. | MISSING | Foundational for E02-E07. Paper review now; remote identity checks require E24. |
| G7-E02 | Runtime and migration roles/targets match the intended isolated database/schema | DB + infrastructure owner | Private effective-target/grant review with signed equality/least-privilege attestation | Both contexts select same intended target; role differences intentional; no unknown inherited reference, unsafe grants or production access. No URLs/credentials in bundle. | MISSING | E01; remote reads require E24, never migration permission. |

### 2. Two independent workers, one writable PostgreSQL database

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E03 | A/B are distinct active processes/containers with the same reviewed artifact, and requests can be attributed to each | Infrastructure + application owner | Sanitized deployment/process inventory, artifact digests and routing procedure | Distinct instances, not aliases for one worker; old process-local versions drained; no direct-origin bypass/public identity-header trust. | MISSING | E01, E13. Inventory checks require E24; sign-in traffic requires E25. |
| G7-E04 | Both workers actually use ONE writable primary/schema, with equivalent runtime toolchain/isolation | DB + application owner | Private per-worker effective DB identity/pool review; sanitized equality/version report | Same actual database/schema/table, not similar URLs or read replicas; Prisma/PostgreSQL/isolation/pool versions recorded. Behavioral proof is E26, not assumed here. | MISSING | E02-E03; remote reads require E24. |

### 3. Migration history and schema compatibility

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E05 | Complete applied/pending/checksum/failed-history and drift comparison against 18 local migrations | DB/migration owner | Redacted history manifest and signed compatibility assessment | Actual target history reconciled; RegistrationBudget/indexes and AuthSession dependencies exist; unresolved drift/failed migrations block execution. No db push/history edits as shortcuts. | MISSING | E01-E02; inspection requires E24. Applying any pending migration needs separate explicit mutation authority, not this row. |
| G7-E06 | Email duplicates/normalization, enum casts, functional index/lock implications and app-schema compatibility reviewed | DB + application owner | Count-only preflight report, preserving remediation decision and rehearsal reference | Case/trim/blank risks addressed without exposing addresses or merging/deleting accounts blindly; all pending conversions and maintenance budgets reviewed. | MISSING | E05, E07; queries/rehearsal require E24 scope and separately permitted mutations. |

### 4. Backup and tested recovery

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E07 | Encrypted staging backup/integrity/access/retention and successful SECOND isolated-target restore | DB/recovery owner | Backup metadata reference, signed restore/rehearsal result with sanitized counts/history/index checks | Actual restore succeeds with compatible tools; approved RPO/RTO and partial-migration/app rollback or forward-repair procedure. A backup-created screenshot is insufficient. | MISSING | E01-E02, E16; remote backup/restore/rehearsal needs explicit E24 operation scope. No blind database rollback. |

### 5. Identical effective HMAC key and policy

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E08 | Effective PASSWORD_SIGNIN_HMAC_KEY equality, high entropy, independent staging custody/access on A/B | Secret custodian + security owner | Signed private equality/entropy review; non-secret immutable secret-version reference | Same actual key material/version, not merely matching variable names; 32-256 characters and adequate entropy; no values or fingerprints exported. Valid unequal keys are not auto-detected by code. | MISSING | E03; private custody review under owner authority; any remote secret inspection/provisioning needs E24 scope. Never send values to the engineer/report. |
| G7-E09 | Effective identical window/account/aggregate/capacity policy on every participating worker | Application + security owner | Numeric effective-policy manifest with artifact/config version and approver | Exact W/A/G/C agree, within parser bounds and approved test budgets; no old/mixed policy workers or unreviewed overrides. | MISSING | E03, E08; remote config reads require E24; config changes separately authorized. |
| G7-E10 | Safe key/policy rotation/rollback strategy; optional T8b included or excluded explicitly | Security/secret + infrastructure owner | Signed maintenance/runbook and T8b scope decision | No hot mixed-key rollout or live-counter deletion. Pause/drain workers, natural old-window expiry and new-version re-attestation defined. Optional rotation execution may be excluded, but safe rotation policy still required. | MISSING | E08-E09 before executing rotation; plan review now. Remote rotation requires separate E25 permission; no secrets changed by this register. |

### 6. Capacity, lock waits, timeouts and failure policy

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E11 | Shared-table reuse, live/expired capacity, global-row throughput and bounded cleanup budgets approved | DB + security/application owner | Signed capacity/privilege assessment, numeric ceilings and load budget | C and G support each case; live rows never evicted; password namespace preserved. Lock/connection/cleanup thresholds and monitoring defined; performance remains unverified until E26. | MISSING | E04-E06, E09; measurement traffic requires E25. |
| G7-E12 | Compatible pool/connect/lock/statement budgets and fail-closed timeout/rollback/recovery semantics | DB + application/security owner | Sanitized configuration matrix and failure runbook | Runtime maxWait=2000ms/timeout=3000ms understood, not treated as end-to-end SLA; missing table/key/backend denies without memory fallback. Unknown commit acknowledgement reconciled, never auto-refunded/retried. | MISSING | E04, E09, E11, E16; remote inspection needs E24, faults require E25. |

### 7. Trusted ingress and client identity

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E13 | Canonical HTTPS/Host/proto, direct-origin closure, safe A/B routing and repeated Set-Cookie preservation | Ingress + infrastructure/security owner | Redacted topology/policy and dated control evidence | No caller-header bypass; routing proves worker allocation without exposing origins. TLS, ambiguity rejection and cookie/header handling match auth requirements. | MISSING | E01-E02; platform checks require E24, synthetic traffic E25. |
| G7-E14 | Approved trusted client identity and client/client-account protection in addition to account/aggregate quotas | Ingress + security owner | Signed identity/threat/control contract with implementation evidence | Arbitrary forwarded-IP headers not trusted; request/body/time/concurrency and client abuse controls enforced. General memory/IP utility is not distributed proof. Missing required control/implementation blocks G7. | MISSING | E13; design review now, infrastructure changes/checks separately authorized. This row cannot be waived merely because account/global mocks pass. |

### 8. Monitoring, incident ownership and recovery procedures

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E15 | Safe metrics, alerts, thresholds and actual response coverage | Monitoring/on-call + security owner | Redacted pipeline/safe-capture preflight, alert rehearsal result, named role roster | Auth failures, locks/pool/transaction latency, capacity/backlog and outage signals observed with bounded labels; no sensitive values. LOG_LEVEL/DSN alone rejected; named on-call and response times supplied. | MISSING | E11-E12, E22-E23; local synthetic review allowed; remote alert rehearsal requires E24/E25 appropriate scope. |
| G7-E16 | Named incident/DB/cleanup operators, STOP/resume authority and safe restoration procedure | Incident + DB/infrastructure owner | Signed roster/escalation/runbook; completed restore proof tracked separately in E07 | Exact transaction/lock mapping, hard release deadline, out-of-fault recovery access and no unrelated cancellation; owner controls resumption after reconciliation. | MISSING | Foundational paper role/runbook review; no completed infrastructure test required here. Remote rehearsals require E24; E07 separately proves restore. |

### 9. Ten-case parameters, faults, cleanup and stop authority

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E17 | Approved pre-provisioned disposable account/device aliases, custody, endpoints and no real-user contact | Test + privacy/product owner | Private fixture inventory reference; sanitized alias/count/device allowlist | No real customer data or mail required for G7 sign-in fixtures; credentials remain private. Approved origin/artifact and account/session cleanup workflow supplied. | MISSING | E01, E13, E21; creating fixtures or authenticating requires separate explicit authority, not local documentation. |
| G7-E18 | Fully parameterized T1-T10 with numeric requests/parallelism/windows/caps and exact pass/fail oracles | Test authorizer + application/DB/security owner | Completed ten-row worksheet below, signed matrix/version | No placeholders for executable cases; warmups/CSRF/probes/session/logout traffic included. T10 G>C plus margin, T8 restart before expiry, fault and timing cases isolated; excluded cases explicit. | MISSING | E09, E11-E12, E17; preparation only now, execution needs E25. |
| G7-E19 | Per-case fault/restart/lock/cancellation/config/outage permissions and hard release ceilings | DB/infrastructure + security/test authorizer | Signed per-case fault allowlist and operator procedure | Only exact disposable workers/transactions affected; observer/recovery path healthy; no kill-all, shared clock edits or broad outage. Unpermitted optional subcases excluded; mandatory coverage not silently waived. | MISSING | E12-E13, E16, E18; faults ONLY after E25 explicitly authorizes them. |
| G7-E20 | Per-case C0 cleanup, session revocation, retention and residual-state reconciliation | Cleanup/privacy + DB/incident owner | Signed cleanup worksheet with owners/deadlines and existing workflow references | Release own locks/faults; confirm health; revoke fixture sessions or record uncertainty; discard volatile secrets; preserve live quotas/users; natural expiry/new baseline. No improvised cascades/resets. | MISSING | E16-E18, E23; remote cleanup/revocation also needs explicit scope. Completion proof belongs E26. |
| G7-E21 | Outbound services constrained; no accidental production or real-user actions | Infrastructure + email/security owner | Redacted egress/provider-disable attestation and permitted destinations | Unused mail/OTP/OAuth/notifications/payment routes disabled/out of scope. T10 registration/mail defaults EXCLUDED unless separate controlled-recipient/provider/action authority supplied. | MISSING | E01, E13; inspection requires E24; real emails/account actions remain prohibited unless separately approved later. |

### 10. Secret-safe evidence collection and redaction

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E22 | Runner/app/DB/proxy/provider/crash capture cannot retain sensitive test material under approved configuration | Security + monitoring/tooling owner | Local synthetic-marker preflight and sanitized capture-policy review | No bodies/HARs/cookies/tokens, account/HMAC row identifiers, passwords/keys/URLs with credentials, SQL params, args/env dumps or raw exception leaks. Unsafe logging disabled BEFORE traffic. Raw originals are not made safe by redacting a copy. | MISSING | Local synthetic preparation allowed; remote capture/settings validation requires E24 and must precede E25. Known logger/query risks need real evidence or correction. |
| G7-E23 | Evidence access, sharing, retention, incident containment and disposal owned | Privacy/security + cleanup owner | Signed storage/access/retention manifest and incident/disposal template | Only allowlisted aliases/counts/timing/status/session booleans and artifact/policy references shared; raw mappings private. Expiry/access/cleanup owner specified; secret capture triggers STOP/containment, not copying into reports. | MISSING | E16; paper policy now. Remote storage/config changes or disposal require scoped authority. |

### 11. Explicit authorization and eventual verification evidence

| ID | Required evidence / what it proves | Responsible owner | Acceptable format | Review / acceptance criteria | Status | Dependencies / authorization before next action |
|---|---|---|---|---|---|---|
| G7-E24 | Scoped permission to collect prerequisite infrastructure evidence | Infrastructure/DB/security authorizer | Signed ticket specifying identities, operators, UTC window, allowed reads/rehearsals and separate mutation permissions | Evidence collection only; read permission never implies deploy/migrate/restore/mail/sign-in/fault permission. Exact operations and stop authority listed. No change to current no-remote boundary without explicit later instruction. | MISSING | Paper scope/role assignment first (E16). Obtain before ANY remote collection; only approved items may proceed. |
| G7-E25 | Explicit owner authorization to begin the isolated two-instance experiment | Infrastructure + DB/security/test authorizer | Signed execution ticket linked to accepted prerequisites and frozen artifacts/matrix | E01-E23 accepted for required scope; E24 collection complied with; dates, operators, numeric caps, included/excluded subcases, faults/cleanup and stop/resume authority all explicit. This is a limited verification window, NOT rollout/G7 closure. | MISSING | E01-E24; no infrastructure sign-ins/tests until accepted AND explicit execution instruction is supplied. |
| G7-E26 | Actual authorized T1-T10 results, corrections/retests, cleanup and final owner acceptance | Test reviewer + DB/security/infrastructure owner | Redacted per-case PASS/FAIL/INCONCLUSIVE/NOT RUN bundle, scope and cleanup sign-off | Observed A/B/DB/session oracles support all required cases; unresolved failures/omitted mandatory coverage block closure. Local mocks cannot substitute; final client controls/risks accepted. | MISSING | POST-EXECUTION ONLY, after E25; not a prerequisite to initial authorization. No results exist here. Required before reconsidering G7 closure. |

## Ten-case parameter worksheet (submission G7-E18)

For EACH case supply numeric policy W/A/G/C, baseline/deadlines, requests split
across workers, K/R/D, warmup/probe/CSRF/session/logout totals, lock/fault caps,
executor/observer/cleanup roles, permitted endpoints/methods and evidence oracle.

| Case | Required case-specific constraint | Parameters / submission |
|---|---|---|
| T1 | A<N<=G; one normalized fixture; finish before expiry; distinct A/B | MISSING |
| T2 | N>G; each fixture <=A; K<=C; extra denial probes budgeted | MISSING |
| T3 | Separate account/global deadlines and DB-relative before/after margin | MISSING |
| T4 | Cross expiry after global lock but release within approved timeout/deadline | MISSING |
| T5 | Active account count<A, global headroom, lock owner/release deadline | MISSING |
| T6 | Exact waiter cancellation permission; rollback and one recovery probe | MISSING |
| T7 | Runtime-only outage, prepared CSRF jars, independent recovery access | MISSING |
| T8 | Restart completes before expiry; optional T8b rotation separately included/excluded | MISSING |
| T9 | Each blocker isolated; fresh jars; CSRF counter oracle; config restored | MISSING |
| T10 | G>C plus counted warmup/probe margin; no account masking; mail subcase separately scoped | MISSING |

No step is ready because this worksheet exists. Execution/cleanup/stop details
remain in the approval package; all remote cases stay NOT RUN.

## Evidence submission template (repeat per ID)

```text
Evidence ID / revision:
Group / requirement:
Status: SUBMITTED (only upon actual receipt; current register remains MISSING)
Submitting owner role / actual name:
Reviewer / approving role and actual name:
Non-secret target / worker / schema / artifact / policy references:
Private evidence location and access custodian (no credentials in links):
Observation / UTC date / expiry:
What was observed versus attested or inferred:
Criterion-by-criterion proof and limitations:
Dependencies and their review references:
Authority ticket / permitted operations / window (or local-only declaration):
Redaction preflight / retention / cleanup owner and deadline:
Exceptions / exclusions / unresolved risks:
Reviewer decision: SUBMITTED / ACCEPTED / REJECTED / NOT APPLICABLE
Decision rationale / UTC timestamp / signed ticket:
If rejected: failed criterion / remediation owner / required re-verification:
If not applicable: optional scope excluded / rationale / approving owner:
Change/review history and next explicitly authorized action:
```

Evidence becomes stale on relevant target/artifact/key/policy/ingress/capture
changes or expiry. Preserve prior decision history and require re-submission/
review; do not silently carry ACCEPTED to a changed scope. Missing owner names
must be filled by owners, never inferred from repository authorship.

## Final readiness decision

Current: **NOT READY; G7 BLOCKED; all G7-E01 through G7-E26 MISSING.**
Staging/production remain NOT VERIFIED. No row is SUBMITTED, ACCEPTED, REJECTED
or NOT APPLICABLE without an actual submission/review supporting that state.

Decision record: reviewer/role, date/expiry, target/artifact IDs, evidence IDs and
versions, remaining blockers, exclusions, conditions and execution ticket:
**NOT PROVIDED**.

- **NOT READY:** required evidence missing/rejected/stale or authority absent.
- **READY FOR AUTHORIZATION:** owners reviewed prerequisite evidence and the frozen
  plan; request the separate E25 execution decision. No tests are thereby run or
  authorized; G7 remains BLOCKED.
- **AUTHORIZED FOR LIMITED VERIFICATION:** E25 accepted with explicit execution
  scope/instruction. This is permission for that window only; G7 still BLOCKED.
- **VERIFICATION COMPLETE:** E26 actually reviewed/accepted, required client
  controls and infrastructure evidence accepted, failures resolved/retested and
  cleanup recorded. Only then may authorized owners reconsider G7 closure. No
  automatic production or public-release certification follows.

Next action: assign owners and submit sanitized paper evidence / scoped E24
request. Nothing in this register authorizes remote evidence collection now.

## Work performed

Documentation and safe local inspection only. No tests/builds rerun; no secrets
inspected, accounts used, migrations/deployments or remote requests performed.
Fresh checks cover ID/dependency/status consistency, document links, whitespace
and Git preservation. Existing QA artifacts remain untouched; new local status/
hash/check records use ignored build/qa-g7-evidence-register.
