# PIN staging activation plan

Review date: 2026-10-30. Status: HOLD — activation is not authorized by this review.

## Evidence and source baseline

- Local branch `main`, HEAD `bef2561fd536a5715edf61efb8733e7ee811394e`; clean before these documents. PIN registration/mobile integration is committed in predecessor `9f45e985c06168fe3f398ad6174e7607ab718fef`. A local commit does not establish remote deployment.
- Staging origin: `https://homezone-staging.up.railway.app`.
- GET `/api/auth/providers`, 2026-10-30 07:23:12.442 UTC: HTTP 200, `mobile-pin` absent. Railway request ID `joTlZuDxSeur1bvFWVMv1w`.
- GET `/api/mobile/auth/register`, 2026-10-30 07:23:12.837 UTC: HTTP 405. Request ID `WyYMKxK7RnevarV8ss7a6g`. This supersedes the historical GET 404 and is consistent with the current POST-only route, not proof of successful enrollment.
- Current deployed SHA, deployment ID, replica consistency and effective configuration are unavailable. No authenticated Railway metadata or database evidence was available.

Historical identity leads, requiring independent owner confirmation before any action:

| Item | Historical/intended identity |
| --- | --- |
| Project | HOMEZONE/homezone; `1f8c9007-2993-426c-bbd0-b8dd0a0b17da` |
| Environment | staging; `2181eadf-21a0-4ca3-8269-b6b6f28af9f4` |
| Backend | HomeZone; `ea6ca516-4063-4ed1-be95-bebcc0d1af00` |
| Database | Owner-intended Postgres-9ZqA; service ID and effective database/schema unverified |

Do not substitute historical Postgres-WU4G identity or migration failure for replacement database evidence.

## Why the provider is absent

`backend/auth.ts` adds `mobile-pin` only when `AUTH_MOBILE_PIN_ENABLED === "true"`, evaluated during module initialization. The authorizer is `src/lib/auth/mobile-pin.ts`. Missing/invalid activation is a supported explanation; an older/different deployed bundle or incorrect domain/service mapping remains possible. The exact live cause is not established.

Pepper, quota-key and PIN-table failures affect registration/login; they do not selectively remove this provider in the reviewed registration code. A public providers response does not certify those dependencies. Changing a flag without an approved new process does not establish that the initialized provider list changed.

## Schema and build prerequisites

There are 21 local migrations. The last, `20261030120000_mobile_pin_foundation`, adds `MobilePinCredential` and `MobilePinLoginBudget`; staging status is UNKNOWN. Historical success of 20 migrations does not establish its application.

Source inspection finds an additive migration consistent with the Prisma models: unique `userId` and normalized mobile number, cascading User foreign key, canonical Indian-number and versioned-hash checks, nonnegative quota count and reset-time index. It performs no backfill or automatic account linking. Actual execution validity, partial objects, permissions and lock effects remain unverified.

Required existing dependencies include User/Profile, profile role/verification fields, User.sessionVersion and AuthSession from earlier migrations. The schema permits null User email/emailVerified; existing public roles require no additional enum migration. Owner must check actual definitions and constraints, including preexisting object-name collisions and the effective schema/search path used by raw SQL.

The local generated Prisma schema includes both PIN models. This says nothing about the deployed generated client. The existing local `.next` artifact is stale: build ID `zckuAMkxiE_LLTqCdSd3I`, October 24 timestamps, registration route absent from its app-path manifest. It is not evidence of Railway's artifact.

Repository commands: `postinstall`: `prisma generate`; build: `npm run build` (`next build`); pre-deploy: `npm run db:migrate` (`prisma migrate deploy`); start: `npm start -- --hostname 0.0.0.0`. Railway dashboard overrides are unverified. Pre-deploy applies ALL pending migrations, not only PIN.

## Configuration requirements — effective staging values not verified

Secret values must remain in the owner's private secret-management interface. Confirm presence, shape, scope, reference target and consistency; report only compliance, never values or full connection strings.

| Variable | Requirement / purpose |
| --- | --- |
| DATABASE_URL | Required; confirmed staging Postgres-9ZqA database/schema; independently compare runtime and migration runner references. |
| AUTH_SECRET | Required stable high-entropy session secret, identical across replicas; securely retain for rollback. No development fallback in deployed staging. |
| NODE_ENV | `production` for deployed Next.js staging; this is runtime mode, not environment identity. |
| AUTH_URL / NEXTAUTH_URL | At least one explicit canonical staging origin; AUTH_URL takes precedence. If both set, both must agree (optional trailing slash accepted). |
| AUTH_STAGING_ORIGIN | Required to approve this non-production HTTPS hostname; exact staging origin, no credentials/path/query/fragment. Must agree with canonical origin and cannot be either approved production origin. |
| NEXT_PUBLIC_SITE_URL | If configured/used for site links, same staging origin; not the canonical-origin selector. |
| AUTH_MOBILE_PIN_ENABLED | Literal `true` enables provider AND enrollment; keep disabled until schema, secrets and deployment are ready and activation approved. |
| MOBILE_PIN_PEPPER_V1 | Required independent high-entropy secret, 32–256 characters, no outer whitespace. Same across replicas; securely back up v1. Do not rotate in place. |
| MOBILE_PIN_RATE_LIMIT_KEY | Required separate high-entropy secret, 32–256 characters, no outer whitespace; same across replicas. Rotation changes identifier buckets. |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | Optional positive integer; default 5, maximum 20. Failed logins per number/window. |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | Optional positive integer; default 900000, maximum 86400000. |
| MOBILE_PIN_GLOBAL_ATTEMPTS | Optional positive integer; default 300, maximum 10000; aggregate all-attempt budget. |
| MOBILE_PIN_GLOBAL_WINDOW_MS | Optional positive integer; default 300000, maximum 3600000. |
| MOBILE_PIN_MAX_ACCOUNTS | Optional positive integer; default 10000, maximum 100000; bounded failure-budget identifiers. |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | Optional positive integer; default 5000, maximum 10000. |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | Optional positive integer; default 100, maximum 1000. |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | Optional positive integer; default 3, maximum 10. |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | Optional positive integer; default 10, maximum 100. |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional `x-real-ip` or `x-forwarded-for`, only after proving ingress overwrites a single valid IP. Without selection, requests share one conservative 10/hour ingress bucket; configured invalid/missing header fails closed. |
| DEMO_LOGIN_ENABLED / DEMO_MOBILE_LOGIN_ENABLED / AUTH_MOBILE_OTP_ENABLED | Review existing demo activation paths for a real PIN trial; not PIN dependencies. Preserve website/admin behavior. |
| LOG_LEVEL / SENTRY_DSN | Existing optional diagnostics; not required for PIN activation. Fixed PIN diagnostic labels do not depend on LOG_LEVEL. |

PIN registration/login require no email provider, SMS, OTP pepper or sender configuration, and no separate PIN session-signing secret. Other existing website functionality may retain its own requirements.

## Ordered activation sequence — future actions only

1. **Confirm target and version.** Owner records current project/environment/backend/database IDs, domain mapping, deployment ID/SHA, source branch/root, replica count and effective commands. Verify intended reviewed commit is available remotely without assuming local HEAD is deployed. Privately confirm runtime and migrator resolve to the same staging database/schema, never production.
2. **Reconcile and prepare.** Obtain full migration history (all attempts/checksums/errors), catalog definitions and schema drift evidence against the exact intended commit. Confirm backup timestamp, retention and restore evidence, recoverability, permissions, connection/lock capacity and maintenance window. Prepare the variables above privately. Configuration changes may themselves trigger deployment; obtain separate approval before changing any variable. Keep PIN disabled until dependencies are ready.
3. **Approve migration separately.** Present exact staging target, reviewed pending migration set and recovery plan. Only after owner approval run the approved staging migration action. The declared `npm run db:migrate` applies every pending migration; do not run it until all are reconciled and approved. If Railway pre-deploy will execute it, include that write in deployment approval. Never reset, db-push, mark resolved or edit migration history to bypass uncertainty. Review resulting history and schema evidence before activation.
4. **Approve and deploy the reviewed backend.** Use a fresh dependency installation/generated Prisma client and build from the exact approved commit. Confirm route manifest includes the registration route; do not reuse stale `.next`. Confirm tables and secrets ready before the shared enrollment/provider flag becomes true. Obtain explicit approval for staging-only deployment/configuration/new-process activation, identifying rollback artifact and service ID. Do not infer readiness from build success.
5. **Read-only provider confirmation.** GET `/api/auth/providers` on the staging host; require `mobile-pin` and staging callback URLs. Record UTC, request ID and deployed SHA; check replica consistency. Absence requires configuration/version investigation, not weakened protections.
6. **Route confirmation without writes.** GET `/api/mobile/auth/register` should return 405 for the POST-only handler. Correlate deployed route artifact/log metadata. This is route evidence only. Do NOT send a diagnostic registration POST: quota admission writes happen even before body validation.
7. **Separately authorize controlled authentication writes.** Obtain approval for one owner-controlled unused Indian mobile identity, selected public role (start USER), private PIN entry, quota writes and AuthSession creation/revocation. Registration contract: POST `/api/mobile/auth/register` with string `mobileNumber`, `pin`, `confirmPin`, and allowed public `role`. Generic acknowledgment does not prove account creation. Use existing Auth.js CSRF then `/api/auth/callback/mobile-pin` with `phone` and `pin`; independently verify `/api/auth/session` and the existing mobile profile response. Confirm actual role, dashboard and app restart restoration. Logout through existing CSRF/signout flow; verify protected access rejected. Approve incorrect-PIN, duplicate, role-mismatch and cross-account trials explicitly because they also consume budgets/write state. Never print credentials/cookies or send OTPs.

Record actual Flutter action, staging request/response and Android UI result for each trial. Public catalogue HTTP 200 is not authentication verification. Phone possession is not verified under the approved no-OTP policy; Forgot PIN and pepper rotation require later design.

## Rollback and acceptance

Rollback requires its own approval: disable PIN activation or restore an identified compatible artifact while preserving website/admin sessions and configuration. Retain additive schema, accounts, credential hashes, pepper v1 and revocation records. Do not drop tables, reset history, replace secrets or fall back to demo authentication. Disabling the provider does not itself revoke existing sessions; any revocation action requires separate approval.

Activation acceptance requires deployed-version proof, reconciled schema, private configuration compliance, provider/route checks and approved device registration/login/session/logout evidence. None is established solely by this document.

This review created documentation only. No application source, secrets, settings or database state changed; no migrations, builds, tests, registration POSTs, deployments, commits or pushes were performed.
