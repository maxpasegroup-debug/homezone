# Staging readiness verification

Date: 2026-10-30. Recommendation: **NOT READY FOR ACTIVATION APPROVAL**.

## Scope and baseline

Followed HOMEZONE_FINAL_STAGING_PIN_ACTIVATION_HANDOVER.md using local source, existing evidence and two unauthenticated public staging GETs. No authenticated Railway metadata was accessible; Railway CLI was not available on PATH. No secret environment files or secret values were inspected. No database access was performed.

Local branch: main. Local SHA: `e19c1d110efe9f9aa2279b372dd37c4a3281989b`, matching the handover baseline. The existing untracked handover document was preserved. Older reports referencing other local SHAs or registration GET 404 are historical.

PASS means the stated scoped check has supporting evidence, not that a whole workflow works. FAIL means the required observed condition is not met. UNKNOWN means available evidence cannot establish compliance; it does not mean a variable or table is missing.

## Checklist

| Check | Result | Evidence and limit |
| --- | --- | --- |
| Local baseline matches handover | PASS | Current branch/SHA above; not a deployed-version assertion. |
| Local POST registration route exists | PASS | src/app/api/mobile/auth/register/route.ts exports POST → mobilePinRegistration; no GET export. |
| Local conditional PIN provider exists | PASS | backend/auth.ts:92 requires AUTH_MOBILE_PIN_ENABLED literal true during module initialization. |
| Public staging Auth.js endpoint responds | PASS | GET providers HTTP 200 at 08:47:07.793 UTC. |
| Live providers advertises mobile-pin | FAIL | mobile-pin absent from latest response. Exact reason unconfirmed. |
| Public registration GET has expected method rejection | PASS | HTTP 405 at 08:47:08.154 UTC; consistent with POST-only route, not proof of POST readiness. |
| Live registration POST works | UNKNOWN | No POST sent: even malformed requests may write quota state. |
| Exact current Railway project/environment/service mapping | UNKNOWN | Historical IDs available, no current dashboard/domain mapping evidence. |
| Deployed SHA, deployment ID/status/time | UNKNOWN | Public response timestamps are request times, not deployment times. |
| Deployed artifact contains reviewed provider/route | UNKNOWN | GET 405 alone cannot identify source SHA or exact handler. |
| Required effective staging variables compliant | UNKNOWN | Source requirements identified; private runtime configuration unavailable. |
| PIN migration present locally | PASS | 20261030120000_mobile_pin_foundation is last of 21 local migration directories. |
| PIN migration applied successfully in staging | UNKNOWN | No current migration-history/schema evidence; historical 20 migrations insufficient. |
| Local schema and migration align by inspection | PASS | Matching credential/budget tables, unique/FK/index definitions; SQL checks supplement Prisma models. Not executed validation. |
| Local generated client schema contains PIN models | PASS | node_modules/.prisma/client/schema.prisma contains MobilePinCredential and MobilePinLoginBudget. No generation/compilation performed. |
| Existing local Next artifact includes PIN route | FAIL | Local app-path manifest dated 2026-10-24 06:35:27.865 UTC lacks route; stale local artifact, not Railway evidence. |
| Deployed generated Prisma client compatible | UNKNOWN | No deployed generated schema/build provenance available. |
| Runtime/migrator target same isolated staging DB/schema | UNKNOWN | Effective references/identity not accessible. |
| Backups/recovery, permissions/capacity/drift reviewed | UNKNOWN | No current owner evidence. |
| Flutter PIN login/profile/restoration/logout verified | UNKNOWN | No accounts, login or device execution in this review. Historical catalogue success does not close these checks. |

Latest public observations used redirect refusal and a 15-second timeout, with no credentials/cookies:

| UTC on 2026-10-30 | Path | HTTP | Railway request ID |
| --- | --- | --- | --- |
| 08:47:07.793 | /api/auth/providers | 200; mobile-pin absent | kafWTpBCQvCaZpGns_GTAg |
| 08:47:08.154 | /api/mobile/auth/register | 405 | R3PN4CZ3TCK-igue5nX1uw |

These requests originated from this computer, not Flutter. No production request was sent. No catalogue request was repeated in this execution.

## Deployment identity reconciliation

The following are historical leads from supplied project evidence, not currently confirmed write targets:

| Item | Available evidence |
| --- | --- |
| Railway project | HOMEZONE/homezone; 1f8c9007-2993-426c-bbd0-b8dd0a0b17da |
| Environment | staging; 2181eadf-21a0-4ca3-8269-b6b6f28af9f4 |
| Backend service | HomeZone; ea6ca516-4063-4ed1-be95-bebcc0d1af00 |
| Public origin | https://homezone-staging.up.railway.app; public responses confirmed, current service mapping unknown |
| Intended database | Postgres-9ZqA; service ID, actual database/schema and backend reference unknown |
| Active deployment | SHA, ID, status and deployment time unavailable |

Do not infer the active deployment status from an HTTP 200, use the local commit as deployed SHA, or substitute old Postgres-WU4G evidence for Postgres-9ZqA.

The reviewed source SHOULD advertise mobile-pin if that exact Auth.js code is deployed and AUTH_MOBILE_PIN_ENABLED was literal true at initialization. Absence supports inactive configuration or older/different artifact/target hypotheses. It does not establish which one applies. Pepper, quota key and table failures affect authentication/enrollment, not this provider-registration condition. A changed flag needs an approved new process to affect initialized provider configuration.

## Required configuration: names verified in source, effective values UNKNOWN

| Name | Expected state / purpose | Effective staging check |
| --- | --- | --- |
| DATABASE_URL | Required isolated staging database/schema, runtime and migration runner references agree | UNKNOWN |
| AUTH_SECRET | Stable high-entropy Auth.js secret, shared by replicas, privately backed up | UNKNOWN |
| NODE_ENV | production for deployed Next.js staging | UNKNOWN |
| AUTH_URL | Explicit canonical staging origin if selected; takes precedence | UNKNOWN |
| NEXTAUTH_URL | Alternative canonical setting; if both set they must agree, optional trailing slash only | UNKNOWN |
| AUTH_STAGING_ORIGIN | Exact https://homezone-staging.up.railway.app, no credentials/path/query/fragment; approves this non-production origin | UNKNOWN |
| NEXT_PUBLIC_SITE_URL | If used, same staging origin for links; not canonical selector | UNKNOWN |
| AUTH_MOBILE_PIN_ENABLED | Literal true only after dependencies/activation approval; shared enrollment/provider gate | UNKNOWN; provider absent |
| MOBILE_PIN_PEPPER_V1 | Required independent high-entropy secret, 32–256 characters, no outer whitespace; stable across replicas | UNKNOWN |
| MOBILE_PIN_RATE_LIMIT_KEY | Required separate high-entropy secret, 32–256 characters, no outer whitespace; shared across replicas | UNKNOWN |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | Optional positive integer; default 5, max 20 | UNKNOWN; omission allowed |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | Optional positive integer; default 900000, max 86400000 | UNKNOWN; omission allowed |
| MOBILE_PIN_GLOBAL_ATTEMPTS | Optional positive integer; default 300, max 10000 | UNKNOWN; omission allowed |
| MOBILE_PIN_GLOBAL_WINDOW_MS | Optional positive integer; default 300000, max 3600000 | UNKNOWN; omission allowed |
| MOBILE_PIN_MAX_ACCOUNTS | Optional positive integer; default 10000, max 100000 | UNKNOWN; omission allowed |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | Optional positive integer; default 5000, max 10000 | UNKNOWN; omission allowed |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | Optional positive integer; default 100, max 1000 | UNKNOWN; omission allowed |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | Optional positive integer; default 3, max 10 | UNKNOWN; omission allowed |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | Optional positive integer; default 10, max 100 | UNKNOWN; omission allowed |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional x-real-ip or x-forwarded-for only with verified ingress overwrite/single-IP guarantees | UNKNOWN; omission shares one conservative ingress bucket |

Owner can confirm presence, secret length/whitespace compliance, independent provisioning, replica consistency and service-reference destinations privately in Railway. Return compliance only, never values. Do not interpret provider absence as confirmed absence of any individual secret.

Review DEMO_LOGIN_ENABLED, DEMO_MOBILE_LOGIN_ENABLED and AUTH_MOBILE_OTP_ENABLED for existing demo-provider paths without altering website/admin behavior. Optional LOG_LEVEL/SENTRY_DSN are not PIN prerequisites. There is no separate pepper-version selector or PIN session secret: v1 is encoded in the hash and pepper name. No OTP/email-provider configuration is needed for PIN. Retain pepper v1; rotation/recovery is not implemented.

## Database/client compatibility details

Migration is additive: MobilePinCredential primary key, unique userId/normalizedMobile, User FK with cascading update/delete, canonical +91 mobile check and scrypt v1 hash-format check; MobilePinLoginBudget primary key, nonnegative count/default and resetAt index. Prisma supplies credential IDs and updatedAt. User inverse relation and optional email/emailVerified support PIN accounts; existing public role enum requires no new role migration.

Required existing User/Profile fields, User.sessionVersion and AuthSession must be present. Actual constraint existence, partial DDL, legacy collisions, schema/search_path, permissions and drift remain unknown. No database records or tables were inspected. Local generated-model presence does not establish deployed client compatibility or successful compilation.

Declared railway.json pipeline: build npm run build; pre-deploy npm run db:migrate; start npm start -- --hostname 0.0.0.0. package.json postinstall generates Prisma. Effective Railway overrides are unknown. The pre-deploy command runs prisma migrate deploy against ALL pending migrations; a deployment can therefore write the database. No migration/deployment should be approved based only on the one new migration file.

## Next actions in dependency order

| Order | Exact action | Approval requirement |
| --- | --- | --- |
| 1 | Owner opens HOMEZONE → staging → backend; records service/environment IDs, domain mapping, active deployment SHA/ID/status/time, branch/root and effective commands. Separately confirms Postgres-9ZqA identity. | Read-only evidence collection; no setting changes. Supply sanitized metadata only. |
| 2 | Privately check configuration above and runtime/migrator database/schema references. Obtain existing sanitized migration history/checksums/all attempts/logs, catalog definitions and backup/restore evidence. | Read-only owner evidence; any new DB evidence access must be separately authorized, none performed here. |
| 3 | Compare exact intended artifact against deployed SHA; reconcile full pending set, partial effects/drift, deployed client/build provenance and rollback artifact. | Review only; builds/tests remain unauthorized in this task. |
| 4 | Present exact variable-name changes and staging target; keep PIN off until schema/secrets are ready. Do not save settings casually: changes may trigger deployment. | Founder approval required for configuration and any resulting deployment. |
| 5 | If migration pending, present full reconciled pending set, verified staging runner/target and recoverability. Only then execute approved npm run db:migrate in that runner; skip application if already successfully applied. | Separate founder migration/write approval; never reset/resolve/db-push. |
| 6 | Deploy exact approved backend artifact with fresh compatible client. Account for automatic pre-deploy migrations; activate flag only after prerequisites and approved process refresh. | Separate founder deployment/activation approval; include pre-deploy write scope. |
| 7 | Repeat read-only provider GET and registration GET; require mobile-pin, correct staging callback host and expected method behavior, correlated to deployment/replicas. | Read-only verification; no diagnostic POST. |
| 8 | Approve one owner-controlled unused Indian number/USER role, private PIN entry and actual Flutter enrollment → PIN login → session/profile → dashboard → restart restoration → logout/revocation. | Explicit account/quota/session write and device-execution approval. No OTP; no secrets in chat/logs. |

See the handover for detailed dashboard actions, future commands, stop conditions and rollback. Preserve additive schema, credentials, pepper and session registry on approved rollback; disabling provider alone does not revoke issued sessions. Generic registration acknowledgment is not proof of account creation or authentication.

## Changes and recommendation

Only this report was added. Existing untracked work was preserved. No application code, variables/settings, accounts or production resources changed. No database connection, write/query, migration, deployment/restart, build, test, commit or push occurred.

**NOT READY FOR ACTIVATION APPROVAL** — mobile-pin is absent, and deployment identity/version, effective configuration and actual PIN schema/client readiness remain unverified.
