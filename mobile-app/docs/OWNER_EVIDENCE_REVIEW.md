# HOMEZONE - Owner evidence review and action register

Review date: 2026-10-24. Decision: **READY FOR FORMAL OWNER REVIEW; STAGING ON HOLD**.
**Staging: NOT VERIFIED. Production: NOT VERIFIED. No gate is APPROVED.**

Read with [INFRASTRUCTURE_OWNER_SIGNOFF.md](INFRASTRUCTURE_OWNER_SIGNOFF.md),
[INFRASTRUCTURE_READINESS_GATE.md](INFRASTRUCTURE_READINESS_GATE.md),
[STAGING_REGISTRATION_READINESS.md](STAGING_REGISTRATION_READINESS.md) and
[LOCAL_BLOCKERS_VALIDATION.md](LOCAL_BLOCKERS_VALIDATION.md).

## Local evidence compared with owner requirements

The latest report records successful TypeScript checks, six smoke checks, 120
reported Node tests (40 registration), lint, 293 Flutter tests, offline Prisma
schema validation and a corrected offline Android debug build. Existing log tails
were inspected; these commands were **not rerun** in this documentation review.
The Android artifact is the default offline app, not a verified staging build.
No native UI, actual PostgreSQL contention, inbox delivery or live authentication
is established by these results. Tests and docs do not constitute owner approval.

Local source confirms fail-closed canonical auth selection and exact recipient
guards for registration/reset Resend dispatch. Shared password account/aggregate
admission is now implemented locally (see G7 update below). Effective remote configuration, secret custody, target isolation,
named owners and signed test authority are absent from the supplied evidence.

Subsequent G7 engineering evidence: [G7_DISTRIBUTED_SIGNIN.md](G7_DISTRIBUTED_SIGNIN.md).
Runtime password admission now uses PostgreSQL account/aggregate counters with no
memory fallback. Earlier process-local statements are historical; client controls,
configuration/operations approval and real distributed verification remain absent.

## Owner action register - all evidence still outstanding

Each owner must supply a name, dated evidence reference, target/artifact scope,
approval expiry and decision. Safe procedures are conditional on separately
authorized evidence collection; none is executed remotely by this review.

| Gate / status | Available local evidence and its limit | Responsible owner | Required evidence and acceptance criteria | Safe verification and stop condition |
|---|---|---|---|---|
| G1 - PENDING EVIDENCE | Prisma target selector inspected; no remote target or isolation proof | Infrastructure + DB | Non-secret app/environment/database/schema IDs; restricted runtime/migrator grants and network policy; both resolve the same dedicated staging database/schema and cannot access production | Privately review references first; after DB-read permission compare effective identities in both contexts. STOP on mismatch, inherited unknown target or production access/data. |
| G2 - PENDING EVIDENCE | 18 SQL files inventoried; schema validation cannot prove applied history/data | DB/migration + application | Exact applied/pending/checksum/drift report, failed migration status, count-only case/trim/blank email audit and preserving remediation, enum/data compatibility, approved index/lock/statement budgets | Authorized count-only/history inspection and separate disposable migration rehearsal. STOP on unresolved duplicates/drift, incompatible casts or lock overrun; no automatic merges/deletes/history edits. |
| G3 - PENDING EVIDENCE | Recovery plan only; no backup or restore evidence | DB/recovery + incident | Encrypted staging backup ID/integrity/access/retention, RPO/RTO, SECOND isolated restore target, successful restore/rehearsal, compatible app and partial-failure runbook | Explicit rehearsal authority before backup/restore/migrations; validate history, indexes, constraints and counts. STOP if restore/identity/integrity/timeout fails; no deploy. |
| G4 - PENDING EVIDENCE | Canonical-origin regressions passed; not actual deployment manifest | Infrastructure + application/security | Approved consistent AUTH_STAGING_ORIGIN/AUTH_URL/NEXTAUTH_URL, optional site URL, compiled mobile origin/environment and artifact identity; preDeploy scope reviewed | Review non-secret manifest privately; local guard rejects missing/conflicting config but does not attest DB isolation. STOP on production/wrong/empty origin, stale artifact or unresolved scope. |
| G5 - PENDING EVIDENCE | Format/runtime guards only; no actual secrets inspected | Secret custodian + security/infrastructure | Staging-only secret-manager references/versions, entropy/generation/access/rotation attestations for DATABASE_URL, AUTH_SECRET, OTP_PEPPER, PASSWORD_SIGNIN_HMAC_KEY, RESEND_API_KEY; approved sender; unused/demo providers disabled | Custodian validates privately; share pass/fail and references, never values/fingerprints. STOP on missing/weak/production-reused secret, development fallback, exposure or unknown custody. |
| G6 - PENDING EVIDENCE | Ingress contract missing; general limiter trusts forwarded headers | Ingress + security/infrastructure | TLS/Host/proto/header rewrite and ambiguity rejection, direct-origin closure, body/time/concurrency limits, repeated Set-Cookie policy, clock sync and exactly one Node process/no deploy overlap | Authorized policy inspection, then only approved synthetic checks. STOP on spoofing/bypass, TLS/cookie issue or extra process. Single-process scope does not close G7. |
| G7 - BLOCKED | PostgreSQL account/aggregate admission implemented locally; only mocked concurrency tested | Engineering + security/infrastructure | Review G7_DISTRIBUTED_SIGNIN.md; approve target/key/policy, capacity/cleanup/timeouts and trusted client/client-account controls; provide authorized multi-instance contention/restart/expiry/failure evidence | Privately approve configuration/design, then explicitly authorize isolated distributed verification. STOP multi-instance use until full controls and actual behavior are verified; mocks are insufficient. |
| G8 - PENDING EVIDENCE | Actual Resend adapter guards tested with mocked fetch; not configured provider or receipt | Email/provider + security/test authorizer | Approved controlled mailbox aliases/custodians, private exact STAGING_EMAIL_RECIPIENTS list and staging marker, verified sender/domain, separate credential, permitted counts and provider/egress controls; alternative channels disabled | Review policy privately before sending. Only after mail authorization check rejection and controlled receipt. STOP on missing policy/marker, unauthorized recipient/provider, unsafe alternative route; acceptance is not inbox receipt. |
| G9 - PENDING EVIDENCE | General exception/SQL logging remains a known risk; no safe pipeline/alert proof | Monitoring/on-call + security | Safe capture-boundary redaction across app/DB/proxy/provider/crash reports, bounded metrics, approved thresholds, alert delivery/response evidence and named on-call | Use synthetic markers locally; remote alert/fault checks require scope. STOP if sensitive content escapes, alert path fails or on-call absent. DSN/LOG_LEVEL alone are insufficient. |
| G10 - PENDING EVIDENCE | On-request bounded cleanup only; no idle retention/incident evidence | Privacy/cleanup + DB/incident | Approved retention periods and owned cleanup for pending accounts, tokens, live-vs-expired budgets, mail, backups/artifacts; fixture disposal, incident contacts and stop/recovery/resumption authority | Review policy before collecting data; demonstrate approved safe cleanup/recovery on authorized fixtures. STOP on unowned data, destructive cascades, live budget removal or no recovery owner. |
| G11 - PENDING EVIDENCE | Sixteen-step matrix prepared; no signed scope/limits/accounts | Test authorizer + infrastructure/security; DB/email for affected actions | Signed versioned matrix with included/excluded steps, endpoints/methods, UTC window, artifacts, device/account aliases, per-case/aggregate ceilings, operators, stop thresholds and separate DB/deploy/mail/race/fault/recovery permissions | Review completed checklist below before any dependent action. STOP if authority is absent/expired, case excluded, cap reached or scope changes. Read-only authority does not permit mutation/email. |
| G12 - PENDING EVIDENCE | Memory-only sessions/deletion limitations documented; no product/privacy approval | Product/privacy + security | Controlled-test disclosure and disposal approval; accepted restart/revalidation/logout uncertainty; public deletion/anonymization, retention/privacy/support/consent backlog assigned | Review contract and fixture handling; no unsupported deletion or persistence claim. STOP on public rollout, real customer data, implied remote deletion or server revocation without evidence. |

## Staging authorization checklist - all unchecked / PENDING EVIDENCE

Complete with non-secret IDs/references. Actual mailbox addresses stay in approved
private configuration; no secret values, session/OTP/reset/CSRF tokens or raw bodies.

- [ ] Named authorizer, executor, observer, infrastructure/DB/security/ingress/email/
  monitoring/privacy/product approvers and incident/cleanup/recovery contacts.
- [ ] Dedicated application/environment/service, database/schema and restore-target
  IDs, restricted roles/network isolation; production-denial and target agreement.
- [ ] Full 18-file manifest and actual applied/pending/checksum/drift review;
  duplicate/normalization decision, lock/time/space budgets and approved migration role.
- [ ] Encrypted backup and successful second-target restore evidence, RPO/RTO,
  compatible app/schema rollback or forward-repair plan, partial-failure handling,
  traffic/mail pause and explicit recovery/resumption authority. No blind DB rollback.
- [ ] Exact backend/mobile artifact IDs and source/migration digest; backend
  canonical staging origins, Flutter service defines and approved image hosts.
  Default offline APK is not a substitute for approved service-mode configuration.
- [ ] Staging-only secret custody/entropy/access/rotation attestation; correct
  provider/sender and demo/unused providers disabled. No environment dumps.
- [ ] Controlled disposable test-account/mailbox aliases and custodians, privately
  approved exact recipients in STAGING_EMAIL_RECIPIENTS, staging marker, email caps,
  provider restrictions and outbound/media boundaries. Real customer data excluded.
- [ ] Trusted HTTPS ingress, direct-origin restrictions, header/cookie policy,
  request/body/time/concurrency limits, synchronized clocks, one Node process and
  no autoscaling/overlap. Multi-instance use excluded while G7 is BLOCKED.
- [ ] Proven safe logging/redaction, metrics, thresholds, alert delivery and on-call
  response; retention/evidence access and cleanup deadlines with named owners.
- [ ] Versioned authorization for matrix steps 1-16 with each step explicitly
  included/excluded, UTC window, endpoint/method allowlist, devices and accounts,
  attempt/request/delivery/concurrency/duration ceilings (per-case and aggregate).
- [ ] Separate written permissions for remote read-only discovery, backup/restore
  rehearsal, deployment/migration, email/account actions, replay, concurrent races,
  quota exhaustion, controlled faults, recovery drill and cleanup. None implied.
- [ ] Universal STOP rules: production target/data, loss of isolation, wrong
  recipient, sensitive output, unavailable monitoring/recovery owner, privilege
  anomaly, exceeded budget, failed migration/restore or expired authorization.
- [ ] Gate evidence IDs, approver/date/expiry, accepted limitations and restart
  conditions recorded. Configuration/artifact changes require affected re-review.

Sequence: approve evidence-collection scope first; then separately approve isolated
rehearsal. Do not migrate/deploy until history/restore evidence is accepted. Do not
run email/auth tests until G1-G6 and G8-G12 are approved for their exact scope and
authorized setup is verified. G7 remains BLOCKED until shared implementation AND
multi-instance verification, even if a limited single-process test is later approved.
All 16 remote matrix steps remain NOT RUN; this review grants no authorization.

## Code versus infrastructure and policy work

- **Code implemented locally, remote configuration pending (G4/G8):** canonical
  origin fail-closed logic and exact Resend recipient policy. No further code
  change is justified solely to obtain owner signatures. Startup/preDeploy isolation
  checks remain absent; target attestation is required before automatic migrations.
- **G7 local code implemented, gate still BLOCKED:** PostgreSQL account/aggregate
  password admission now reuses the existing table. Owners must approve this use,
  shared key/policy and client/client-account enforcement; authorize multi-instance
  verification. No trusted client-IP source was invented.
- **Conditional code work (G9/G10):** fix unsafe capture boundaries if owners cannot
  demonstrate safe logging; implement scheduled retention if no approved operational
  cleanup meets policy. Never erase live quotas to clear tests.
- **Product/privacy-led future code (G12):** supported deletion/anonymization and
  secure persistent restoration remain absent. Limited tests must acknowledge this;
  no public-release claim. No blind cascade-delete workflow is approved.
- **Owner/infrastructure evidence (all remaining gates):** isolation, credentials,
  migration/recovery, ingress, sender/recipients, monitoring, retention, named
  people and signed scope cannot be supplied by repository tests or documentation.

## This review's findings and preservation

No new application defect was established by this documentation review. Outstanding
known blockers and evidence gaps remain as listed. The local evidence has no
remote attestation or approved staging-artifact identity; this is an evidence limit,
not a new code failure. No supplied owner evidence justified changing any gate.

Only documentation and local inspection were performed. No tests/builds were
rerun; no secret configuration, database, provider or remote system was accessed.
Git whitespace/document consistency and initial/final hash/status checks are the
only fresh validation; records use ignored build/qa-owner-evidence-review.
Existing source, configuration, changes and QA artifacts are preserved.
