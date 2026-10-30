# Phase 0.4 — infrastructure evidence audit

Date: 2026-10-30. Local main/09a39de3888772c2ca712355a16f89d2c379a392. **Safe to continue conditional credential-rotation planning; NOT safe to execute rotation on current evidence. Founder infrastructure evidence is still required.**

## Scope and evidence sources

Read HOMEZONE_PHASE_0_STAGING_READINESS.md, HOMEZONE_PHASE_0_2_DEPLOYMENT_VERIFICATION.md and HOMEZONE_PHASE_0_3_CREDENTIAL_ROTATION_PLAN.md. Reconciled source references in prisma/schema.prisma, backend/db.ts, src/lib/db.ts, backend/auth.ts, middleware.ts, src/lib/env.ts, railway.json, package.json and .github/workflows/ci.yml; reviewed docs/BACKUP_AND_RESTORE.md, docs/SMOKE_TESTS.md and existing staging/production identity reports.

PASS confirms the specific source/documented/supplied-evidence claim only. FAIL identifies an unmet required condition. UNKNOWN means evidence is unavailable, not that a service, backup or isolation control is absent. All live infrastructure findings below are bounded by lack of authenticated Railway access; CLI remains unavailable on PATH. No secret/auth-config files, environment values or connection strings inspected. No public requests repeated.

## 1. Known projects, environments and services

| Finding | Status | Exact evidence / limitation |
| --- | --- | --- |
| HomeZone project named | PASS, founder confirmation | Phase0.2 founder information: project HomeZone, repository maxpasegroup-debug/homezone. No evidence establishes another separate project; do not invent one. |
| Historical project identifier available | PASS, historical only | HOMEZONE_STAGING_DEPLOYMENT_IDENTITY_REPORT.md: 1f8c9007-2993-426c-bbd0-b8dd0a0b17da from earlier screenshot/context. Current ID not independently confirmed. |
| Staging environment/backend named | PASS, founder confirmation | staging; HomeZone backend; https://homezone-staging.up.railway.app. |
| Historical staging IDs available | PASS, historical only | Environment2181eadf-21a0-4ca3-8269-b6b6f28af9f4; backend ea6ca516-4063-4ed1-be95-bebcc0d1af00. Current identity/domain mapping UNKNOWN. |
| Intended replacement staging DB named | PASS, founder confirmation | Postgres-9ZqA; Phase0.2 and supplied08:52 UTC startup/migration logs. Exact database service ID/reference UNKNOWN. |
| Older database service known historically | PASS, historical only | Postgres-WU4G in HOMEZONE_STAGING_DATABASE_READINESS.md and prior supplied failure context; do not treat it as current staging or production DB. Current existence/use UNKNOWN. |
| Production environment/domain known | PASS, founder confirmation | Production public domain https://speeko.online; alternative homezone-production.up.railway.app historically owner-reported. Current project/environment/backend/database IDs UNKNOWN. No production access performed. |
| Every current project/environment/service inventoried | UNKNOWN | No current Railway resource topology/export. Extra backend services, workers/cron/migration jobs, plugins and shared services may exist but are not verified. |
| Active/latest deployment and replica identities | UNKNOWN | No current deployment ID/SHA/status/time or effective replica settings. Local commit does not identify live artifact. |

Named runtime service known from supplied evidence: HomeZone backend. Railway pre-deploy runner is an execution context declared in configuration, not evidence of a separate permanently deployed service. PostgreSQL is a named dependency; no proof that extra workers/cron exist. Do not confuse possible consumers with confirmed live services.

## 2. Database reference and isolation map

```text
SOURCE, environment supplied externally:
HomeZone backend → shared PrismaClient → DATABASE_URL → PostgreSQL
HomeZone pre-deploy runner → prisma migrate deploy → DATABASE_URL → PostgreSQL

INTENDED STAGING, live reference chain UNKNOWN:
HomeZone/staging → DATABASE_URL → Postgres-9ZqA → database railway/schema public
  (last database/schema/host seen in founder-supplied08:52 logs, not fresh identity proof)

PRODUCTION, not inspected:
speeko.online → production backend identity UNKNOWN → DATABASE_URL target UNKNOWN
```

| Check | Status | Evidence |
| --- | --- | --- |
| Prisma selector identified | PASS, source | prisma/schema.prisma:29 env DATABASE_URL; PostgreSQL provider. No datasource directUrl/shadow selector. backend/db.ts shared PrismaClient; src/lib/db.ts re-export. |
| Staging runner used reported Postgres-9ZqA host | PASS for supplied log statement | Founder logs at2026-10-30 08:52 UTC: database railway/public on postgres-9zqa.railway.internal;21 migration files/no pending; Next.js ready. No secrets required to cite nonsecret target identity. |
| Runtime and migrator resolve same intended target | UNKNOWN | Runner log alone does not prove current app runtime reference, current deployment or identical consumers. |
| Production database reference identified | UNKNOWN | No authorized production metadata inspection; public domain is not DB identity. |
| Separate PostgreSQL instances | UNKNOWN | Need distinct DB service/instance/volume identity and private owner isolation attestation. |
| Separate logical databases/schemas/roles | UNKNOWN | Database name railway can exist on unrelated instances. Same name doesn't prove sharing; different URLs/domains don't prove isolation. |
| Separate credentials/secrets | UNKNOWN | Owner provenance/consumer attestation missing. No secret comparison/fingerprints requested. |
| DATABASE_URL service/shared/literal reference identified | UNKNOWN | Railway reference expression/source metadata not available. No assumption about automatic propagation. |
| Shared-variable inheritance/overrides established | UNKNOWN | Need project/environment/service scope, shared/reference sources, overrides and pending-versus-active configuration metadata. No full variable export. |

If production reuse or shared role/instance is discovered, stop the staging-only operation for separately scoped impact review. This audit does not authorize production investigation or rotation. Obtain owner-provided sanitized production isolation attestation, not production secret access.

## 3. Known source consumers versus live services

| Setting / consumer | Status | Source and operational consequence |
| --- | --- | --- |
| DATABASE_URL: backend Prisma runtime | PASS, source | prisma/schema.prisma + backend/db.ts; all imported db services share this connection. API route count is not number of independent credential services. |
| DATABASE_URL: migration runner | PASS, declared | railway.json pre-deploy npm run db:migrate; package.json prisma migrate deploy. Any distinct runner reference/role UNKNOWN. |
| DATABASE_URL: validation/audit/operational contexts | PASS, source use only | src/lib/env.ts parses/configures checks; docs/BACKUP_AND_RESTORE.md backup/restore examples. These are not evidence of deployed backup services. |
| DATABASE_URL: CI | PASS, source declaration only | .github/workflows/ci.yml supplies synthetic local CI configuration, not evidence CI has or consumes the staging credential. No CI secret values inspected. |
| AUTH_SECRET: Auth.js | PASS, source | backend/auth.ts:163 uses parsed env.AUTH_SECRET; JWT session strategy. Production-mode staging must not rely on development fallback. |
| AUTH_SECRET: middleware | PASS, source | middleware.ts:73–75 passes process.env.AUTH_SECRET to getToken. Same process/release key consistency required. |
| AUTH_SECRET: validation/CI | PASS, source only | src/lib/env.ts min16 optional validation and runtime audits; CI synthetic configuration. No separate live service established by this. |
| Every backend replica/job/tool consuming either credential | UNKNOWN | Actual process inventory/reference scopes inaccessible. All replicas require coordinated refresh; unknown cron, worker, CLI/admin/migrator consumers must be inventoried privately. |
| Flutter consumes server secrets | No such dependency found; PASS for inspected architecture | Mobile config uses nonsecret public origin/environment/host lists; session vault stores scoped auth cookies. Never put DATABASE_URL/AUTH_SECRET in Dart defines. This does not certify installed APK contents. |

Rotating DB credentials may require updating multiple services even if source shows one backend, depending on reference/copy topology. Do not assert only one update or that all references refresh automatically. Underlying DB role password must actually change; variable string edits alone do not revoke access. Existing DB sessions may survive password rotation and require separately approved handling.

## 4. Backup schedules, timestamps and restore readiness

| Check | Status | Evidence / limit |
| --- | --- | --- |
| General PostgreSQL backup guidance exists | PASS, documentation | docs/BACKUP_AND_RESTORE.md recommends managed schedule and logical backup before major releases, restricted off-server storage. |
| Repository backup automation included | Not established; UNKNOWN live | Same document says no automated backup job included in Phase7; no backup/restore/cron deployment script found in inspected scripts/.github file names. Does not prove Railway managed backups absent. |
| Effective staging backup schedule/retention | UNKNOWN | No Railway backup policy/schedule metadata. |
| Latest successful backup/snapshot timestamp/ID | UNKNOWN | No artifact inventory/status/checksum or timestamp supplied. No fabricated backup time. |
| Backup completeness/access/encryption/recoverability | UNKNOWN | No private owner attestation, storage permissions or successful restore evidence. A completed snapshot alone is not restore proof. |
| General restore procedure documented | PASS, documentation | docs/BACKUP_AND_RESTORE.md says restore into a fresh database first, then migration/client/smoke steps. |
| Exact staging-target restore runbook | UNKNOWN / incomplete evidence | Phase0.3 defines safeguards but neither guide identifies a verified isolated restore destination, supported Railway restore action, operator/RPO/RTO or tested artifact. Generic restore example is not a ready staging runbook. |
| Restore successfully tested | UNKNOWN | No dated restore run, destination identity, validation results or measured recovery time supplied. |
| Media recovery documented | PASS, guidance only | BACKUP_AND_RESTORE.md Cloudinary source-of-truth/export/asset-ID guidance; GO_LIVE_READINESS.md manual export note. Actual media backup/export status UNKNOWN. DB restore alone does not restore external assets. |

Do not execute existing pg_restore --clean examples against staging as a rotation check. Existing guide also runs migrate deploy: that changes schema. All backup creation/restore/queries/validation actions require separate scope approval; none performed. docs/SMOKE_TESTS.md includes production login and mutating flows; it is historical broad guidance, not authorization or a safe read-only staging recovery test.

## 5. Deployment/migration/restart effects

| Check | Status | Evidence / effect |
| --- | --- | --- |
| Declared build/generation | PASS, source | railway.json npm run build; package.json next build, postinstall prisma generate. No script executed. |
| Automatic pre-deploy migration | PASS, source risk | railway.json preDeployCommand npm run db:migrate → prisma migrate deploy; ALL pending migrations, not just PIN. |
| Declared start/restart policy | PASS, source | npm start -- --hostname 0.0.0.0; next start; ON_FAILURE/max3. This doesn't prove effective dashboard policy. |
| GitHub checks behavior | PASS, source | .github/workflows/ci.yml PR/push main/master checks/build; no explicit Railway deployment action established. |
| Effective Railway autodeploy/variable apply triggers | UNKNOWN | Current branch/root/watch paths, staged changes, reference propagation, save/apply rollout and override settings unavailable. |
| Which services actually restart after rotation | UNKNOWN | Potentially backend replicas, separate workers/jobs/migrator contexts and database service depending on supported procedure; no assertion all will or must restart. DB service restart is not assumed required. |
| Rotation could run migrations through deployment | PASS, conditional risk | If update triggers configured deploy, pre-deploy can write DB. Need empty reconciled pending set or separate explicit migration approval. |

AUTH_SECRET is read by Auth.js/module env and middleware; runtime processes need coordinated refresh, not merely a dashboard save. Database pool sessions can mask stale credentials; refresh/drain behavior needs owner procedure. Do not restart/redeploy to discover settings.

## 6. Evidence required to prove successful recovery

All current results UNKNOWN; these are future evidence requirements, not instructions to execute now:

1. **Identity:** authorized source backup ID/time and isolated restore-target project/environment/service/instance/database/schema IDs, demonstrably separate from production/live staging. Secret-free provenance chain.
2. **Backup integrity:** completion status, artifact size/integrity validation held by owner, encryption/access controls, retention, compatibility and ability to retrieve/decrypt. No artifact/data contents in reports.
3. **Restore execution:** supported procedure/operator approval, dated start/end/result/log categories and absence of unreviewed destructive operations. Confirm schema, extensions, ownership/grants and external dependencies restored as intended.
4. **Schema/history parity:** sanitized migration names/checksums/attempt state, tables/columns/enums/FK/unique/check/index definitions against intended artifact; partial effects/drift explained. Never replay unreviewed pending migrations as validation.
5. **Data integrity:** owner-approved counts/relationship/constraint checks against backup baseline, no private row dumps. Account/profile/credential/session model consistency and sample-record read checks only with authorized scope.
6. **Application compatibility:** fresh connection using intended uncompromised credentials, known deployed client/artifact, startup and bounded read-only DB-backed endpoint on isolated target. Next.js ready alone may not exercise lazy Prisma connectivity; public catalogue success alone doesn't validate all auth tables.
7. **Security/session correctness:** private owner confirmation that new credentials work/exposed credentials no longer grant access and old pools/sessions handled. AUTH_SECRET rotation invalidates cookies but does not automatically mark AuthSession rows revoked. Separate approval for any revocation/account/device trials.
8. **Recovery objectives:** agreed RPO/RTO, measured loss/recovery interval and owner acceptance, monitoring/rollback path and approved disposal/retention of restored environment. Do not record success without actual evidence.

Credential rotation normally requires forward recovery with uncompromised credentials, not restoring the database. Preserve existing data/schema/PIN pepper; never rollback by reinstating exposed passwords or auth keys. A full DB restore is separate exceptional scope.

## 7. Exact missing founder/Railway evidence

Provide sanitized metadata or private compliance attestations only; no Variables-page screenshots with secret values:

| Evidence package | What owner must obtain read-only | Why required |
| --- | --- | --- |
| E1 topology | Current project/environment/service IDs, names and relationships; staging domain mapping; active deployment ID/SHA/status/time and replica/job inventory | Establish exact target and all consumers; historical IDs insufficient. |
| E2 reference map | For each staging consumer: DATABASE_URL/AUTH_SECRET name, service/shared/literal source category, referenced service/variable NAME, scope/override, pending/active state and last apply time, no resolved value | Identify updates/propagation and avoid orphan consumers. |
| E3 isolation attestation | Owner confirms distinct staging/production instances/databases/roles and secret custody/provenance without production credential disclosure | Prove staging rotation cannot affect production. Do not request production access here. |
| E4 backup evidence | Enabled/disabled policy, frequency/retention, latest successful ID/UTC/status, destination/access owner, encryption and last restore-test record | Establish recoverability, not assumed schedule. |
| E5 supported rotation/recovery | Exact platform/DB-owner-supported role/password operation and effects on connections/dependents, maintenance operator/window, compatible artifact/forward recovery plan | Prevent guessed credential edits that fail to revoke access. |
| E6 deploy/migration behavior | Source branch/root, auto-deploy/variable-save/apply/reference triggers, pre-deploy overrides, complete pending migration/history/schema/client evidence | Prevent unintended restart/deploy/migrations during rotation. |

Already provided supplied logs and public provider results do not replace E1–E6. Latest Phase0.2 public URLs are corrected to staging; mobile-pin still absent at that observation. No new live status claim here.

## Final decision and smallest next action

1. **Credential rotation safe to plan? PASS, conditionally:** continue designing remediation of founder-reported exposed staging AUTH_SECRET/database login. **Execution readiness UNKNOWN/blocked** until identity, isolation, consumers, supported action and recovery evidence are reviewed. Both exposures remain outstanding FAIL remediation checks; no rotation occurred.
2. **Founder evidence still required? YES:** authenticated Railway infrastructure metadata unavailable; repository cannot establish live references, backup schedule or separation.
3. **Smallest next action:** founder opens HomeZone → staging and supplies E1 service/deployment topology plus E2 private reference-map compliance, with values hidden. Obtain backup metadata/E3–E6 next before presenting concrete rotation approval. No setting changes, redeployment or backup creation needed to collect existing metadata.

Only this requested report added. Prior untracked Phase0.2/0.3 reports preserved. No application source, environment, credentials, database records, backups, production, deployment or Git history changed; no requests, migrations, accounts, builds/tests, commits or pushes.
