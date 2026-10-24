# HOMEZONE - Infrastructure owner sign-off package

Prepared: 2026-10-24. **Staging: NOT VERIFIED. Production: NOT VERIFIED.**
Decision: **HOLD - no gate approved; no remote activity authorized by this file.**

Local update: canonical authentication configuration now fails closed instead of
selecting a production fallback. Registration and password-reset Resend adapters
enforce exact staging recipients through STAGING_EMAIL_RECIPIENTS. See
[LOCAL_BLOCKERS_VALIDATION.md](LOCAL_BLOCKERS_VALIDATION.md) for local evidence.
These changes do not approve configured origins, recipients, secrets or ingress.

Formal evidence comparison, owner acceptance criteria and the staging authorization
checklist: [OWNER_EVIDENCE_REVIEW.md](OWNER_EVIDENCE_REVIEW.md). It references the
latest LOCAL_BLOCKERS_VALIDATION.md results without treating them as owner approval.
G1-G6 and G8-G12 remain PENDING EVIDENCE; G7 remains BLOCKED until distributed
password admission is implemented AND its multi-instance behavior is verified.

G7 local engineering update: [G7_DISTRIBUTED_SIGNIN.md](G7_DISTRIBUTED_SIGNIN.md).
Shared PostgreSQL account/aggregate admission is now implemented locally; client
identity/enforcement and operational approval remain outstanding. G7 stays BLOCKED
until the complete approved controls and authorized multi-instance verification.

Verification preparation (not authorization):
[G7_MULTI_INSTANCE_VERIFICATION_PLAN.md](G7_MULTI_INSTANCE_VERIFICATION_PLAN.md)
specifies two-instance cases, DB/session expectations, evidence and stop rules.
G7 remains BLOCKED; all remote cases are NOT RUN.

Owner approval checklist and corrected ten-case readiness matrix:
[G7_VERIFICATION_APPROVAL_PACKAGE.md](G7_VERIFICATION_APPROVAL_PACKAGE.md).
The package is currently NOT READY for execution; it neither approves gates nor
authorizes the two-instance experiment.

Use with [INFRASTRUCTURE_READINESS_GATE.md](INFRASTRUCTURE_READINESS_GATE.md),
which contains the 18-file migration inventory, variable contract and complete
16-step matrix. Registration behavior is defined by
[REGISTRATION_IMPLEMENTATION.md](REGISTRATION_IMPLEMENTATION.md) and
[REGISTRATION_SECURITY_FIXES.md](REGISTRATION_SECURITY_FIXES.md).
[STAGING_REGISTRATION_READINESS.md](STAGING_REGISTRATION_READINESS.md) includes
historical findings; its old resend expectations are superseded.

## How to approve

Assign a named person to each role below. Attach a non-secret evidence reference,
scope, artifact/source revision, approver and UTC date; do not paste credentials,
URLs containing secrets, emails, OTPs, cookie headers or response bodies. Evidence
must match the actual proposed environment and artifact, not an older report.

- **NOT STARTED:** work has not begun or a required implementation is absent.
- **PENDING EVIDENCE:** requirement is documented but adequate owner evidence is absent.
- **APPROVED:** named authorized approver reviewed sufficient scoped evidence.
- **BLOCKED:** a known unmet prerequisite prevents the proposed activity.

No status below is APPROVED. All owner names, evidence IDs, limits and signatures
are unassigned. Do not change a status based only on local test success. An
approval covers only its stated activity; it does not establish production readiness.

## Gate register

Procedures below are instructions for a FUTURE authorized operator. Local document
review is permitted now. Platform inspection, database reads, rehearsal, mutation
and email each require their own scoped authorization before execution.

| Gate / requirement | Evidence needed | Approver role | Safe verification procedure | Stop condition | Status |
|---|---|---|---|---|---|
| G1. Dedicated isolated staging app/database; runtime and migrator target the same database/schema | Non-secret project/environment/service/database/schema IDs; separate role grants/network policy; production-denial attestation; effective target agreement in runtime and preDeploy contexts | Infrastructure owner + DB owner | Review redacted references privately first. Only after read-only authorization, compare target identity/schema/role grants in both execution contexts; never print DATABASE_URL. A staging label alone is insufficient. | Any production access/data, target mismatch, unknown inherited config or inability to prove isolation: no DB actions/deploy. | PENDING EVIDENCE |
| G2. Migration history, all pending files and email normalization reviewed | Applied/checksum/failed-history comparison against all 18 local migrations; drift findings; count-only lower(email) and lower(trimmed-email) duplicates, blanks/normalization counts; account-preserving remediation decision; lock/timeout/space budget | DB/migration owner + application owner | After G1 and DB-read authorization, inspect history/definitions and count-only preflights. Review functional unique index and legacy exact email lookup; rehearse complete pending set only under separate rehearsal authority. | Failed/drifted history, unreviewed duplicates/status casts, incompatible schema or lock budget: stop, never auto-merge/delete users or use db push. | PENDING EVIDENCE |
| G3. Staging-only backup, restore and recovery are executable | Encrypted backup ID/time/integrity/access/retention; compatible tools; RPO/RTO; second isolated restore-target ID; successful restore/rehearsal report; partial-migration and app compatibility runbook | DB/recovery owner + incident owner | Under explicit recovery authority, pause staging writes/mail, back up and restore a SECOND disposable isolated DB; verify counts/constraints/indexes/history, rehearse pending migrations and record observed timings. | Restore/integrity failure, wrong target, timeout or incompatible app: no migration/deploy; do not assume all DDL rolled back. | PENDING EVIDENCE |
| G4. Canonical staging origins explicitly pinned | Redacted build/runtime manifest showing AUTH_STAGING_ORIGIN, AUTH_URL, NEXTAUTH_URL agree; NEXT_PUBLIC_SITE_URL if supplied; mobile origin agreement; deployment config-drift check/change control | Infrastructure owner + application/security owner | Inspect non-secret origins. authOrigin now rejects missing production/staging selectors, conflicting selectors, noncanonical paths and production selection while staging is approved. Require preDeploy manifest attestation: route validation does not protect database targeting before startup. | Missing selector, production origin for staging, mismatch or unreviewed config change: stop deployment. Local tests do not attest the actual manifest. | PENDING EVIDENCE |
| G5. Secrets provisioned and validated without disclosure | Secret-manager reference/version/access attestation for staging-only DATABASE_URL, AUTH_SECRET, OTP_PEPPER, PASSWORD_SIGNIN_HMAC_KEY, RESEND_API_KEY; approved sender; generation/rotation/custody evidence, no secret values | Secret/security owner + infrastructure owner | Authorized custodian verifies presence, entropy and format privately. AUTH_SECRET should use >=32 random bytes; registration OTP_PEPPER requires >=32 characters with high entropy. Verify consistency across workers, separation from production and disabled unused/demo providers. Share pass/fail and reference IDs only, not fingerprints of secrets. | Missing/weak/reused secret, logging exposure, unknown custody or development fallback: stop; rotate through approved incident process if exposed. | PENDING EVIDENCE |
| G6. Trusted HTTPS ingress/proxy contract and one-process test topology | TLS/canonical Host/proto policy, direct-origin restrictions, header overwrite/rejection rules, body/time/concurrency limits, repeated Set-Cookie handling, synchronized clocks; exact instance/process count and no autoscaling/overlap | Ingress/security owner + infrastructure owner | Review policies under authorized platform-read scope; then exercise approved synthetic ingress checks. General rate limits currently trust forwarded-IP headers; Auth.js trustHost:true is not verification. Confirm exactly one Node process for first tests. | Spoofable identity, direct-origin bypass, ambiguous headers, insecure TLS/cookies or extra process: no auth/abuse testing. | PENDING EVIDENCE |
| G7. Shared atomic password-sign-in enforcement before multi-instance use | Local PostgreSQL account/aggregate implementation in G7_DISTRIBUTED_SIGNIN.md; owner approval of shared target/key/policy/capacity/timeouts, trusted client/client-account controls and authorized multi-instance evidence still required | Security owner + infrastructure owner + engineering owner | Review local evidence, provision approved PASSWORD_SIGNIN_HMAC_KEY consistently, approve ingress/client controls, then separately verify real PostgreSQL contention/restart/expiry/failure/cleanup across instances. Keep first single-process scope limited. | Local mocks are not distributed proof; missing client contract, unsafe timeout/key policy, bypass or unrestricted fallback: stop multi-instance rollout. | BLOCKED |
| G8. Enforced staging email-recipient restriction, sender and delivery limits | Approved STAGING_EMAIL_RECIPIENTS configuration (mailbox aliases in public reports), app policy enabled by AUTH_STAGING_ORIGIN, verified sender/domain, separate provider credential and any provider restrictions, email caps/egress evidence | Email/provider owner + security owner + test authorizer | Privately review exact recipients and canonical staging marker. Locally tested Resend guards cover registration and password reset; missing/invalid list denies sends. After explicit email authorization verify configured rejection and controlled delivery. Disable other mail providers; ordinary API-key separation/egress does not constrain them. | Missing/invalid list or staging marker, unreviewed mail path, wrong recipient/sender or unapproved provider: no email tests. Code guard is not proof of remote configuration. | PENDING EVIDENCE |
| G9. Safe monitoring, alerts and redaction | Sanitized pipeline/config review for app/DB/proxy/provider/crash reports; fixed bounded metrics; approved thresholds, alert recipients and response times; safe local redaction and authorized alert-rehearsal evidence | Monitoring/on-call owner + security owner | Review sinks, not just LOG_LEVEL/SENTRY_DSN. Use synthetic sensitive markers locally; inspect that original exception messages/stacks, bodies and SQL parameters do not escape. After separate authorization, confirm alert delivery before fault tests. | Sensitive output, missing exporter/alerts or no on-call response: stop; forwarding raw logger output to a redacting sink is not sufficient proof. | PENDING EVIDENCE |
| G10. Retention, cleanup and incident/recovery ownership | Named responders/stop authority, escalation/runbook, periods for pending accounts, budgets, registry/reset tokens, provider mail, backups and artifacts; reviewed fixture-account disposal; cleanup completion template | Cleanup/privacy owner + incident owner + DB owner | Approve policy before collecting data. Demonstrate cleanup on safe fixtures under explicit authority, preserving live quotas and business references; record deletion/anonymization counts without PII. Rehearse stop/recovery communication. | Unowned retained data, unsafe cascade deletion, live budget erasure or inability to contain incident: pause test and preserve sanitized evidence. | PENDING EVIDENCE |
| G11. Sixteen-step plan, accounts, ceilings, endpoints and stop conditions explicitly authorized | Signed scope worksheet below; exact matrix version, artifact IDs, controlled fixtures/devices, endpoint methods, time window, attempt/email/concurrency limits and per-case approval | Test authorizer + infrastructure/security owners; DB/email owners for affected actions | Select permitted cases from matrix steps 1-16; mark all others excluded. Assign executor/observer and budgets. Read-only discovery authorization does not grant deploy, migration, email or fault permission. | Any missing/expired scope, ceiling reached, unexpected account action or operator unavailable: stop; no implied permission for remaining steps. | PENDING EVIDENCE |
| G12. Account/privacy and persistence limitations accepted for controlled test | Approved disposable-account cleanup and data handling; acknowledgement restart requires sign-in, local clear is not revocation, profile completion optional; product owner tracks deletion/privacy/support gaps before public release | Product/privacy owner + security owner | Review current contracts and test-only disclosures. Real account deletion and secure persistent restoration are absent; do not improvise either or claim public-release compliance. | Public account rollout, real customer data, implied persistent session/server logout success or unapproved deletion: stop. | PENDING EVIDENCE |

## Code changes versus owner actions

No code/configuration changes are made by this package. The following separates
what existing code can support from work that a signature cannot implement.

| Control | Owner action possible now | Engineering work required / boundary |
|---|---|---|
| G1-G3 database/migrations | Isolation/grants, target attestation, history/data review and restore rehearsal after authorization | No new schema change identified by this package. Unexpected duplicates/drift require an approved specific remediation; never alter migration history to manufacture readiness. |
| G4 canonical origins | Pin/attest all selectors and enforce config change control | Production fallback removed from authOrigin with local regressions. Startup/preDeploy isolation validation remains absent; generic env audit is insufficient. |
| G5 secrets | Provision securely, disable unused/demo providers, rotate with pending OTP/quota effects understood | Unified validation hardening would require code; current registration runtime checks do not validate isolation or protect preDeploy. No fabricated credentials for unrelated audit groups. |
| G6/G7 ingress and rate limits | Approve proxy/client contract, shared DB target/key/policy and single-process first-test scope | PostgreSQL account/aggregate password admission now exists; client/client-account controls, monitoring decisions and actual multi-instance verification remain. General rate utility is unchanged. |
| G8 recipients | Approve exact recipients, staging marker, sender, provider custody/egress and disable other providers | Fail-closed exact recipient guard now covers registration/reset Resend adapters. Other delivery channels remain outside this guard and out of test scope. |
| G9 monitoring | Approve sinks/access, on-call and alert policies | If raw exception/SQL/context leakage cannot be prevented at its source or safe capture boundary, application/logger changes and regression tests are required before affected tests. No assumption that downstream masking removes upstream exposure. |
| G10 retention/deletion | Approve policy and controlled staging-only cleanup procedure | Scheduled cleanup is not implemented by on-request bounded deletion. A durable job or approved operator procedure is needed. Public deletion/anonymization needs a real reviewed workflow and product policy. |
| G11/G12 scope/lifecycle | Sign scoped plan and acknowledge no persistence/public-release claim | Secure persistent session restoration and real account deletion remain future work. Limited staging scope must acknowledge their absence. Existing session/CSRF/provenance safeguards must remain unchanged. |

## Scope worksheet - complete privately with non-secret references

All fields: **PENDING EVIDENCE**. No named owner or test ceiling was supplied.

| Required field | Owner-completed value |
|---|---|
| Authorizer / executor / observer / incident and DB/email on-call | NOT PROVIDED |
| Project/environment/app/database/schema IDs; isolated restore target | NOT PROVIDED |
| Source + migration manifest digest; actual backend/mobile artifact IDs | NOT PROVIDED |
| Approved canonical HTTPS origin and media hosts | NOT PROVIDED |
| Controlled mailbox/account fixture aliases and custodians (no addresses/passwords) | NOT PROVIDED |
| Android/iOS/browser devices and trusted proxy access | NOT PROVIDED |
| UTC start/end, maximum duration and resumption authority | NOT PROVIDED |
| Endpoint/method allowlist; number of users/accounts; catalog fixture scope | NOT PROVIDED |
| Per-case/aggregate requests, attempts, deliveries, concurrency and load ceilings | NOT PROVIDED |
| Separate permissions for DB reads, restore rehearsal, deployment/migrations, mail/account actions | NOT PROVIDED |
| Separate permissions for replay, concurrency, quota exhaustion, faults and recovery drills | NOT PROVIDED |
| Evidence storage/redaction/retention; monitoring/alert thresholds; cleanup deadline | NOT PROVIDED |
| Gate evidence IDs; exceptions/excluded cases; approver/date/expiry | NOT PROVIDED |

## Sixteen-step authorization register

The detailed expected results/procedures/stop conditions remain in the linked
readiness gate. This register selects scope; **no step is newly authorized here**.
Run status for all remote steps: **NOT RUN**. Local tests in older reports are
historical. Every step stops on production target/data, uncontrolled recipient,
secret disclosure, lost isolation/monitoring, unexpected privilege or exceeded cap.

| Step | Scope to approve | Responsible role | Sign-off status |
|---|---|---|---|
| 1 | Local source/artifact/migration freeze and sanitized evidence template | Engineering + test owner | PENDING EVIDENCE |
| 2 | DB identity/history/duplicates and backup/restore rehearsal | DB + infrastructure owner | PENDING EVIDENCE |
| 3 | Exact deployment/migration, post-checks and one-process setup | Infrastructure + DB owner | PENDING EVIDENCE |
| 4 | Registration and restricted email receipt | Test + email owner | PENDING EVIDENCE |
| 5 | Valid OTP, replay, duplicates and unchanged roles/passwords | Test + security owner | PENDING EVIDENCE |
| 6 | Wrong, expired and five-attempt-exhausted OTP | Test + security owner | PENDING EVIDENCE |
| 7 | Cooldown and new-ID resend; exhausted old ID stays invalid | Test + email/security owner | PENDING EVIDENCE |
| 8 | Overlapping quotas, Retry-After and reset boundaries; prefer mocks | Security + DB/email owner | PENDING EVIDENCE |
| 9 | Concurrent resend/verification on real PostgreSQL under explicit caps | Security + DB owner | PENDING EVIDENCE |
| 10 | CSRF/password/independent session then service property home | Test + application owner | PENDING EVIDENCE |
| 11 | Sign-in, CSRF logout and actual registry revocation | Test + security owner | PENDING EVIDENCE |
| 12 | Resume/expiry/restart, native HTTPS cookies/TLS and stale results | Test + mobile/security owner | PENDING EVIDENCE |
| 13 | Malformed requests, edge abuse limits and spoofed headers | Security + ingress owner | PENDING EVIDENCE |
| 14 | Provider/storage/registry faults, redaction and conditional cleanup | Security + monitoring/DB/email owner | PENDING EVIDENCE |
| 15 | Isolated recovery drill and fixture/session reconciliation | DB + incident owner | PENDING EVIDENCE |
| 16 | Approved cleanup/retention and final evidence sign-off | Cleanup/privacy + test owner | PENDING EVIDENCE |

Approval sequencing: first authorize evidence collection only. G1-G5 plus relevant
G6/G9/G10 ownership and a narrowly signed G11 are prerequisites for remote rehearsal
or setup; authorize each operation separately. No migration/deployment until G2/G3
evidence is approved. No email/auth test until G1-G6 and G8-G12 are approved for the
specific case, and authorized setup is verified. G7 remains BLOCKED: multi-instance
activity is excluded, not silently waived. Quota/fault/race/recovery approval is
independent of happy-path approval. Recheck scope after configuration/artifact
change; any failed gate returns dependent activity to HOLD.

## Approval record template (repeat per gate)

Gate ID: UNASSIGNED. Scope/artifact/target: UNASSIGNED.
Evidence references and verification date: UNASSIGNED.
Approver name/role, signature or approved ticket reference, UTC timestamp: UNASSIGNED.
Decision: PENDING EVIDENCE. Conditions/exclusions/expiry: UNASSIGNED.
Failed-gate owner, remediation and re-verification requirement: UNASSIGNED.

This package's original preparation was documentation-only. Subsequent local code
validation is recorded in LOCAL_BLOCKERS_VALIDATION.md; no remote checks, secret
inspection, migrations, real email or account actions were performed. Next action is assignment of owners and scoped evidence-collection
authorization; it is not staging setup. Staging and production remain NOT VERIFIED.
