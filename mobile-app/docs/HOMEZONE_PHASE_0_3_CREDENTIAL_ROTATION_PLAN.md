# Phase 0.3 — staging credential rotation plan

Date: 2026-10-30. **NOT READY FOR FOUNDER ROTATION APPROVAL** until the target, consumer inventory, supported rotation action and deployment/migration side effects below are established. The need for rotation is confirmed by the founder's exposure report; missing operational evidence must not be mistaken for permission to ignore the exposure.

## Scope and current evidence

Planning only. Local main at 09a39de3888772c2ca712355a16f89d2c379a392. Read latest Phase0/0.2 reports, inspected backend/db.ts, src/lib/db.ts, backend/auth.ts, middleware.ts, src/lib/auth/session-registry.ts, src/lib/env.ts, prisma/schema.prisma, railway.json, package.json and existing backup/deployment guidance. Existing untracked Phase0.2 report preserved.

No secrets generated/read/displayed; no private environment file, credential URL or Railway variable dump inspected. No new requests, database connections/commands, accounts, changes, restarts/deployments, migrations, builds/tests, commits or pushes. Production not accessed.

Founder reports staging AUTH_SECRET and DATABASE_URL credentials were exposed in an earlier screenshot. Treat both compromised without retrieving/reprinting them. DATABASE_URL is a connection setting: the actual exposed PostgreSQL login credential must be invalidated; changing the setting string alone does not revoke database access.

## PASS / FAIL / UNKNOWN assessment

| Check | Status | Evidence / limit |
| --- | --- | --- |
| Compromised credentials identified for remediation | PASS, founder evidence | Exposure of staging AUTH_SECRET and database login reported; no secret contents needed. |
| Compromised credentials remediated | FAIL — outstanding | No rotation performed or supplied revocation evidence. |
| Intended staging names identified | PASS, founder confirmation | HomeZone project, staging, HomeZone backend, Postgres-9ZqA. Current service IDs/reference mapping still unknown. |
| Staging and production PostgreSQL physically/logically separate | UNKNOWN | Different domains do not establish different instances/databases/roles. No private target/reference evidence. No production access in this task. |
| Separate staging/production AUTH_SECRET and database credentials | UNKNOWN | No owner provenance/isolation attestation. If shared, staging-only rotation cannot be assumed safe; request separately scoped incident response. |
| Application uses DATABASE_URL | PASS, source | prisma/schema.prisma datasource PostgreSQL env DATABASE_URL; backend/db.ts PrismaClient with log:[]; src/lib/db.ts re-exports shared client. No separate directUrl/shadow selector in datasource. |
| Railway PostgreSQL credential reference mechanism identified | UNKNOWN | Could be service reference, shared-variable reference or literal copy. No effective variable/reference metadata accessible. Do not assume a specific template/reference automatically propagates or rotates the actual DB password. |
| All affected services known | UNKNOWN | Backend and migration runner need valid target; workers/cron/CI/tools/other replicas or shared services not inventoried. Do not assert only one variable needs updating. |
| AUTH_SECRET consumers identified in source | PASS | backend/auth.ts:163 secret passed into Auth.js; middleware.ts:73–75 getToken uses process.env.AUTH_SECRET. src/lib/env.ts parses configuration at module initialization. |
| Existing session/revocation architecture identified | PASS, source | JWT-cookie strategy, sessionMaxAge30days, DB AuthSession plus User.sessionVersion and suspension checks; src/lib/auth/session-registry.ts. Actual deployed version unknown. |
| Public staging callback origin corrected | PASS, historical only | Phase0.2 GET at2026-10-30 09:52:09.510 UTC, request14yqWg-NTF2saD16s_GTAg: callback/sign-in origins staging; no request repeated here. |
| PIN provider available in last observation | FAIL, historical | Same response password-only; mobile-pin absent. Rotation must not be misreported as PIN activation. |
| Exact deployed SHA/ID/replica version known | UNKNOWN | No authenticated Railway deployment metadata. Local SHA not deployed evidence. |
| Rotation mechanism supported/proven for this DB | UNKNOWN | No platform/DB-owner-approved procedure selected; no guessed SQL or platform button asserted. |
| Deployment can apply migrations | PASS, source risk | railway.json preDeployCommand npm run db:migrate → prisma migrate deploy applies ALL pending migrations. Actual dashboard overrides/trigger behavior unknown. |
| Current migration pending set and backup/restore evidence | UNKNOWN | Supplied08:52 logs report21/no pending on railway/public at Postgres-9ZqA; not full history/catalog/recovery or artifact/target proof. |

## Reference and consumer inventory required before approval

Owner privately maps each staging consumer to its resolved database service/instance, database/schema, login role and secret reference/version, recording only nonsecret identities and compliance. Do not export URLs/passwords or compute/report secret fingerprints.

| Consumer | Known from source / action to establish |
| --- | --- |
| HomeZone backend, every replica | Prisma runtime uses DATABASE_URL; Auth.js and middleware need matching AUTH_SECRET on same release/process set. Record service ID/replica count. |
| Railway pre-deploy/migration runner | Uses Prisma DATABASE_URL. Confirm reference and exact privileges separately from app runtime. |
| Other jobs/workers/cron/admin tools/CI/local approved consumers | UNKNOWN; owner inventories staging usage before rotating. Repository CI dummy environment is not evidence of real staging credential consumption. |
| Database service and exposed role | Identify exact service ID, actual role and supported credential-rotation mechanism; do not assume changing a template environment variable updates PostgreSQL's active role password. |
| Production/shared references | Owner attests isolation privately without authorizing this agent to inspect/change production. Any shared role/secret/reference requires separate impact review; halt staging-only execution. |

If DATABASE_URL references a database service variable, confirm the reference chain and when dependent processes receive resolved changes. If copied, every approved copy needs updating. In both cases existing running pools may retain sessions until explicitly drained/replaced. A single reference update does not establish all consumers use the new credential.

## Safest proposed order

Use one controlled staging maintenance window; do not run independent hot edits while services continue serving mixed credentials/secrets. Preferred order inside that window: **drain/quiesce → rotate underlying database credential and update consumers → replace AUTH_SECRET consistently → approved coordinated process rollout → verify → reopen traffic**. Restoring DB access first establishes the dependency required by session registry checks. If an incident owner determines immediate auth-key invalidation is more urgent, approve that deviation explicitly; no universal claim of risk-free ordering.

Separate the rotation from PIN activation, unrelated source rollout, pepper changes and migrations. Preserve MOBILE_PIN_PEPPER_V1/MOBILE_PIN_RATE_LIMIT_KEY unless separately implicated/approved. Preserve website/admin architecture; existing staging website sessions are affected by AUTH_SECRET rotation too.

### Exact dependency-based sequence — future actions, not commands executed

1. **Freeze identity and scope:** confirm project/environment/backend/database IDs, current deployed SHA/ID, domain mapping, all consumers/replicas and production isolation. Obtain owner-approved contact/window and recovery operator. If ambiguity/shared production access exists, stop for separately scoped incident planning.
2. **Reconcile deployment effects:** privately inspect effective variables/references, staged changes, save/apply/restart triggers, pre-deploy command/overrides and full migration history/pending set against the serving artifact. Do not use redeployment to discover identity. Require confirmed empty pending set or separate explicit migration approval before any rollout that runs pre-deploy. No ad-hoc command override is authorized by this plan.
3. **Prepare recoverability:** obtain recent encrypted/access-restricted staging backup or snapshot evidence, retention/storage/access owner and recent restore-test evidence to a separate disposable target. Record application artifact/configuration manifests, secret custodian and known-good startup criteria. Never restore over the live target as routine rotation. Backup may contain sensitive data; do not attach it to reports. Any new backup/restore operation needs explicit scope approval.
4. **Choose supported DB operation:** database owner identifies the exact platform-supported credential change and revocation process, role privileges, dependent service references and effect on existing sessions. Specify whether a second uncompromised credential/role can be used temporarily or an in-place password change is required; do not assume either supported. Supply operation description to founder without values or arbitrary SQL. Approve any role/session changes separately.
5. **Approve private provisioning and maintenance:** owner/custodian prepares fresh independent high-entropy AUTH_SECRET and DB credential using approved secret management only after founder approval. Current env schema minimum16chars is validation, not adequate entropy assurance; plan at least32random bytes for AUTH_SECRET. No material goes into Git/chat/CLI arguments/Dart defines/logs/screenshots. Do not provision here.
6. **Quiesce all staging credential consumers:** with explicit approval pause/drain traffic and jobs using a supported controlled mechanism. Avoid mixed AUTH_SECRET replicas or old DB credential consumers. Record actual start of downtime. If quiescing requires infrastructure/settings/restarts, include exact actions in approval. Do not alter production routing.
7. **Rotate DB authentication:** approved DB owner replaces the underlying staging login credential, updates all necessary private reference sources/copies, and applies them to authorized consumers. Preserve host/database/schema/options/permissions and service identity unless separately approved. In-place rotation can interrupt new connections; established DB sessions are not guaranteed revoked merely by changing a password. Include explicit owner-approved termination/draining of old sessions and retirement of any temporary/exposed credential. Never leave old access usable indefinitely for convenience.
8. **Rotate AUTH_SECRET:** replace consistently for all staging Auth.js/middleware processes/replicas. No dual-secret acceptance of the known-exposed key. The reviewed configuration passes one secret, with no custom keyring/overlap migration. Keep current canonical staging URLs unchanged. Do not auto-enable mobile-pin.
9. **Apply approved coordinated runtime refresh:** restart/redeploy ONLY the confirmed staging consumers with the approved known source/artifact, new DB reference and auth key. A variable update might trigger this itself; coordinate application rather than assume a manual restart is the sole trigger. Record IDs/SHA/time. Do not allow unexpected migrations or unrelated code into this incident change.
10. **Verify in order while gated:** first fresh-connection database access, then startup, public read, auth configuration and session-invalidity behavior as below. No test account or login is authorized automatically. If checks fail, keep traffic controlled and use recovery plan, never reinstate the exposed secrets.
11. **Close/reopen:** confirm all replicas/jobs on intended new configuration, exposed DB credential no longer usable through an owner-approved private verification method, no old active sessions left outside approved policy, and no secret exposure in logs. Reopen staging only with operator acceptance. Record downtime and unresolved PIN availability separately.

## Session and downtime impact

- Expect existing Auth.js cookies, including saved Flutter credentials, to become unusable after the key is replaced everywhere. Users must sign in again. Old DB AuthSession records may still exist; changing AUTH_SECRET does not mark rows revoked or increment User.sessionVersion. If policy requires registry invalidation, that is a separate approved DB write, not implied by this rotation.
- Mixed old/new keys across workers can cause intermittent authentication failures and acceptance by old-key workers. Drain/replace all consumers coherently; do not retain the compromised key to preserve sessions.
- Database password changes need fresh connection tests. A warm pool can mask wrong configuration; existing sessions may keep working until terminated. Application startup logs alone need not exercise Prisma because connection establishment may be lazy. Session validation fails closed when DB is unavailable.
- Expected outage duration UNKNOWN, not zero: depends on supported role operation, number of consumers, credential propagation, process rollout and verification. Plan a maintenance interruption covering all these steps; do not promise minutes without measured staging rollout evidence.
- Staging website/admin sessions can also be invalidated. Production must remain unaffected; isolation proof is a precondition, not an assumption.

## Verification plan — separate authorization before execution

| Checkpoint | Safe evidence / acceptance | Boundary |
| --- | --- | --- |
| Correct target/reference | Private operator attestation: exact staging service/database/schema/role and every consumer reference match intended target | No values, production access or secret dump. |
| DB new credential usable | Authorized DB owner performs a bounded fresh-connection read-only check using approved private mechanism; confirm intended DB identity and no authentication/permission error | New DB access/query requires approval; no SQL executed/provided here. Do not expose connection parameters. |
| Old database access revoked | Owner-approved private validation of old login rejection and old session retirement; record pass/fail only | No password in shell arguments or logs. Any termination/role change explicitly approved. |
| Startup/process identity | Deployment/process logs record approved SHA/ID and Next.js ready without DB/auth configuration failures | Ready alone is not DB connectivity proof; sanitize messages before sharing. |
| Application DB query | Approved GET staging /api/mobile/properties?page=1&pageSize=12, expect200/source database with valid envelope, empty allowed | Public read-only check; proves only exercised catalogue query, not all tables or authentication. No new request in this task. |
| Canonical provider URLs | Approved GET staging /api/auth/providers; advertised URLs stay staging; record provider IDs only | Does not prove DB access or PIN activation. Missing mobile-pin remains separate blocker. |
| Session impact | With authorized existing session/device trial, prior credential cannot authenticate after rollout; app returns unauthenticated state | Existing Auth.js callbacks may write session-related state; scope account/session verification separately. Never export cookies/session bodies. |
| Fresh auth / full PIN flow | Later approved private test identity/PIN, Auth.js CSRF/callback/session/profile, correct role, restart/logout | Requires PIN readiness and separate account/quota/session-write/device authorization. Not part of read-only rotation checks. |

Do not attempt registration POST or protected profile GET as generic read-only health checks: registration writes quotas and profile helpers can create missing profiles. Avoid synthetic accounts/OTP. Sanitized evidence contains timestamp,service/deployment identity,status,error category only, no private data or raw exceptions.

## Backup/recovery and rollback

docs/BACKUP_AND_RESTORE.md documents general logical-backup/restore guidance, but is not evidence of an available backup. Its restore example includes --clean and migration commands: do NOT run it on staging as a rotation rollback. This plan authorizes none of those operations.

Prefer forward recovery with uncompromised credentials. Preserve known-good compatible artifact and intended configuration references, DB backup/restore evidence, access permissions and operator escalation path. If rollout fails, pause further attempts and obtain approval to restore a compatible application artifact configured with NEW credentials, or provision another approved uncompromised credential through owner procedure. Do not roll back AUTH_SECRET/database password to exposed values. No destructive schema/data rollback is needed for a credential-only change; do not restore a DB backup unless separately justified and approved.

DB rotation may require a staged alternative-role strategy if supported; any temporary overlap must have an approved short cutoff and revocation plan, not indefinite acceptance. Credential/session revocation and secret destruction/custody actions belong in the execution approval. Preserve PIN pepperv1 and existing hashes/accounts/session registry. Remove/restrict exposure artifacts through owner-approved handling without deleting unrelated user work; review logs/access evidence privately for possible misuse.

## Remaining PIN deployment/migration prerequisites

Local PIN registration/provider commit9f45e985c06168fe3f398ad6174e7607ab718fef is in local history, but deployed SHA unknown. Local21 migrations include20261030120000_mobile_pin_foundation; required MobilePinCredential/MobilePinLoginBudget plus User/Profile/sessionVersion/AuthSession must exist in actual schema/client. No exact applied history/catalog proven by21/no-pending logs alone.

Before activating AUTH_MOBILE_PIN_ENABLED=true, reconcile deployed source/client, migration filename/checksum/history/partial state, canonical staging origin, pepperv1/quota-key compliance and operational capacity. Provider opt-in occurs at initialization; credential rotation does not itself add a missing provider. Preserve current no-OTP/PIN-only mobile architecture, five public role validation, website/admin auth and preview separation. Do not combine pending PIN migration/activation with rotation unless a later approval explicitly scopes both.

## Founder approval gates and exact next action

1. **Evidence gate:** supply sanitized current staging deployment/service/database identities, production-isolation attestation, consumer/reference inventory, supported DB rotation procedure, rollout-trigger/predeploy behavior and backup/restore evidence.
2. **Execution approval:** exact underlying DB credential operation, all variable/reference updates, AUTH_SECRET provisioning, quiescing/rollout actions, anticipated interruption, old DB-session retirement and recovery plan. Do not seek approval for an unspecified global database reset/rotation.
3. **Migration gate:** any pre-deploy pending migrations require independently approved complete pending set; otherwise stop rollout.
4. **Verification gate:** separately authorize fresh DB read/public requests and any session/account/device checks. No live writes or account creation implicitly included.

Smallest next founder action: provide the evidence package for gate1 so this conditional plan can become a concrete service-scoped execution request. Do not share credential values. Security remediation is necessary, but target/reference/consumer uncertainty currently prevents safely approving the rotation execution.

Only this document added; prior work preserved. No source/configuration, database, credential, environment, production or Git state changes beyond the requested document; no accounts, requests, migrations, restarts/deployments, builds/tests, commits or pushes.

**NOT READY FOR FOUNDER ROTATION APPROVAL.**
