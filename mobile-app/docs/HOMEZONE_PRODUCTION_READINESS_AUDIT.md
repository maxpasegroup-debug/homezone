# Production readiness audit

Date: 2026-10-30. Recommendation: **NOT READY FOR PRODUCTION PIN ACTIVATION OR MOBILE RELEASE APPROVAL**.

## Scope and evidence

Read-only repository and existing-evidence audit. Local baseline: 18ebcb401e95e178c1bc3f9f16faea735a044063; working tree clean at entry. No production/staging HTTP requests, Railway access, secret inspection, database access, builds or tests were performed. Only this document is added.

PASS applies to the specific source/documentation claim, not deployed functionality. FAIL means a stated release requirement is not met in inspected files/evidence. UNKNOWN means evidence is unavailable, not that a setting/table is absent.

## Production identity and deployment assessment

| Check | Result | Evidence and limitation |
| --- | --- | --- |
| Intended production custom domain identified | PASS | Founder confirms https://speeko.online. Alternative https://homezone-production.up.railway.app is owner-reported historical production domain. |
| Current Railway production project/environment/service IDs and domain mapping | UNKNOWN | No current authenticated deployment metadata. Historical project name HOMEZONE/homezone is not current production service identity proof. Do not reuse staging service IDs as production identity. |
| Production deployed SHA, deployment ID/status/time | UNKNOWN | Local commits and documentation do not establish deployed source or replicas. |
| Production contains PIN route/provider | UNKNOWN | Locally backend/auth.ts registers mobile-pin, and src/app/api/mobile/auth/register/route.ts exports POST. No matching production artifact/SHA evidence. |
| PIN implementation exists locally | PASS | Provider condition backend/auth.ts:92; registration service src/lib/auth/mobile-pin-registration.ts; authorizer src/lib/auth/mobile-pin.ts. Source history identifies 9f45e985c06168fe3f398ad6174e7607ab718fef containing provider plus registration. |
| Deployed production provider list | UNKNOWN | User-supplied password-only JSON had speeko.online callback URLs, but its request origin/deployment was not established. Later staging GET also returned production callback origins; that observation is staging evidence, not a production provider check. |
| Reported migration/startup logs prove production readiness | UNKNOWN | Supplied 08:52 UTC logs name Postgres-9ZqA, 21 migrations/no pending and Next.js ready. Context identifies staging, with no production identity/SHA evidence. Never transfer that migration state to production. |

## Authentication origin and configuration

Source: src/lib/auth/redirect.ts:1–65. Fixed production allowlist contains exactly speeko.online and homezone-production.up.railway.app. One canonical origin is selected by AUTH_URL ?? NEXTAUTH_URL; redirects remain restricted to that selected origin. The allowlist does not make cookies, sessions or callbacks interchangeable between hosts.

| Check | Result | Evidence / required state |
| --- | --- | --- |
| Approved production custom origin supported in source | PASS | redirect.ts productionOrigins contains https://speeko.online. |
| Exact canonical production origin selected effectively | UNKNOWN | AUTH_URL should select https://speeko.online. If NEXTAUTH_URL is also set, it must agree (optional trailing slash accepted). No private settings inspected. |
| Production does not use staging override | UNKNOWN | AUTH_STAGING_ORIGIN should be absent for this production plan; malformed values throw and production domains are rejected as staging origins. Do not use it as a workaround. |
| Public site links consistent | UNKNOWN | NEXT_PUBLIC_SITE_URL, when used, should match approved production canonical origin; not itself the auth-origin selector. |
| Canonical-origin/CSRF/session protections implemented | PASS, source | Existing redirect validation, Auth.js CSRF/callback handling, session-registry validation/revocation and suspension checks retained. backend/auth.ts trustHost:true is existing behavior; actual proxy/host ingress guarantees remain UNKNOWN. |
| Production callback and cookie behavior runtime verified | UNKNOWN | No authenticated browser/mobile trial. Host changes can require fresh sign-in; do not copy cookies or credentials between domains. |

Required effective variables are ALL UNKNOWN. Private owner verification must report compliance only, never values:

| Name | Production requirement |
| --- | --- |
| DATABASE_URL | Confirmed production service/database/schema; runtime and migration runner agree; not staging. |
| AUTH_SECRET | Stable high-entropy secret shared only among production replicas; backup privately; distinct from staging. |
| NODE_ENV | production. |
| AUTH_URL / NEXTAUTH_URL | Explicit canonical production origin as above; if both exist they agree. |
| NEXT_PUBLIC_SITE_URL | If configured/used, approved production canonical origin. |
| AUTH_STAGING_ORIGIN | Absent for this production canonical-origin plan. |
| AUTH_MOBILE_PIN_ENABLED | Literal true enables provider/enrollment at initialization; do not activate until schema, configuration and rollout are approved. |
| MOBILE_PIN_PEPPER_V1 | Independent high-entropy secret, 32–256 characters, no outer whitespace; consistent across production replicas, distinct from staging, privately backed up. v1 encoded in hash; no separate version selector. |
| MOBILE_PIN_RATE_LIMIT_KEY | Separate high-entropy secret, 32–256 characters, no outer whitespace; production-scoped, shared by production replicas; distinct from staging/pepper. |
| MOBILE_PIN_ACCOUNT_ATTEMPTS / MOBILE_PIN_ACCOUNT_WINDOW_MS | Optional positive integers; defaults 5 / 900000; maxima 20 / 86400000. |
| MOBILE_PIN_GLOBAL_ATTEMPTS / MOBILE_PIN_GLOBAL_WINDOW_MS | Optional positive integers; defaults 300 / 300000; maxima 10000 / 3600000. |
| MOBILE_PIN_MAX_ACCOUNTS | Optional positive integer; default 10000, max 100000. |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | Optional positive integer; default 5000, max 10000. |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | Optional positive integer; default 100, max 1000. |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | Optional positive integer; default 3, max 10. |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | Optional positive integer; default 10, max 100. |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional x-real-ip/x-forwarded-for only after proving ingress overwrites one valid IP. Without selection, all clients share one conservative ingress bucket, limiting legitimate capacity. |
| DEMO_LOGIN_ENABLED / DEMO_MOBILE_LOGIN_ENABLED / AUTH_MOBILE_OTP_ENABLED | Review existing demo-provider gates; no demo bypass in real production authentication. Preserve website/admin behavior. |

Sources: mobile-pin-hash.ts, mobile-pin-admission.ts, mobile-pin-registration.ts and backend/auth.ts. Optional LOG_LEVEL/SENTRY_DSN do not certify safe logging or enable PIN. PIN needs no OTP/email-provider configuration; preserve independent website requirements. No pepper rotation/Forgot PIN workflow is implemented. No phone-possession proof exists under the approved no-OTP policy; owner must accept identity/recovery consequences before production launch.

## Database, client and isolation

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Required PIN migration exists | PASS | prisma/migrations/20261030120000_mobile_pin_foundation/migration.sql, last of 21 local directories. |
| Prisma models/DDL align by inspection | PASS | prisma/schema.prisma MobilePinCredential, MobilePinLoginBudget and User inverse relation. SQL adds primary keys, unique userId/mobile indexes, User cascade FK, canonical-number/hash checks, nonnegative budget count and resetAt index. No execution validation. |
| PIN migration applied in production | UNKNOWN | No production _prisma_migrations/checksum/partial-effect evidence. |
| Prerequisite schema/client compatibility in production | UNKNOWN | Requires User/Profile, nullable email/emailVerified, roles, User.sessionVersion and AuthSession plus compatible generated Prisma client. Local files/types do not prove deployed catalog/client. |
| Production/staging databases separate | UNKNOWN | DATABASE_URL references, service IDs and schemas not privately reconciled. Distinct public domains do not prove database isolation. |
| Production/staging secrets separate | UNKNOWN | No secret values examined; owner must attest separate secret provenance privately, not provide values/hashes. |
| Recoverability and migration capacity established | UNKNOWN | No current production backup/restore test evidence, pending-set reconciliation, lock/connection/capacity review or maintenance approval. |

Source registration uses DB-backed quotas, hashes before account transaction, creates User/credential/Profile atomically and never links by editable Profile.phone. Duplicate/collision responses are generic and not account-creation proof. These are source protections, not database health evidence.

## Mobile and business workflow readiness

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Environment separation mechanism | PASS, source | mobile-app/lib/core/api/api_configuration.dart and scripts/service-config.mjs require explicit environment/origin, HTTPS and origin-only URL. Environment label alone does not enforce hostname identity; owner must inspect compiled origin. main.dart defaults to preview without API define. |
| Dedicated production mobile config exists | FAIL in inspected config directory | mobile-app/config contains README.md and staging.local.json only. No reviewed dedicated production config established; do not reuse staging config. |
| Existing staging config remains staging | PASS | staging.local.json uses API enabled, staging and https://homezone-staging.up.railway.app. Empty image/media allowlists. No change performed. |
| Signed production Android release ready | UNKNOWN / blocking evidence absent | scripts/build-android.mjs runs assembleDebug. android/app/build.gradle.kts gates release on HOMEZONE_APPLICATION_ID, HOMEZONE_PACKAGE_ID_APPROVED and externally supplied HOMEZONE_SIGNING_STORE_FILE, HOMEZONE_SIGNING_STORE_PASSWORD, HOMEZONE_SIGNING_KEY_ALIAS, HOMEZONE_SIGNING_KEY_PASSWORD. Actual identity/signing readiness not checked. |
| PIN session/profile/role source integration | PASS, source | mobile_pin_auth_screen.dart, password_auth_protocol.dart, sign_in_controller.dart, profile_dashboard_gate.dart: CSRF/callback/session/profile checks, role mismatch signout, server role routing, scoped secure storage/restoration. |
| Production registration/login/session/roles ready for controlled trial | UNKNOWN; blocked | Deployment/schema/config and trial authorization absent. Public roles USER/OWNER/BROKER/BUILDER/SERVICE_PROVIDER validated server-side; no public ADMIN/SUPER_ADMIN. Runtime permissions not established. |
| Catalogue/detail real-data request paths | PASS, source | MarketplaceRepository → /api/mobile/properties and /api/mobile/properties/[id]; route files exist, catalog projection in src/lib/properties/mobile-catalog.ts. |
| Production published listings/detail availability | UNKNOWN | No production data/query/HTTP evidence collected. Staging empty array says nothing about production records. |
| Image/media handling | PASS for restrictions; production delivery UNKNOWN | Exact-host allowlists, fallback and public media confirmation documented in config/README.md and existing mobile implementation. Approved production hosts/config not established; do not invent or wildcard hosts. |
| Favorites/collections/enquiries source paths | PASS, source | marketplace_repository.dart calls /api/properties/[id]/save, /api/shortlists, /api/leads and /api/mobile/account/collections; account route queries savedProperty, propertyShortlist and lead scoped to profile. Production behavior UNKNOWN. |
| Role workflows source path | PASS, source | /api/mobile/workspace and [id] handlers, WorkspaceScreen and repository; backend derives actor/role and scopes records. Existence is not proof every screen/action works. |
| Real role/business end-to-end verification | UNKNOWN | No production trial for owner inventory/submission, broker leads, builder projects, provider services, notifications, uploads or mutations. Existing documentation reports source integration, not production acceptance. |

Old MASTER_IMPLEMENTATION.md passages use speeko.online as staging and suggest AUTH_STAGING_ORIGIN workarounds. Those conflict with current founder domain separation and redirect.ts. Treat them as superseded history, not release instructions. config/README.md also contains historical owner-origin statements; actual source/config and current approval are authoritative.

## Safe release sequence and required approvals

1. **Evidence first, no changes:** owner supplies sanitized current production project/environment/backend/database identities, domain mapping, deployed SHA/ID/status/time, branch/root, effective commands/replicas and private variable/isolation compliance. No secret dumps. Reconcile exact intended commit with deployed artifact and production client.
2. **Database reconciliation:** authorized owner provides full migration history/checksums/all attempts/errors and catalog/drift/partial-effect evidence against intended commit. Review all pending migrations, not just PIN; obtain backup/restore, permissions/capacity and maintenance/recovery evidence. New database access requires approved scope; none authorized here.
3. **Staging acceptance before production:** repair/activate only through separately approved staging actions, then explicitly approved account/device trials covering PIN, profiles/roles, restoration/logout, wrong-role denial and real listing/business workflows. No production trial substitutes for unresolved staging gates.
4. **Separate configuration approval:** present exact production variable-name changes and isolated target. Preserve website/admin secrets and canonical behavior. Keep PIN disabled until dependencies ready. Variable saves may trigger deployment; include that risk in approval.
5. **Separate migration/deployment approval:** identify production service/artifact SHA, fully reviewed pending set and rollback. railway.json pre-deploy runs npm run db:migrate (prisma migrate deploy), applying ALL pending migrations. Deployment can therefore write production even without a separately typed migration command. No deployment until this is explicitly approved. Build/CI evidence must include fresh Prisma generation and route inclusion; no stale .next reuse.
6. **Separate mobile release approval:** prepare dedicated nonsecret production config, exact approved image/media hosts, approved application ID and signing custody, reproducible release artifact/hash and staging-to-production configuration review. Do not distribute the existing debug wrapper output as a signed production release.
7. **Separate controlled production verification approval:** authorize only identified owner-controlled account/role, quota/session/account writes and exact permitted actions. Verify actual Flutter registration → separate login → session/profile → dashboard → restart → logout/revocation, then approved business actions. Do not print bodies/cookies/PINs or interpret generic signup acknowledgment as creation. Do not use dummy POSTs as read-only probes.
8. **Release decision:** require evidence per workflow, monitored capacity/error rates and an approved rollout window. Do not call source compilation or public HTTP 200 full readiness.

## Rollback

Before approval identify compatible prior production artifact/deployment ID and secure configuration/secret backups. Approved rollback may disable enrollment/provider or restore that artifact, accounting for pre-deploy migrations on rollback too. Preserve additive schema, accounts, hashes, pepper v1 and revocation registry. Do not drop tables, reset/resolve migration history, replace secrets or fall back to demo authentication. Disabling provider does not revoke existing sessions; revocation requires separately approved writes. Canonical host changes can disrupt sessions and must be part of the compatibility plan.

## Final recommendation

**NOT READY FOR PRODUCTION PIN ACTIVATION OR MOBILE RELEASE APPROVAL.** Blocking unknowns: actual production deployment identity/source, PIN schema/client readiness, effective origin/secrets/isolation, recoverability and end-to-end authentication/business evidence. A dedicated production mobile configuration and signed release evidence are also outstanding.

Founder approval is required separately for any configuration change (including triggered redeployment), migration/database write, backend deployment/rollback/restart, account creation/authentication trials, business mutations, production network verification, builds/tests/device execution and mobile signing/distribution. This audit authorizes none of them.

Only this report was created. No source code/settings, staging or production state changed. No requests, database access, migrations, accounts, builds/tests, deployments, commits or pushes occurred.
