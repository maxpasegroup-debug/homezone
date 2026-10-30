# Final staging PIN authentication activation handover

Date: 2026-10-30. Verdict: SOURCE IMPLEMENTED; activation and end-to-end authentication verification BLOCKED pending owner evidence and approval.

This handover preserves the existing role-first mobile PIN flow. It does not authorize configuration changes, migrations, deployments, accounts or database writes. Commands below are future instructions, not executed actions.

## 1. Baseline and evidence reconciliation

Current checkout: branch `main`, commit `e19c1d110efe9f9aa2279b372dd37c4a3281989b`, clean before this document. This is the local review baseline, not a confirmed deployed SHA or an instruction to deploy main.

Read and reconciled: HOMEZONE_COMPLETE_INTEGRATION_STATUS.md, HOMEZONE_REMAINING_BLOCKERS.md, HOMEZONE_PIN_STAGING_ACTIVATION_PLAN.md and HOMEZONE_PIN_STAGING_BLOCKERS.md. Older statements about uncommitted work, older HEADs and registration GET 404 are historical. Do not use them to identify the current deployment.

Latest available public observations, collected in a prior read-only check at 2026-10-30 08:29:51–52 UTC:

| Request | Recorded result | Railway request ID |
| --- | --- | --- |
| GET /api/auth/providers | 200; mobile-pin absent | iLCA9IbUTHexh91UWVMv1w |
| GET /api/mobile/auth/register | 405 | 8aNWPLv8S7CJsmv-ss7a6g |
| GET /api/mobile/properties?page=1&pageSize=12 | 200; source database; zero properties | jbqf71CITYGj1e1ww9P4nw |

These requests came from the development computer, not Flutter. They were not repeated during this handover. Historical Flutter catalogue success is separate evidence and does not establish authentication success. GET 405 is consistent with a POST-only route; it does not prove POST execution works.

## 2. Exact deployment identity: owner checkpoint

Authenticated Railway metadata is unavailable in this investigation. The deployed SHA, deployment ID, current status, replica configuration, effective variables, database reference and migration state remain UNKNOWN.

Historical identity leads only:

| Item | Existing evidence; re-confirm before action |
| --- | --- |
| Project | HOMEZONE/homezone; ID 1f8c9007-2993-426c-bbd0-b8dd0a0b17da |
| Environment | staging; ID 2181eadf-21a0-4ca3-8269-b6b6f28af9f4 |
| Backend | HomeZone; service ID ea6ca516-4063-4ed1-be95-bebcc0d1af00 |
| Domain | https://homezone-staging.up.railway.app |
| Database | Owner-intended Postgres-9ZqA; service ID, database name/schema and backend reference unverified |

Dashboard action: select HOMEZONE → staging → HomeZone. Record environment/service IDs from dashboard identity, then Deployments → active deployment → source commit, deployment ID/status and build/deploy logs. Under Settings confirm repository, branch, source root, domain mapping, start/pre-deploy overrides and replicas. Confirm Postgres-9ZqA separately and privately trace DATABASE_URL references for both runtime and migrator to that service/database/schema. A database called railway or an internal hostname alone is insufficient identity proof. Never copy a connection string or variable value into this report.

Compare deployed commit with the approved local baseline using exact SHA/source artifact evidence. Confirm the deployed artifact contains both the route and provider activation code. Do not infer newest source from HTTP status, commit message or a successful catalogue response.

Owner evidence record: project ID ___; staging environment ID ___; backend ID ___; database service ID ___; deployed SHA ___; deployment ID/status ___; intended artifact SHA ___; runtime/migrator same staging database/schema confirmed ___; reviewer/time ___ . All blank entries are unresolved, not verified.

## 3. Source behavior that must be preserved

- `backend/auth.ts:92` registers Credentials provider `mobile-pin` only when AUTH_MOBILE_PIN_ENABLED is literal `true` during module initialization. Missing provider can mean inactive configuration, older/different source or wrong target. The exact live cause is unknown. Missing pepper/table does not selectively hide the provider in this source.
- `src/app/api/mobile/auth/register/route.ts` exports POST only and delegates to `src/lib/auth/mobile-pin-registration.ts`.
- Registration strictly accepts mobileNumber, pin, confirmPin and role; allowed roles USER, OWNER, BROKER, BUILDER, SERVICE_PROVIDER only. Six numeric PIN characters remain strings, including leading zeros. India-normalized unique credentials are not automatically linked to Profile.phone.
- Admission is database-backed and occurs before hashing. Even malformed diagnostic POSTs may write quota state. Do not use POST as a read-only availability probe.
- Salted, peppered, versioned scrypt is implemented in mobile-pin-hash.ts. Account creation is atomic: User(emailVerified null), MobilePinCredential and selected public-role Profile(PENDING). Duplicate/collision acknowledgments do not prove creation and never overwrite/link accounts.
- mobile-pin.ts validates credentials, existing profile and suspension state; mobile-pin-admission.ts applies aggregate admission and per-number failed-attempt budgets. Success does not consume the failure allowance; blocked requests do not extend temporary denial indefinitely.
- Existing Auth.js CSRF/cookies, session-registry issuance/version/expiry/revocation and backend authorization remain authoritative. No new authentication system, OTP or recovery is introduced.
- Flutter MobilePinAuthScreen sends registration then directs to separate sign-in. PasswordAuthProtocol uses CSRF → callback/mobile-pin → independent session request. SignInController persists scoped session credentials, revalidates/restores them and handles logout. Profile confirmation compares selected, session and backend roles; mismatch signs out and does not modify roles.
- Service startup requires explicit staging defines. Preview remains separate. Current staging image/media allowlists remain empty.

## 4. Private configuration checklist

All effective Railway settings are owner-unverified. Check presence, format, scope and cross-replica consistency privately; return compliant/not compliant only. Never print secret values, hashes, PINs, cookies or full URLs containing credentials.

| Variable | Required state / purpose |
| --- | --- |
| DATABASE_URL | Required; confirmed isolated staging database/schema shared by runtime and migration runner. |
| AUTH_SECRET | Required stable high-entropy Auth.js secret, consistent across replicas; secure backup. No development fallback. |
| NODE_ENV | production for deployed Next.js, including staging. |
| AUTH_URL / NEXTAUTH_URL | At least one explicit canonical https://homezone-staging.up.railway.app. AUTH_URL takes precedence; if both exist they must agree, with optional trailing slash only. |
| AUTH_STAGING_ORIGIN | Exact same staging origin; HTTPS, no path/query/fragment/credentials; not either approved production origin. |
| NEXT_PUBLIC_SITE_URL | If used/configured, same staging origin for site links; does not select canonical authentication origin. |
| AUTH_MOBILE_PIN_ENABLED | Keep disabled until dependencies are ready. Literal true enables both provider and registration after an approved process/deployment refresh. |
| MOBILE_PIN_PEPPER_V1 | Required independent high-entropy secret, 32–256 characters, no outer whitespace. Same version-1 material across replicas; back up privately. |
| MOBILE_PIN_RATE_LIMIT_KEY | Required separate high-entropy secret, 32–256 characters, no outer whitespace; consistent across replicas. Rotation changes quota identifier buckets. |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | Optional positive integer; default 5, maximum 20. |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | Optional positive integer; default 900000, maximum 86400000. |
| MOBILE_PIN_GLOBAL_ATTEMPTS | Optional positive integer; default 300, maximum 10000. |
| MOBILE_PIN_GLOBAL_WINDOW_MS | Optional positive integer; default 300000, maximum 3600000. |
| MOBILE_PIN_MAX_ACCOUNTS | Optional positive integer; default 10000, maximum 100000. |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | Optional positive integer; default 5000, maximum 10000. |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | Optional positive integer; default 100, maximum 1000. |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | Optional positive integer; default 3, maximum 10. |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | Optional positive integer; default 10, maximum 100. |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional x-real-ip or x-forwarded-for only after proving ingress overwrites a single valid IP. Without selection, all requests share one conservative ingress bucket. Configured missing/malformed header fails closed. |
| DEMO_LOGIN_ENABLED / DEMO_MOBILE_LOGIN_ENABLED / AUTH_MOBILE_OTP_ENABLED | Review existing demo-provider gates; do not enable demo authentication to bypass PIN failures or alter website/admin behavior. |

No PIN-specific secret-version selector exists: v1 is encoded in the hash and MOBILE_PIN_PEPPER_V1 name. Do not invent a version variable or rotate pepper in place; no recovery/rotation implementation exists. Existing optional LOG_LEVEL/SENTRY_DSN are not PIN activation prerequisites. Fixed stage/category PIN diagnostics exclude raw exceptions and credentials. PIN requires no email/SMS/OTP configuration; independent website requirements remain unchanged.

## 5. Database readiness gate

Review source: prisma/schema.prisma and prisma/migrations/20261030120000_mobile_pin_foundation/migration.sql. There are 21 local migrations; actual staging pending/applied/failed status is not established.

The PIN migration creates:

- MobilePinCredential: primary key, unique userId and normalizedMobile indexes, User foreign key with cascading update/delete, canonical Indian-number and versioned hash-envelope checks.
- MobilePinLoginBudget: primary key, count default/nonnegative check and resetAt index.

It is additive with no data backfill/account merge. Models and DDL align by inspection; that does not validate execution, existing partial objects or PostgreSQL locking. Earlier User/Profile, public role enum, User.sessionVersion and AuthSession dependencies must exist. SQL-only checks must be confirmed from actual catalog evidence. Nullable User email/emailVerified support PIN-only accounts. Inspect legacy phone-collision behavior before choosing the controlled recipient.

Authorized database owner must obtain sanitized complete migration history, including checksums/all attempts/errors, and actual schema definitions. Compare against the exact intended artifact. Record drift/partial effects, permissions, capacity and recoverability. This handover does not authorize collecting database evidence by running queries here.

Required evidence: full reconciled pending set ___; PIN status ___; required constraints/schema confirmed ___; generated deployed Prisma client compatible ___; backup timestamp/retention ___; restore evidence ___; migration window/rollback owner ___ . Missing evidence blocks migration/deployment.

## 6. Ordered activation checkpoints

### A. Confirm service/version

Perform the dashboard identity actions in section 2. Stop if identity, source or database reference is ambiguous. Capture only sanitized metadata. No deployment is authorized by this step.

### B. Prepare approved configuration

Privately stage/check section 4 requirements. Before saving any Railway variable, obtain founder approval listing variable names, target service/environment and any redeployment triggered by the change. Keep PIN disabled while dependencies are missing; do not activate incomplete enrollment. Preserve existing website/admin secrets and production.

### C. Apply only the approved staging pending set

Obtain separate founder approval naming verified database identity/schema, exact pending set, exact runner/artifact and backup/recovery evidence. In the approved staging migration runner with privately verified DATABASE_URL, the repository command is:

```cmd
npm run db:migrate
```

This is `prisma migrate deploy` and applies ALL pending migrations. It is NOT a command to paste into a local shell with unknown environment. Do not execute if history/drift is unresolved, PIN is already applied, or other pending migrations are unreviewed. No reset, db push, resolve or history edits. Inspect resulting migration/schema evidence before proceeding.

### D. Deploy exact reviewed backend with approval

Dashboard: confirmed staging backend → source/deployment controls → choose exact approved artifact/commit. If the UI cannot select the intended source without a push or source-setting change, stop and request that action separately. Do not push main or redeploy an older artifact assuming it contains local source.

Declared pipeline: postinstall `prisma generate`; build `npm run build`; pre-deploy `npm run db:migrate`; start `npm start -- --hostname 0.0.0.0`. Dashboard overrides must be reconciled. Because pre-deploy runs migrations, deployment approval must explicitly include that action or establish the reconciled pending set is empty. Do not modify the pipeline in this handover.

Require fresh generated client and route manifest entry `/api/mobile/auth/register/route` from the approved build. Old local .next artifacts are not staging evidence. After schema/secrets readiness, approve literal true activation and the necessary new process. Record deployment SHA/ID and check every replica; variable changes can trigger deployment themselves.

### E. Confirm provider and route without writes

After separate authorization for public staging verification, Windows CMD commands:

```cmd
curl.exe --silent --show-error --max-time 15 --max-redirs 0 https://homezone-staging.up.railway.app/api/auth/providers
curl.exe --silent --show-error --max-time 15 --output NUL --write-out "HTTP %{http_code}\n" https://homezone-staging.up.railway.app/api/mobile/auth/register
```

These do not follow redirects or send credentials. Inspect provider IDs and staging callback host only; do not capture cookies or credentials. Require mobile-pin present, and GET registration 405 consistent with the deployed POST route. Correlate UTC/request ID with the approved deployment. Provider absence requires investigation, not bypassing protections.

A route accepting POST can only be verified meaningfully with an approved POST. Do not issue a dummy, malformed or duplicate POST as a read-only check; quotas can be written before validation. Combine POST verification with the authorized single enrollment below.

### F. Controlled registration — explicit write approval

Founder approval must name one owner-controlled unused +91 test identity (kept private), role USER initially, account/profile/credential creation, quota writes, AuthSession creation/revocation and device execution. Never put the PIN in chat, shell arguments, logs or documents. No OTP is sent; possession is not proven. Additional roles/accounts, duplicates and incorrect-PIN trials require explicit scope approval.

Use the existing installed staging APK only if provenance matches the reviewed contract. Otherwise request approval for a staging-configured build/install first; existing repository packaging command, run from mobile-app, is:

```cmd
node scripts/build-android.mjs --mode service --config config/staging.local.json
```

This command builds an APK and is NOT authorized by this handover. An alternative Flutter build/run also requires explicit staging defines and separate authorization; do not run a default offline-preview launch.

On device: select Buyer → Create a new account → enter private mobile/PIN/confirmation → submit once. Required POST contract:

```text
POST /api/mobile/auth/register
JSON: mobileNumber:string, pin:string, confirmPin:string, role:"USER"
```

Expected valid acknowledgment: HTTP 200 with generic message. It applies to new or existing/colliding identities and is not proof of creation. Invalid input 400; origin rejection 403; quota 429 with Retry-After; disabled/dependency failure 503. Capture sanitized status/category/timing and UI only, no request body/private fields. Transport uncertainty: try sign-in before any new registration; do not automatically retry creation.

### G. Verify login, profile and role

In the same staging app, sign in with the same private credentials and selected Buyer role. Existing protocol must perform GET /api/auth/csrf → POST /api/auth/callback/mobile-pin (phone, pin, CSRF and callback fields) → independent GET /api/auth/session → GET /api/mobile/account?view=profile. Do not manually create cookies or use registration acknowledgment as session proof.

Acceptance: actual Flutter action reaches staging; session authenticated; profile belongs to that session and has USER role; proper dashboard visible. Record redacted role/state, UTC/request IDs and Android screenshot with personal information hidden. Never export session JSON, cookie headers or PIN. Selected-role mismatch must not alter the account role or expose a protected dashboard. Incorrect-PIN trial consumes budgets and needs approved scope; generic rejection is expected.

### H. Verify restart restoration

With device execution authorized, close/reopen HomeZone without clearing data or reinstalling. Existing secure vault loads only this environment/origin's credentials; server independently confirms session and profile. Require same account/role dashboard, not local-only navigation or renewed registration. Record actual Android presentation and sanitized request results. Do not mistake hot reload for process restart.

### I. Verify logout and revocation

Use existing app Logout. Confirm CSRF/signout exchange and successful server revocation, local protected state removal and unauthenticated entry. A subsequent protected profile request through the existing client must be denied/not sent as authenticated; restart must not restore the logged-out identity. If revocation fails, record failure and do not report logout verified merely because UI disappeared. Any server-side session record inspection requires separately approved owner access.

## 7. Rollback and stop conditions

Before rollout identify prior compatible staging deployment ID/SHA and preserve configuration/secret backups privately. On failure, stop new enrollment/trials; obtain approval to disable PIN or restore the identified compatible staging deployment. Account for Railway's pre-deploy migration behavior during rollback too. Do not drop tables, remove accounts, reverse history, change pepper v1 or reset Auth.js secrets. Preserve hashes, quotas and revocation registry. Disabling provider does not revoke issued sessions; revocation is a separate approved write. Never substitute demo authentication.

Stop on target mismatch, unreviewed pending migration/drift, missing recovery evidence, incompatible client, provider absence, non-staging redirect, account/profile mismatch or secret exposure. Investigate sanitized stage/category diagnostics; do not weaken origin/TLS/CSRF checks.

## 8. Handover completion record

| Checkpoint | Current status | Evidence required to close |
| --- | --- | --- |
| Local PIN/mobile source | SOURCE IMPLEMENTED | Reviewed current SHA recorded above |
| Exact deployed target/version | BLOCKED | Dashboard identity + SHA/domain mapping |
| Config compliance | BLOCKED | Owner private compliance checklist |
| PIN schema/client | BLOCKED | Reconciled history/catalog + generated artifact |
| Provider/route | NOT VERIFIED AFTER ACTIVATION | Provider present; deployed POST route and approved successful trial |
| Account registration/login | NOT VERIFIED AT RUNTIME | Actual Flutter action, backend/session/profile and UI evidence |
| Role/dashboard | NOT VERIFIED AT RUNTIME | Matching backend profile/session and displayed dashboard |
| Restoration/logout | NOT VERIFIED AT RUNTIME | Actual restart, server validation and revocation evidence |

No activation or authentication success is claimed. Only this document was created; no source/configuration modifications, live requests, database access/writes, migrations, builds/tests, account operations, production access, deployments, commits or pushes occurred during this handover.

Next founder action: approve gathering/providing sanitized staging identity, version and database/configuration readiness evidence. Operational activation approvals follow only after those checkpoints are reviewed.
