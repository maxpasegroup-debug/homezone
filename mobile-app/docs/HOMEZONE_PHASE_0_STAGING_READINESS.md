# Phase 0 — staging backend readiness

Date: 2026-10-30. **NOT READY FOR PHASE 0 ACTIVATION APPROVAL**.

## Scope and evidence rules

Audit/preparation only. Read the five requested connectivity, authentication, roadmap, readiness and deployment-identity reports and reconciled them with current Git/source/schema/configuration. No new runtime requests, Railway access, database access, secret inspection, builds or tests performed. PASS applies only to the named check; FAIL means an observed unmet requirement at the stated time; UNKNOWN is lack of evidence, not proof a variable or table is missing.

Evidence sources:

- Current read-only Git status/branch/SHA and file history.
- backend/auth.ts, src/app/api/mobile/auth/register/route.ts, src/lib/auth/redirect.ts, mobile-pin-hash.ts, mobile-pin-admission.ts and mobile-pin-registration.ts.
- prisma/schema.prisma, PIN migration, existing local generated Prisma schema, railway.json and mobile-app/config/staging.local.json.
- HOMEZONE_COMPLETE_BACKEND_CONNECTIVITY_AUDIT.md, HOMEZONE_ROLE_BASED_AUTHENTICATION_AUDIT.md, HOMEZONE_BACKEND_INTEGRATION_IMPLEMENTATION_ROADMAP.md, HOMEZONE_STAGING_READINESS_VERIFICATION.md and HOMEZONE_STAGING_DEPLOYMENT_IDENTITY_REPORT.md.
- Founder-supplied 2026-10-30 08:52 UTC migration/startup logs and previously recorded public staging observations. These were not reproduced during this audit.

## PASS / FAIL / UNKNOWN checklist

| Check | Status | Evidence and limitation |
| --- | --- | --- |
| Local branch and baseline identified | PASS | main; 18ebcb401e95e178c1bc3f9f16faea735a044063 from current Git commands. Older reports' e19c1d1/bef2561 are historical baselines. |
| PIN provider introduction identified | PASS | git log -G AUTH_MOBILE_PIN_ENABLED on backend/auth.ts: 9d730f266d9e568737d360e28fce9fef766f1f89. |
| Commit containing provider AND registration identified | PASS | Registration path history and prior committed-file inspection identify 9f45e985c06168fe3f398ad6174e7607ab718fef; current source contains both. Local ancestry/source does not establish deployment. |
| Local POST route/provider present | PASS | Registration route exports POST to mobilePinRegistration; backend/auth.ts:92 conditionally adds Credentials id mobile-pin. |
| Staging mobile origin configured | PASS, source only | staging.local.json: API enabled, staging, https://homezone-staging.up.railway.app. Must be passed explicitly into build/launch; no automatic JSON loading/runtime claim. |
| Historical intended Railway identity documented | PASS, documentation only | Project HOMEZONE/homezone 1f8c9007-2993-426c-bbd0-b8dd0a0b17da; environment staging 2181eadf-21a0-4ca3-8269-b6b6f28af9f4; backend HomeZone ea6ca516-4063-4ed1-be95-bebcc0d1af00. Historical screenshot/context via identity report. |
| Current domain-to-service mapping | UNKNOWN | No authenticated Railway Networking/Settings evidence confirms the historical IDs currently serve the staging hostname. |
| Active deployment SHA/ID/status/time | UNKNOWN | Public responses and startup logs do not provide complete artifact/service identity. No authenticated Railway deployment record accessible; CLI unavailable on PATH. |
| Latest observed public Auth.js responds | PASS, historical | 2026-10-30 09:01:40.173 UTC staging GET providers returned HTTP200. Connectivity/authentication audit records observation. |
| Latest observed provider list includes mobile-pin | FAIL, historical | Same observation listed password only. No new request; present state not independently checked here. |
| Latest observed callback origin is staging | FAIL, historical | Same staging response used https://speeko.online callback origin. Production callback on a staging response fails expected separation, but exact effective variable causing it is unknown. |
| Latest recorded registration GET method behavior | PASS, limited | 08:47:08.154 UTC GET /api/mobile/auth/register returned405; request ID R3PN4CZ3TCK-igue5nX1uw. Consistent with POST-only route, not proof of deployed source or successful enrollment. |
| Effective authentication/PIN variables compliant | UNKNOWN | Source requirements established; no private Railway variable metadata inspected. |
| PIN migration exists locally | PASS | 20261030120000_mobile_pin_foundation is one of21 local migration directories. |
| Supplied runner reported no pending migrations | PASS for supplied log statement | 08:52 UTC logs: Postgres-9ZqA host, database railway/schema public,21 files,no pending; Next.js15.5.19 ready. Not an independent environment identity or full schema certification. |
| Exact PIN migration applied in intended staging DB | UNKNOWN | Logs do not enumerate that filename/checksum/all attempts or prove artifact/target mapping. No history/catalog evidence supplied. Do not rerun migration merely to find out. |
| Local schema/DDL align | PASS, inspection only | MobilePinCredential + MobilePinLoginBudget fields/relations/indexes/checks; no execution validation. |
| Local generated schema contains required models | PASS, limited | node_modules/.prisma/client/schema.prisma includes MobilePinCredential,MobilePinLoginBudget,AuthSession; no generation/typecheck performed. |
| Deployed Prisma client/schema compatible | UNKNOWN | No deployed generated-client/build provenance or actual catalog evidence. |
| Runtime/migrator DB identity and isolation | UNKNOWN | Intended Postgres-9ZqA documented, service ID/reference reconciliation unavailable. Different public hosts do not prove separate DBs/secrets. |
| Recoverability, drift and capacity acceptable | UNKNOWN | No current backup/restore, constraint/drift/partial-effect, permissions/lock/capacity evidence. |
| Registration/login/profile/role/restoration/logout work | UNKNOWN | Implemented in source; no controlled account or device trial in this audit. Historical catalogue success is not authentication evidence. |

The older 08:47 provider observation and identity report remain useful but are superseded as the latest available observation by 09:01. Request timestamps are not deployment times. The supplied 08:52 no-pending logs strengthen runner evidence but do not justify declaring exact schema parity or production readiness.

## Required configuration and private compliance

All effective states below are **UNKNOWN**. Owner must privately check scope, presence/format, secret provenance/replica consistency and reference destinations, then report compliance only. Never supply variable dumps, hashes, full connection strings or secret values.

| Variable name | Required state / purpose |
| --- | --- |
| DATABASE_URL | Correct independently confirmed staging database/schema, same intended target for runtime/migration runner, no production reference. |
| AUTH_SECRET | Stable high-entropy staging session secret; consistent across staging replicas, separate from production; secure backup. |
| NODE_ENV | production for deployed Next.js staging; not literal staging. |
| AUTH_URL | Explicit https://homezone-staging.up.railway.app if used; primary canonical selector. |
| NEXTAUTH_URL | Alternative selector; at least one of AUTH_URL/NEXTAUTH_URL required; both if set must agree, optional trailing slash only. |
| AUTH_STAGING_ORIGIN | Exact same separate public HTTPS staging origin; no credentials/path/query/fragment; not either approved production hostname. This approves staging, not an alternative production workaround. |
| NEXT_PUBLIC_SITE_URL | If used/configured for site links, same staging origin. It does not select canonical auth origin. |
| AUTH_MOBILE_PIN_ENABLED | Literal true at initialization includes provider, and also enables enrollment. Keep disabled until schema, secrets, target and activation approval ready. |
| MOBILE_PIN_PEPPER_V1 | Independently provisioned high-entropy secret,32–256 characters,no outer whitespace; consistent across staging replicas, separate from production/other keys. Custodian privately backs up version1 material. No secrets generated here. |
| MOBILE_PIN_RATE_LIMIT_KEY | Separate high-entropy secret,32–256 characters,no outer whitespace; same across staging replicas, independent of pepper/production. Rotating it changes identifier buckets. |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | Optional positive integer; default5,max20. |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | Optional positive integer; default900000,max86400000. |
| MOBILE_PIN_GLOBAL_ATTEMPTS | Optional positive integer; default300,max10000. |
| MOBILE_PIN_GLOBAL_WINDOW_MS | Optional positive integer; default300000,max3600000. |
| MOBILE_PIN_MAX_ACCOUNTS | Optional positive integer; default10000,max100000. |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | Optional positive integer; default5000,max10000. |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | Optional positive integer; default100,max1000. |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | Optional positive integer; default3,max10. |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | Optional positive integer; default10,max100. |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional x-real-ip/x-forwarded-for only with verified ingress overwrite of one valid IP. Without selection all clients share conservative ingress bucket; configured malformed/missing header fails closed. |

Versioning: hash envelope scrypt:v1:n32768:r8:p1 and MOBILE_PIN_PEPPER_V1 encode the current version. No additional pepper-version variable or rotation/recovery workflow exists. Never replace v1 in place after enrollment. Review existing DEMO_LOGIN_ENABLED, DEMO_MOBILE_LOGIN_ENABLED and AUTH_MOBILE_OTP_ENABLED gates without altering website/admin policy. Optional LOG_LEVEL/SENTRY_DSN do not enable PIN. Mobile PIN needs no email/SMS/OTP credentials; preserve independent website requirements.

## Why mobile-pin was absent

Confirmed source condition: backend/auth.ts includes provider only when AUTH_MOBILE_PIN_ENABLED === "true" at module initialization. Therefore, if the exact reviewed bundle is confirmed serving that response, absence supports inactive initialization/configuration. Without deployed SHA/domain/process evidence, older/different code, wrong service or mixed/stale replicas remain possible. The exact live cause is **UNKNOWN**.

Pepper/key/table failures affect login/enrollment execution; they do not selectively hide this provider in the reviewed registration condition. Production callback URLs support a canonical-origin/environment mismatch hypothesis, not proof of a specific AUTH_URL/NEXTAUTH_URL value. No flag or URL setting should be changed based solely on guessing.

## Schema/client readiness

PIN DDL creates credential primary key, unique userId/normalizedMobile, canonical Indian-number/hash checks and User foreign key with cascade update/delete; budget primary key, nonnegative count/default and resetAt index. Prisma supplies generated IDs/updatedAt. DDL has no backfill/account linking. Existing User/Profile, public role enum, nullable email/emailVerified, User.sessionVersion and AuthSession must be compatible. SQL checks are not proven by generated Prisma types.

Needed owner evidence: full _prisma_migrations history including checksums/all attempts/errors against exact intended commit; actual table/column/FK/unique/check/index definitions; partial effects/drift and schema/search-path review; deployed generated-client/build provenance; backup/restore, permission and capacity evidence. Existing no-pending logs alone do not close these checks. Do not assume migration is pending, failed or applied without that reconciliation.

## Exact blockers

1. Current staging service/domain and deployed artifact identity unconfirmed.
2. Last observed provider absent and callbacks incorrectly use production origin for the staging target.
3. Effective canonical/activation/PIN-secret compliance unverified.
4. Exact PIN history/catalog and deployed client compatibility unverified despite positive supplied runner logs.
5. Recovery/operational safeguards and scoped activation/account-trial approvals outstanding.

## Ordered actions and separate approvals

| Order | Action | Approval boundary |
| --- | --- | --- |
| 1 | Founder opens HOMEZONE→staging→active backend deployment; supplies sanitized project/environment/backend IDs, domain mapping, SHA/deployment ID/status/time, branch/root/replicas/effective commands. | Read-only evidence, no settings save/redeploy. Smallest next founder action. |
| 2 | Privately attest required configuration compliance and runtime/migrator database references; supply existing sanitized history/schema/client/backup evidence tied to target and commit. | No secret values. New database evidence collection needs separately authorized access; none performed here. |
| 3 | Identify exact flag/origin/artifact correction and full pending migration set, if any. Reconcile effective command overrides. | Planning/review only; no speculative source changes. |
| 4 | Present named staging-only variable changes and provision missing secrets privately only if required. Keep PIN off until prerequisites. | Founder configuration approval required, including any automatic deployment/restart triggered by save. No values in approval text. |
| 5 | If migration genuinely pending, present verified target, exact reconciled pending set, runner/artifact and recovery plan. Existing command npm run db:migrate applies ALL pending migrations. | Separate founder migration/write approval. Do not run in shell with unknown DATABASE_URL; no reset/db-push/resolve. Skip execution if already applied correctly. |
| 6 | Deploy approved exact artifact with fresh client/build provenance, then approved activation at process initialization. | Separate founder deployment/restart approval; include automatic pre-deploy migration scope or confirm empty pending set. No push main assumed authorized. |
| 7 | Read-only providers/route confirmation with UTC/request/deployment correlation; expect mobile-pin and staging callback host, registration GET405. | Later approved verification; no dummy POST because quota writes precede input validation. |
| 8 | One controlled Flutter registration→separate PIN login→session/profile/role→dashboard→true restart restoration→logout/revocation. | Explicit account/quota/session-write and device approval. Private unused +91 identity/USER role/PIN entry; no OTP. Expand roles/negative tests only with scope approval. |

railway.json declares npm run build, pre-deploy npm run db:migrate, start npm start -- --hostname 0.0.0.0. Deployment itself may write the DB. No approval is implied by this audit. Preserve compact role→sign-in/create-account UI, five public role validation, website/admin auth and separate preview. Existing USER→OWNER listing behavior/provider business verification need later policy review, not Phase0 changes.

## Safe rollback preparation

Before activation record compatible prior staging artifact/deployment ID, nonsecret configuration manifest, private secret backups/custodian and recovery owner. On failure stop enrollment/trials and obtain approval to disable provider/enrollment or restore that exact compatible staging artifact. Account for pre-deploy migrations during rollback too. Retain additive schema, accounts, credential hashes, pepperv1 and revocation records; no dropping tables, resetting/resolving history, replacing secrets or demo fallback. Disabling provider does not revoke existing sessions; any revocation/cleanup requires separate write approval. Never touch production.

## Completion

Created only this document. Five pre-existing untracked audit documents preserved. No application source, Git history, secrets, settings, schema/data or environment changed. No requests, accounts, migrations, database access/writes, deployments/restarts, builds/tests, commits or pushes performed.

**Recommendation: NOT READY FOR PHASE 0 ACTIVATION APPROVAL.**
