# HOMEZONE staging PostgreSQL readiness — milestone 3

Reviewed 2026-10-30. **Database readiness NOT VERIFIED; migration execution HOLD.**
This is source/existing-evidence inspection, not a database connection or query.

## Identity and state

| Item | Finding |
|---|---|
| Intended database service | Postgres-9ZqA, per latest owner/screenshot context |
| Current exact service ID | UNKNOWN; not recorded in inspected repository evidence |
| Project/environment mapping | Historical HOMEZONE staging screenshot identifiers appear in companion deployment report; current DB membership/attachment not independently confirmed |
| Effective database name/schema/server | UNKNOWN. Do not reuse the old Postgres-WU4G log's database name, hostname or public schema as evidence for the replacement service |
| Backend references this database | UNVERIFIED; no effective Railway variable references/overrides available |
| Intended source connection | prisma/schema.prisma:27 uses PostgreSQL/DATABASE_URL; backend/db.ts creates shared PrismaClient; src/lib/db.ts re-exports it |
| Separate migration connection | No directUrl/shadow/fallback configured in inspected schema/client; actual runner environment can still differ from runtime |
| PIN migration state | **UNKNOWN — cannot classify pending, applied or failed** without migration history and actual objects |
| Health/schema completeness | UNVERIFIED. Historical 20-migration report and catalogue HTTP 200 do not establish PIN/AuthSession schema or overall health |
| Approved configured DB read access | Not established. Existing infrastructure gate proposes owner-confirmed restricted access; it is not a provisioned, identity-confirmed connection |

No Railway CLI/local project linkage/connected dashboard or database-owner evidence
was available. No credential files or secret environments were read. No database
client, Prisma command, SQL, introspection or migration was executed.

## Expected source compatibility

Current inspected commit: 9f45e985c06168fe3f398ad6174e7607ab718fef on main;
working tree clean at start. There are 21 local migration directories; historical
reports of 20 successful migrations predate the PIN foundation and are not a
current pending-set calculation.

The PIN migration is 20261030120000_mobile_pin_foundation, ordered after
20261026143000_account_collection_indexes. It starts with comment bytes 2D 2D 20,
not a leading UTF-8 BOM. It is additive source DDL, without account enrollment,
phone matching/backfill or existing-account updates. Additive does not mean
lock-free, transactionally all-or-nothing, already applied or safe to rerun.

| Object | Required definition / purpose |
|---|---|
| MobilePinCredential | Required text id/userId/normalizedMobile/pinHash; createdAt timestamp default; Prisma-managed updatedAt; primary key id |
| MobilePinCredential_userId_key | Unique user binding; no multiple PIN credentials for one User |
| MobilePinCredential_normalizedMobile_key | Unique canonical login identity, independent of mutable Profile.phone |
| MobilePinCredential_userId_fkey | User(id), ON DELETE/UPDATE CASCADE |
| MobilePinCredential_mobile_check | Initial canonical +91 plus valid ten-digit Indian syntax |
| MobilePinCredential_hash_check | Fixed scrypt:v1:n32768:r8:p1 envelope, salt and derived-key shape; no plaintext PIN column |
| MobilePinLoginBudget | Required key/count/resetAt; primary key key; count default 0 |
| MobilePinLoginBudget_count_check | Nonnegative count |
| MobilePinLoginBudget_resetAt_idx | Reset-time index for bounded expiration work |

Prisma User.mobilePinCredential inverse and credential relations match the SQL by
text inspection. SQL CHECK constraints are not modeled by Prisma and must be
preserved explicitly. Application IDs/updatedAt values are generated through
Prisma conventions; do not infer missing DB defaults are schema corruption.

Direct DDL dependency: existing User(id). Runtime dependencies additionally include
User.sessionVersion and AuthSession (20261010_auth_session_revocation), compatible
Profile.userId/phone/role/verificationStatus, User nullable email/emailVerified,
and the existing role/verification enums. Initial schema and
20260618_phase_2c_verification_trust provide relevant prerequisites. Enrollment
uses a parameterized contact-collision lookup on Profile.phone; that does not
grant or link ownership. Default/selected public roles already exist in UserRole;
no extra role migration is required by the new role-first contract.

Registration and login share MobilePinLoginBudget storage but separate key
namespaces. Registration locks a global registration row; login commits aggregate
admission then locks the number failure row during KDF. Real connection capacity,
lock/timeout behavior, cleanup and cross-replica concurrency remain unverified.

Source schema compatibility: **consistent by inspection**. Actual staging schema
compatibility: **unverified**, not a claim that tables are missing or unhealthy.

## Why live endpoint evidence cannot classify migrations

The refreshed GET registration path returns 405, consistent with a POST-only
route, but that executes no enrollment/schema-readiness check. Provider listing
returns 200 without mobile-pin; the reviewed source gates provider registration
on a feature flag, not a table query. Neither proves that the PIN migration is
pending/applied/failed. Do not enable the provider to discover whether tables exist.

## Owner evidence required before approval

1. **Independent identity:** nonsecret Railway project/environment/backend and
   database service IDs, database name/schema and restricted role identity;
   privately prove runtime and migration-runner effective connection references
   resolve to that same isolated staging target. A familiar hostname is insufficient.
   Include relevant inheritance/overrides/schema/search-path and network isolation
   evidence, without URLs/passwords. Production must remain a different target.
2. **All migration attempts:** authorized owner retrieves complete _prisma_migrations
   names, checksums, started_at, finished_at, rolled_back_at, applied_steps_count
   and original logs. Keep original logs privately; sanitize secrets/PII in reports.
   Compare against the exact intended commit's ordered inventory, not a count alone.
3. **Actual definitions:** verify tables, columns/types/nullability/defaults, primary
   keys, unique indexes/validity, FK targets/actions, checks and enums described
   above, plus prerequisite objects and any partial effects/schema drift. Use an
   approved staging-only read console/connection only after target identity/access
   are confirmed. This report executes and provisions no such connection.
4. **Classification:** successful history plus expected checksum/schema supports
   applied; absent completed history AND absent intended objects can support pending
   only after full history reconciliation; unfinished/unrolled-back failed history
   requires original error/partial-effect analysis. Tables alone or step count alone
   do not justify applied, rolled back or safe replay. Never edit history or run
   migrate resolve/reset/repair merely to unblock deployment.
5. **Exact pending set:** reconcile all 21 migrations, including the historical
   private-files issue. Its old failure on an earlier database does not establish
   this replacement database's state. railway.json predeploy runs migrate deploy
   for every pending migration, not a single selected file.
6. **Recoverability:** record staging backup/snapshot ID/time/scope, encryption and
   custody, retention, integrity and usable restore evidence/RPO/RTO/owner. Include
   schema, migration history, data and required grants. No backup/restore was run.
7. **Operational approval:** review privileges, connection/KDF memory budget,
   statement/lock/transaction timeouts, storage and the risks of all pending DDL.
   New table/index/FK creation can acquire locks; preceding migrations can have
   existing-data conversion/uniqueness/capacity risks. Do not treat this as a
   PIN-only deployment until the pending set is proved.

## Actions requiring founder approval

- Exact migration execution after confirmed target, pending set and recovery plan.
- Any Railway configuration/secret/provider activation changes and service restart.
- Exact backend artifact deployment; public hostname is not sufficient target ID.
- Controlled test-account, quota/failure-budget and AuthSession/revocation writes.
- Any repair/restore or data changes if reconciliation discovers a failure.

Rollback is not deletion of the new tables/history. Preserve accounts, hashes,
pepper and existing associations; approve a compatible artifact/disablement or
owner-reviewed repair/recovery. No recovery, account-linking or Forgot PIN workflow
is implicitly authorized. Keep all production resources untouched.

Result: **not ready to authorize database-changing deployment from present evidence**.
Obtain sanitized owner identity/history/schema/configuration/recovery evidence first.
Only the two requested reports were created; application source and Git state were
not modified, and no tests/builds/database/live-write operations were performed.
