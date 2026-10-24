# HOMEZONE — Infrastructure readiness gate

Decision: **READY AFTER SPECIFIC PREREQUISITES; LIVE ACTIONS ON HOLD**.
Staging: **NOT VERIFIED**. Production: **NOT VERIFIED**.
Prepared from local source on 2026-10-24; this document grants no deployment,
migration, email, account-action or security-test authorization.

Owner action sheet: [INFRASTRUCTURE_OWNER_SIGNOFF.md](INFRASTRUCTURE_OWNER_SIGNOFF.md)
records required evidence, approvers, verification procedures, stop conditions and
unapproved statuses. It grants no additional authority.

Subsequent local changes and current validation:
[LOCAL_BLOCKERS_VALIDATION.md](LOCAL_BLOCKERS_VALIDATION.md). This supersedes the
earlier origin-fallback and missing recipient-guard findings; infrastructure
configuration, isolation and live integration remain unverified.

Current formal owner action register and authorization checklist:
[OWNER_EVIDENCE_REVIEW.md](OWNER_EVIDENCE_REVIEW.md). All gates remain unapproved;
G7 requires implementation plus authorized multi-instance verification to close.

Latest local G7 implementation: [G7_DISTRIBUTED_SIGNIN.md](G7_DISTRIBUTED_SIGNIN.md).
Password runtime admission now shares PostgreSQL account/aggregate counters.
Historical process-local descriptions below are superseded for this provider only;
ingress/client controls and real multi-instance verification remain unapproved.

## Evidence and blockers

Local baseline: main, commit 9cba8d77afabedd5fbf32af638a3ee45615487e5;
36 modified and 36 untracked files, nothing staged. Required registration reports
and the original qa-registration/validation-ledger.md were read. The later
REGISTRATION_SECURITY_FIXES.md supersedes the earlier R1–R5 findings and old
resend matrix. All remote settings and named owners below remain unconfirmed.

| Severity / gate | Local evidence | Required disposition |
|---|---|---|
| BLOCKER: isolated target and written authority absent | No remote inspection performed. A service/database name is not isolation evidence. | Owner attests dedicated app/database, staging-only roles/network boundaries, permitted endpoints, dates, attempts/emails, devices and stop authority before ANY remote action. |
| HIGH: automatic migration and unknown history | railway.json; package.json; prisma/migrations | Deployment automatically migrates before start. Approve target, exact pending set, duplicate/data review, lock budget and rehearsed restore BEFORE deployment. |
| HIGH: canonical origin configuration unverified | src/lib/auth/redirect.ts: authOrigin; src/lib/env.ts | Missing production/staging selectors now fail closed; conflicting selectors/noncanonical URLs and staging-to-production selection are rejected. Owner must still attest actual manifest, build scopes and database target. |
| HIGH: distributed verification / proxy trust missing | password-signin-limit.ts; api/rate-limit.ts; backend/auth.ts | Shared PostgreSQL password account/aggregate admission exists locally; client controls, key/policy/target approval and actual distributed behavior are unverified. First tests remain one Node process; restrict ingress/direct origin. |
| HIGH: email configuration unverified | email/resend.ts: registration/reset adapters | Staging Resend dispatch now requires STAGING_EMAIL_RECIPIENTS exact allowlist. Owner must approve configured recipients, staging marker, sender/provider restrictions and disabled alternative channels. No real delivery verified. |
| MEDIUM: incomplete redaction/monitoring assurance | logging/logger.ts: captureException; backend/db.ts | Original exception text/stack and development SQL logging exist. Review application, database, ingress, provider and crash-report pipelines; prove safe redaction before fault tests. SENTRY_DSN does not prove export or alerts. |
| MEDIUM: retention/deletion policy absent | EmailRegistration cleanup; Prisma business relationships | Approve scheduled idle cleanup, backup/mail retention and disposable-account disposal; public release additionally needs supported deletion/anonymization and privacy/support policy. |
| INFORMATIONAL: client persistence deliberately absent | mobile registration/session protocol; session-registry.ts | Restart requires sign-in; resume revalidation and local expiry are required. Local clearing is not server revocation. No persistent session restoration claim. |

## Deployment and ordered migration inventory

railway.json selects npm run build (next build), preDeployCommand npm run
db:migrate (prisma migrate deploy), then npm start -- --hostname 0.0.0.0
(next start). package.json postinstall generates the Prisma client. Build/install
are not isolation checks. Do not run db:push, migrate dev, reset, seed or admin
creation as substitutes for the reviewed deploy migration process.

All 18 directories below exist locally in lexicographic order. **Which are pending
on staging is UNKNOWN** until its authorized migration history is compared. Do
not run only the last SQL file or assume the older migrations have been applied.

| Order / directory under prisma/migrations | Main change / compatibility concern |
|---|---|
| 1. 20260617_initial_schema | Creates User/Profile/Auth.js tables, property/business baseline, exact email uniqueness and foreign keys. Existing schema must have a reviewed baseline, not a blind replay. |
| 2. 20260618_phase_1_production_hardening | Replaces UserRole enum (BUYER to USER), converts Property intent, creates legacy phone OtpChallenge and indexes; conversion/locking and fallback BUY mapping need review. |
| 3. 20260618_phase_2a_marketplace_foundation | Property category/currency backfills and indexes; unknown currency is rewritten to INR. Review affected counts. |
| 4. 20260618_phase_2c_verification_trust | Property/Profile verification enums and fields; backfills verified listings. |
| 5. 20260618_phase_3_monetization | Payment/subscription types/tables, property promotion fields and constraints. |
| 6. 20260619_phase_4_reels_leads | Reel/social tables and lead source conversion/drop/rename; review source mapping before data conversion. |
| 7. 20260703_milestone_1_buyer_discovery | PropertyView, PropertyShortlist, ShortlistProperty and uniqueness/foreign keys. |
| 8. 20260703_milestone_2_owner_journey | Verification enum additions, property media/document fields/table. |
| 9. 20260703_milestone_3_lead_management | Lead-stage additions, notes/tasks/site visits/timeline/notifications. |
| 10. 20260703_milestone_5_homezone_studio | Studio enum/status conversion, new order/delivery/assignment tables; unknown old statuses map to DRAFT. |
| 11. 20260703_milestone_6_broker_pro_crm | Broker team, assignment, commissions, automation and document tables. |
| 12. 20260703_milestone_7_builder_enterprise | Builder project backfill, tower/unit/team/booking/campaign tables and unique identifiers. |
| 13. 20260703_milestone_8_services_marketplace | Service provider/request changes, quotes/bookings/reviews and payment enum additions. |
| 14. 20260703_platform_consolidation | Notifications/reports/webhooks and many direct status-to-enum casts. Any legacy value outside the target enum can fail migration. |
| 15. 20260704_ai_operating_system | AI types/tables depend on consolidated NotificationModule and Profile; no AI provider credential is needed to create tables. |
| 16. 20260704_password_auth_v1 | PasswordCredential/PasswordResetToken tables, unique constraints and User foreign keys. |
| 17. 20261010_auth_session_revocation | User.sessionVersion and AuthSession registry; required by current JWT validation/revocation. |
| 18. 20261024000000_email_registration | Unique lower(User.email) index, EmailRegistration and RegistrationBudget tables/indexes. Required by registration and shared OTP quotas. |

PostgreSQL is declared in migration_lock.toml and schema.prisma. Confirm supported
server version, collation/locale, schema/search_path, extensions if used by the
actual target, permissions, space, connection/lock/statement budgets, Prisma version
and generated-client/schema compatibility. IF NOT EXISTS/duplicate_object handling
does not prove an existing table or enum has the correct definition. Schema
validation alone cannot establish migration replay or drift safety.

Email index: regular CREATE UNIQUE INDEX on lower(email), excluding nulls. It
does not trim whitespace, merge users or normalize stored email. New registration
trims/lowercases; password sign-in normalizes input then uses exact email lookup,
whereas activation checks existing email case-insensitively. Legacy mixed-case or
space-padded accounts therefore require an account-preserving decision. Inspect
count-only duplicate groups under both lower(email) and lower(btrim(email)),
normalization candidates, blank values and reference dependencies. Do not export
addresses or automatically merge/delete/overwrite users, roles or credentials.

The new functional index is not represented in Prisma's schema language. Preserve
its migration and verify its actual definition/validity after approved deployment.
It can fail on duplicates and blocks writes during regular index creation. Other
type changes/backfills can take stronger locks or rewrite tables. Have a DB owner
approve maintenance, timeout and abort criteria. No SQL-wide transaction wrapper
is declared for the registration migration: do not assume partial failure rolls
back every statement. Inspect actual applied statements/history on failure; never
edit checksums or mark a failed migration resolved without a reviewed repair.

## Staging-only target, backup and recovery plan — NOT EXECUTED

1. Owner records non-secret platform project/environment/service/database/schema
   identifiers and restricted runtime/migrator role identifiers. Both roles can
   access only the dedicated staging target; no production network/credential
   access or production dataset copy. Migration DDL role and runtime permissions
   may differ; prove identical intended database/schema, not identical secrets.
2. Both prisma/schema.prisma datasource and backend/db.ts PrismaClient use
   DATABASE_URL; src/lib/db.ts re-exports that client. No directUrl/shadow URL or
   code database fallback is configured. Wrong inherited DATABASE_URL or packaged
   env-file resolution still selects the wrong database. Owner privately compares
   effective migrator/runtime target identities, variable references and Prisma
   schema path in their actual execution contexts. Do not print URLs or secret
   fingerprints. Runtime startup checks occur too late to protect preDeploy.
3. Only after explicit DB-read authorization, compare current_database/schema,
   server/service identity, restricted roles, _prisma_migrations checksums/status,
   actual schema and ALL local migration files. Reconcile drift/failed history and
   count-only data preflights. This audit ran none of those database queries.
4. Pause staging writes and delivery jobs. A named DB owner creates an encrypted,
   staging-only backup/snapshot including migration history, schema, data and
   required role/grant reconstruction. Record backup ID, timestamp, checksum or
   provider integrity evidence, encryption/access/retention, RPO/RTO and restore
   tool/version compatibility. Credentials stay in approved custody, not logs.
5. Restore to a SECOND disposable isolated staging database first. Validate
   schema/index definitions, row counts, constraints, migration history and an
   owner-approved fixture transaction. Rehearse exact pending migrations there,
   record lock/duration/failure observations and recovery success. No recovery
   guarantee exists until this rehearsal succeeds.
6. Approve application artifact, complete migration set and stop window before
   authorizing deployment. Verify post-migration checks/history and runtime target
   agreement before email/auth traffic. A label or successful build is insufficient.
7. If locks exceed budget, migration fails, wrong target appears or data integrity
   changes unexpectedly: stop admission/deployment/mail, preserve redacted evidence,
   notify incident/DB owners, inspect partial state, and choose reviewed forward
   repair or restoration. Restore only the isolated staging database; verify it
   before compatible app restart. No blind table drops, account deletes, migration
   history edits or rollback to unverified-account signup. Restore cannot unsend
   email or undo external actions; reconcile fixture accounts and revoke test
   sessions through approved procedures after recovery.

## Environment checklist — names only, values NOT INSPECTED

All remote entries require **INFRASTRUCTURE OWNER CONFIRMATION**. Source contracts
are locally inspected, not remote validation. Review platform variables, references,
build/runtime/preDeploy scopes and packaged env-file precedence privately. Do not
run env dumps or ops:env on unknown real configuration: the generic env parser's
error message can include validation input. No secret-bearing configuration was
read in this phase.

| Variable(s) | Purpose, precedence and validation gate |
|---|---|
| DATABASE_URL | Single Prisma datasource selector; schema resolves environment, runtime client has no override. Generic env parser permits absence and accepts a URL without proving PostgreSQL/isolation. Verify target, SSL policy, schema, role permissions, pooling/migration compatibility in both contexts. |
| AUTH_SECRET | Auth.js explicit secret from parsed env; generic minimum 16 characters. Nonproduction has a known development fallback; production passes undefined when absent. Provision staging-specific high entropy (at least 32 random bytes), consistent across workers, no production reuse. Review rotation/revocation; no reliance on implicit defaults. |
| OTP_PEPPER | Registration HMAC key: handler requires >=32 characters although generic parser minimum is 16. No registration fallback. Provision independent high entropy through secret manager, same key on staging workers; rotate with pending-code invalidation and per-email quota-key change explicitly accounted for. Length alone does not prove entropy. |
| AUTH_STAGING_ORIGIN | Read directly by redirect.ts, outside generic env schema. Must be a separate canonical public HTTPS origin, no credentials/path/query/fragment, IP/local/reserved host or built-in production origin. Approval entry alone does not select it as AUTH_URL. |
| AUTH_URL | authOrigin uses AUTH_URL ?? NEXTAUTH_URL; production or approved staging requires an explicit nonempty selector. Canonical origin strings only, with optional trailing slash; conflicting selectors in production/staging are rejected. Outside generic env schema; owner still supplies approved value. |
| NEXTAUTH_URL | Generic URL validated, optional; second canonical selector. Set same approved staging origin as AUTH_URL/AUTH_STAGING_ORIGIN. Missing both in production or approved staging now throws a fixed safe error; no production fallback. |
| NEXT_PUBLIC_SITE_URL | Optional generic URL; local consumer search found its declaration but no active app consumer. Keep staging-specific if supplied; it does not override authOrigin or establish isolation. Public build variables are non-secret and may be compiled into artifacts. |
| RESEND_API_KEY | Required registration provider credential. Adapter always calls Resend HTTPS endpoint; SMTP variables do not redirect this path. Use restricted staging credential/approved recipient enforcement and separate sender custody; never claim provider sandboxing just from key presence. |
| STAGING_EMAIL_RECIPIENTS | New server-only comma-separated exact mailbox allowlist, required by registration/reset Resend dispatch whenever AUTH_STAGING_ORIGIN is present. One to 20 valid addresses, <=5100 characters; normalized case/outer whitespace, no wildcard/domain rules. Missing/malformed list denies sends. If provided without staging marker it still restricts these adapters. Owner supplies approved controlled recipients privately; disable alternative mail channels. |
| RESEND_FROM_EMAIL / EMAIL_FROM | Adapter prefers RESEND_FROM_EMAIL ?? EMAIL_FROM; parser trims and expects bare email syntax. One verified approved sender required; blank optional strings normalize absent. EMAIL_FROM also configures optional SMTP magic links. Reset adapter has a final hardcoded sender fallback; registration does not. Verify both flows explicitly, do not rely on reset fallback. |
| NODE_ENV / PORT | NODE_ENV accepted values development/test/production; staging should use production behavior, not literal staging. PORT is platform/Next listening configuration, not a database/origin choice. Verify actual start routing privately. |
| LOG_LEVEL / SENTRY_DSN | Level defaults info; choose reviewed non-debug logging, but this is not redaction. Optional DSN/presence does not prove installed exporter, delivery or alerts. Never send raw exception context or credentials to monitoring. |
| HOMEZONE_ENFORCE_ENV | Broad audit switch, not automatic startup enforcement: no call site for assertProductionEnv found. Audit omits OTP_PEPPER/sender/staging approval and requests unrelated AI/payments/media credentials. Do not fabricate credentials to make its ready label green. |
| AUTH_GOOGLE_ENABLED / AUTH_MAGIC_LINK_ENABLED / AUTH_MOBILE_OTP_ENABLED | Explicit false for email/password-only scope. Google/SMTP enablement requires flags plus credentials; phone provider is separate from email registration. Keep unused provider credentials absent. |
| DEMO_LOGIN_ENABLED / DEMO_MOBILE_LOGIN_ENABLED / OTP_DEV_LOG_CODES | Explicit false. Production suppresses ordinary demo login; mobile-demo flag alone is not the provider admission gate (AUTH_MOBILE_OTP_ENABLED matters). Legacy phone utility has development fixtures/pepper fallback and optional development-code exposure; none is acceptable evidence of real email verification. |
| PASSWORD_SIGNIN_HMAC_KEY | New required 32-256 character high-entropy server secret, identical across workers, distinct from other auth/OTP secrets. Direct runtime setting outside generic env audit. Missing/invalid => deny without memory fallback; owner approves custody and controlled rotation. |
| PASSWORD_SIGNIN_WINDOW_MS | Positive decimal integer, default 300000, maximum 3600000. Shared PostgreSQL fixed-window policy; invalid configuration denies admission. |
| PASSWORD_SIGNIN_ACCOUNT_ATTEMPTS | Positive integer, default 10, maximum 10000. Account targeting can deny legitimate sign-in. |
| PASSWORD_SIGNIN_TOTAL_ATTEMPTS | Positive integer, default 1000, maximum 100000; shared aggregate across participating workers. |
| PASSWORD_SIGNIN_MAX_ACCOUNTS | Positive integer, default 10000, maximum 100000; shared live account capacity, live buckets not evicted, full capacity denies. |
| OTP/shared rate settings | Not environment knobs: registration source fixes 5000 requests/hour, 1000 valid verification requests/hour, 100 deliveries/hour, 3/email/hour, 60s cooldown, 5 guesses/challenge, 10min expiry, 4096-byte JSON. General rate adapter defaults to memory; no shared-store env switch is wired. Owner approves capacities; do not invent one. |
| HOMEZONE_ENABLE_API | Flutter compile-time bool, default false => offline. Only explicitly authorized service build sets true. Server env does not change an already-built APK. |
| HOMEZONE_API_ENV / HOMEZONE_API_BASE_URL | Flutter compile-time environment development/staging/production plus explicit approved origin. Staging/production require HTTPS, no credentials/path/query/fragment; no fallback. Label alone does not distinguish a production hostname: owner must verify actual compiled origin equals backend staging origin. |
| HOMEZONE_IMAGE_HOSTS | Flutter compile-time comma-separated exact lowercase hosts; empty => fallback images. Media loader permits HTTPS port443, no credentials/fragment, no redirects, separate credential-free client, bounded size/time. Approve fixture media hosts/egress separately; it does not authorize arbitrary downloads. |

Conditional credentials are out of scope and should be absent or access/egress
restricted: GOOGLE_CLIENT_ID/SECRET, SMTP_HOST/PORT/USER/PASSWORD, DEMO_EMAIL/PASSWORD,
DEMO_MOBILE_PHONE/OTP, WHATSAPP_OTP_PROVIDER/API_KEY, CLOUDINARY_* and UPLOAD_MAX_BYTES,
OPENAI_*, GEMINI_*, ANTHROPIC_*, RAZORPAY_* . Flags alone do not prove all legacy
routes unreachable. HOMEZONE_APPLICATION_ID/PACKAGE_ID_APPROVED and HOMEZONE_SIGNING_*
are separate Android release gates; signing material must never enter Dart defines.
No package identity, privacy URL, production endpoint or signing approval is inferred.

## Security, operations and ownership contract

Ingress owner must document TLS termination, canonical Host/proto validation,
header stripping/overwriting, direct-origin restrictions, ambiguity/duplicate
header rejection, request/body/time/concurrency limits and repeated Set-Cookie
preservation. backend/auth.ts sets trustHost:true; AUTH_TRUST_HOST is not a fix.
Registration/password admission does not trust IP headers, but general rate-limit
getClientIp uses first x-forwarded-for or x-real-ip; prove these originate only
from trusted ingress or do not rely on their quotas as a security boundary.

PostgreSQL password account/aggregate admission is implemented locally, not
verified across real workers. Multi-instance approval still needs trusted client
and client/account controls, approved fail-closed timeout/recovery, bounded
capacity/cleanup, shared protected identifier keys and rotation policy. Avoid permanent account
lockout; assess targeted and aggregate denial. One Node process is only a limited
first-test topology, not distributed proof. Runtime counters now survive worker
recreation in the shared store; legacy general memory limits still reset.

Registration uses shared DB counters and row-scoped challenge replacement. An
exhausted old challenge stays unusable; an admitted resend creates a new ID/HMAC
with five guesses and fresh expiry, still subject to shared quotas. Retry-After
uses the latest evaluated blocker and ceiling seconds, not always 60. Later traffic
or admission tiers can require another wait. Clients cannot override server rules.
Provider failure removes only its matching challenge; quotas are not refunded.
Delayed email may arrive after replacement/expiry; use the newest challenge and
never promise inbox receipt from provider acceptance. No rollback can unsend mail.

| Named role (all UNASSIGNED / NOT VERIFIED) | Required evidence before testing |
|---|---|
| Infrastructure/test authorizer | Target and scope, attempt/email/time ceilings, topology, authorized devices, stop authority. |
| DB migration/recovery owner | History/data review, backup/restore rehearsal, lock/connection budgets, rollback/forward-repair decision. |
| Ingress/security owner | Trust contract, direct-origin closure, edge admission and distributed-limit design. |
| Email/secret owner | Restricted sender/recipients, access/rotation/revocation, provider retention and bounce handling. |
| Monitoring/on-call owner | Redacted route/status counts, latency, 429/503, storage/registry faults, provider failure, activation anomalies, DB locks/capacity and alert delivery rehearsal. Thresholds and response times explicitly approved, not invented here. |
| Cleanup/privacy owner | Approved test-account disposal, pending records, expired budgets/registry/reset tokens, backups, provider messages and artifacts; retention periods and completion evidence. |
| Incident/rollback owner | Stop traffic/email, contain credentials, preserve sanitized evidence, notify named responders, restore/reconcile staging and approve resumption. |

Use bounded labels only, not email/account/OTP/cookie/challenge/token values.
Never retain body captures, HARs, raw SQL parameters or code screenshots. A 503
alone is not sufficient monitoring. Existing bounded on-delivery cleanup (up to
100 expired pending rows and old budgets) leaves idle personal data indefinitely
without another request; define scheduled erasure that never removes live budgets.
Consumed pending records retain name/email; backups and provider content also need
retention. Public deletion/anonymization needs a reviewed real workflow across
property/lead/payment/audit relationships; no blind User delete is approved.

Auth.js uses 30-day registry-backed JWT sessions; client verified expiry is only
an upper bound, not proof of continuing server validity. Resume revalidation and
protected requests must handle revocation/storage failure. App restart has no
restorable session. Logout invokes server registry revocation; lost/failed response
means revocation uncertain. Local clearing/cancellation cannot revoke or undo a
previously processed request. Privacy, support, deletion and consent policy remain
public-release blockers; profile completion is optional in current registration.

## Ordered staging test matrix — every remote row NOT RUN

Local preparation is authorized: source/fixture review and existing mocked tests.
All rows marked remote require a separate written owner authorization AFTER the
gate above. Negative/concurrent/quota/fault/recovery tests need explicit scope,
not just permission for the ordinary happy path. Every row inherits: STOP on any
production target/data, uncontrolled recipient, secret disclosure, missing monitor,
exceeded ceiling, unexpected privileged change or loss of isolation.

| Step / execution | Procedure and expected outcome | Additional stop condition |
|---|---|---|
| 1. Local preparation | Freeze approved source/artifact/migration identifiers, inspect mock fixtures, define sanitized evidence template; previous counts remain historical. | Unexplained source/artifact mismatch. |
| 2. Remote DB/recovery preflight | Owner verifies identity/history/data counts, backs up and restores a second disposable target; complete exact migration rehearsal and approve recovery. | Drift, duplicates without remediation, lock budget exceeded or restore failure; no deploy. |
| 3. Remote authorized setup | Separately approved deployment/migration uses reviewed manifest, one Node process, restricted mail and canonical HTTPS. Verify history/indexes/client compatibility/runtime target before traffic. | Failed/partial migration, target mismatch, unreviewed origins or unsafe logs. |
| 4. Remote registration/delivery | Disposable approved mailbox + fictional name. Signup 202 with authoritative metadata; pending credentials only, no authenticatable new User. Verify receipt privately. | Wrong recipient, provider acceptance presented as inbox proof, premature account activation. |
| 5. Remote valid/replay/duplicates | Fresh valid code => one activation with fixed USER role, verifiers erased; replay fails. Case-variant duplicate cannot overwrite credentials/roles. | Multiple activations, existing account changed, account enumeration or privileged role. |
| 6. Remote wrong/expired/exhausted | Up to approved five wrong guesses; original ID remains unusable after fifth. Correct code at/after expiry fails. Client shows safe retry/restart. Prefer local fake time for exact boundary. | Unexpected sixth admission, session issued on failure; do not alter shared server clock. |
| 7. Remote resend replacement | Before cooldown => disabled/429. After allowed wait => new ID/code/attempt budget, old ID invalid even if digits coincide. Verify fresh challenge through trusted path. | Old ID resurrects or email accepted for already-stale challenge at dispatch. Delayed older email alone is not a bypass. |
| 8. Local overlaps; remote only explicit quota scope | Existing fake-clock tests cover cooldown/hourly overlaps, reset boundaries and malformed rows. Authorized staging checks compare response Retry-After with observed blocker; restart must not bypass it. | Budget refund/bypass, hint shorter than observed enforcing blocker, test cap reached. Do NOT send 100 real emails merely to exhaust aggregate quota. |
| 9. Remote concurrent race scope | Controlled simultaneous resends and resend/verify pairs: at most one winning replacement/activation; losing ID cannot publish, clear or consume newer state. Verify actual PostgreSQL results. | Duplicate activation, corrupt verifier, deadlock/latency beyond approved stop budget. |
| 10. Remote automatic auth/home | OTP success then CSRF bootstrap, password callback, independent session verification => service /buyer. Empty published catalog => useful empty state; failure => error, never fictional fallback. | Callback-only navigation, cross-origin redirect, demo data presented as real, unauthorized account read. |
| 11. Remote sign-in/logout | Invalid credentials generic/no new session; valid sign-in independently verified. CSRF-protected logout revokes registry entry; verify only approved disposable session. | Wrong account session, revocation failure reported as success; no token retained in artifacts. |
| 12. Local + authorized native remote lifecycle | Expiry/invalid registry removes protected access; resume revalidates; restart requires sign-in. Abandoned requests cannot publish stale identity. Verify HTTPS cookies/TLS on approved devices. | TLS bypass required, cookie leakage or revoked session still grants protected access. |
| 13. Local + remote abuse scope | Malformed/unknown IDs bounded by shared request admission before lookup; body limit4096; browser wrong origin denied. Trusted edge handles spoofed client headers/concurrency. | Bypass, unbounded work, uncontrolled load or quota exhaustion affecting unauthorized users. |
| 14. Local + explicit remote fault scope | Mock provider/storage/registry failures first. Authorized isolated fault tests => generic safe failures, no false email/account/session success, conditional cleanup preserves newer state. | Redaction fails, recovery path unavailable, uncertainty concealed or fault escapes target. |
| 15. Remote recovery drill | Pause test traffic/mail; perform approved restore/repair on disposable target, verify migration/index/data state and app compatibility; reconcile fixtures and invalidate test sessions. | Restore integrity/RPO/RTO fails; do not resume. |
| 16. Remote cleanup/sign-off | Named owner completes approved pending/account/mail/backup/artifact retention actions; record non-secret evidence and remaining gaps. | Unowned residual personal data or unsupported deletion improvised. |

Record build/commit, approved case ID, UTC time, fixture alias, status/latency,
non-secret outcome, owner and PASS/FAIL/NOT RUN. No email text, credentials or raw
protocol metadata. Multi-instance tests remain out of scope until shared password
limits and trusted ingress are approved. No row here was exercised remotely.

## Local validation and preservation

This phase changes documentation only. Source/config/migrations and existing QA
artifacts were preserved. Fresh checks are limited to source-contract assertions,
Git whitespace and initial/final status/hash comparisons; results are recorded in
the separate ignored build/qa-infrastructure-gate directory. No current test/build,
Prisma CLI, env audit, emulator launch, DB query, migration or provider request is
needed or claimed. Prior 37 registration / 116 Node / 76 focused Flutter results in
REGISTRATION_SECURITY_FIXES.md and the original 287 full Flutter ledger are
historical, not reruns in this phase.

Next action: infrastructure owner completes and signs the target/manifest,
recovery, restricted-email, ingress, ownership and exact-test authorization gates.
Until then staging and production remain **NOT VERIFIED** and live actions ON HOLD.
