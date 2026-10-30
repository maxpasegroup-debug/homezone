# PIN staging activation blockers

Review date: 2026-10-30. Verdict: BLOCKED FOR ACTIVATION; source implementation is not runtime verification.

| Finding | Evidence / classification | Required owner evidence or approval |
| --- | --- | --- |
| Exact deployed version unknown | Local HEAD `bef2561fd536a5715edf61efb8733e7ee811394e`; PIN integration commit `9f45e985c06168fe3f398ad6174e7607ab718fef`. Neither proves deployed version. | Staging dashboard deployment ID, SHA, branch/root, status, replica count and domain mapping. |
| Target identity not independently confirmed | Historical project/environment/backend IDs recorded in activation plan; intended database Postgres-9ZqA has no verified service ID/reference/schema here. | Confirm all service IDs and private runtime/migrator database reference agreement; exclude production. |
| Provider absent | Current GET providers HTTP 200, `mobile-pin` absent. Source adds it only for literal `AUTH_MOBILE_PIN_ENABLED=true` at initialization. | Compare deployed source with effective flag and process version. Missing/invalid flag is supported, not confirmed; older/different bundle remains possible. |
| Registration POST not verified | Current GET registration HTTP 405, consistent with POST-only route; historical 404 is no longer current evidence. | Fresh deployed route/build proof; approved account trial later. Do not probe with POST before write approval. |
| Migration state unknown | 21 local migrations; PIN migration adds two models. Historical 20 successes do not establish current schema/history. | Full sanitized migration history/checksums/attempt logs, actual table/column/check/index/FK definitions, drift/partial-effect review. |
| Deployed client unknown | Local generated client schema contains both PIN models; stale local Next artifact lacks route. | Fresh exact-commit build and Prisma generation evidence from actual staging artifact. Local artifact is not Railway artifact evidence. |
| Effective configuration unknown | No private staging metadata available; no missing secret is asserted. | Owner checks all requirements in activation plan privately, reports compliance only. Canonical origin and staging override must agree. |
| Trusted ingress policy unresolved | Without approved trusted header all registration clients share conservative 10/hour bucket. | Establish ingress overwrite guarantees before selecting a header; do not trust arbitrary client-supplied forwarded addresses. |
| Recovery/operational evidence absent | Migration additive by inspection, not executed/validated here; live locks, permissions, capacity and partial objects unknown. | Backup/restore evidence, pending-set approval, maintenance/recovery plan. |
| Authentication workflow unverified | No account creation/login/session trial in this review. | Explicit controlled write authorization, private test identity/PIN entry, Android availability and actual UI/request/session evidence. |

## Security behavior retained in reviewed source

- Six ASCII numeric PIN characters preserve leading zeros; India-normalized unique credential identity, never editable Profile.phone linking.
- Salted versioned scrypt with pepper and purpose separation; bounded KDF concurrency; no plaintext PIN storage.
- Database-backed independent registration quotas; atomic counters, bounded cleanup and HMAC identifier keys. Login has aggregate protection and per-number failure budgets across IPs. Successful login does not consume failed-attempt allowance; blocked attempts do not extend temporary window.
- Atomic User, credential and public-role Profile creation. Public roles: USER, OWNER, BROKER, BUILDER, SERVICE_PROVIDER; no public ADMIN/SUPER_ADMIN. No overwrite of existing account credentials/associations. Concurrent unique conflicts receive generic acknowledgment; legacy phone collision is not linked.
- Email remains unverified/null. No phone ownership proof, OTP, Forgot PIN or credential-recovery flow. User must understand the no-verification identity policy and recovery limitation.
- Existing Auth.js CSRF, cookie/session registry, suspension checks, profile authority and revocation remain authoritative. Fixed stage/category diagnostics omit raw exceptions, identifiers and credentials.

These are source findings, not proof of deployed constraints, PostgreSQL concurrency behavior or operational readiness. The migration's SQL-only checks must be present in the actual catalog, not inferred from generated Prisma types.

## Exact approvals still required

1. Staging configuration changes, including provider activation and any deployment triggered by those changes.
2. Exact reconciled pending migration action against independently verified staging database, with recoverability evidence.
3. Exact backend deployment target/commit and rollback plan.
4. Controlled test-account creation, authentication/quota/session writes, device execution and subsequent verification trials.

Next owner action: provide sanitized staging deployment identity/SHA and private configuration-compliance plus migration/schema/recovery evidence for review. Keep secret values, complete URLs and personal data private. Until this evidence is reviewed, do not activate or deploy.

See [activation plan](HOMEZONE_PIN_STAGING_ACTIVATION_PLAN.md) for required variable names, source conditions, evidence timestamps and gated sequence. This review made documentation changes only; no activation, database access/writes, production access, configuration changes, builds, tests, account operations, deployments, commits or pushes.
