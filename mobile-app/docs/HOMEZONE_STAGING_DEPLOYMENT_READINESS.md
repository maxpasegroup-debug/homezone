# HOMEZONE staging backend deployment readiness — milestone 3

Reviewed 2026-10-30. **HOLD: target/configuration/database evidence incomplete.**
Read-only investigation; this report does not authorize any live change.

## 1. Identity and version evidence

| Item | Finding | Confidence / boundary |
|---|---|---|
| Intended Railway project | HOMEZONE/homezone, per owner context | Current Railway project membership/configuration not independently verified |
| Historical project ID | 1f8c9007-2993-426c-bbd0-b8dd0a0b17da | From the supplied October 29 staging dashboard screenshot; not current target proof |
| Intended environment | staging | Current environment ID unverified |
| Historical staging environment ID | 2181eadf-21a0-4ca3-8269-b6b6f28af9f4 | Supplied historical dashboard URL only |
| Historical backend service/name | HomeZone; ea6ca516-4063-4ed1-be95-bebcc0d1af00 | Historical screenshot/context; current domain-to-service mapping must be confirmed |
| Approved public backend origin | https://homezone-staging.up.railway.app | Owner-selected origin; current read-only HTTP responses observed |
| Current local source | main, 9f45e985c06168fe3f398ad6174e7607ab718fef | Clean working tree at investigation start; committed 2026-10-30T12:41:14+05:30, feat(auth): implement mobile PIN authentication and registration flow |
| Actual deployed commit/deployment ID | UNKNOWN | Local commit existence does not establish push, deployment, build or live version |
| Current deployment status | Public endpoints responding; Railway deployment status UNKNOWN | HTTP response does not prove dashboard deployment-success status or all replicas/DB health |
| Declared builder/build | RAILPACK; npm run build -> next build | railway.json/package.json; effective dashboard overrides, source root and build logs unverified |
| Declared predeploy | npm run db:migrate -> prisma migrate deploy | Runs all pending migrations; exact pending set unverified |
| Declared start | npm start -- --hostname 0.0.0.0 -> next start --hostname 0.0.0.0 | Repository declaration, not observed effective Railway command |

No Railway CLI was found in PATH, no local .railway project metadata was found,
and no Railway connector was available. Native computer-use could not connect;
browser inventory contained no connected browser. No authenticated Railway
dashboard, variable metadata or current deployment logs could be inspected.
No credential files or secret environment files were read as a substitute.

## 2. Refreshed staging HTTP evidence

GET only; redirects disabled; no cookies/request credentials supplied or retained.
No registration POST, authentication attempt or database operation was performed.

| UTC observation | Endpoint | Result | Railway request reference |
|---|---|---|---|
| 2026-10-30T07:14:58.852Z | /api/auth/providers | 200; mobile-pin absent | fcXOTDSVTDGAy3GinTga3g |
| 2026-10-30T07:14:59.311Z | /api/mobile/auth/register | **405**, not the earlier 404 | Lbqzqy4HQJ67yUs055So4g |

The 405 is consistent with a POST-only route now being available. It does NOT
prove that this exact commit is deployed, that the POST handler can create accounts,
that its feature flag is enabled, or that PIN tables/secrets exist. It supersedes
the older 404 as the latest observation. The cause/time of the earlier 404 cannot
be established without deployment history and routing evidence.

## 3. Missing mobile-pin provider: source cause versus live explanation

backend/auth.ts:92 includes the Credentials provider only if
process.env.AUTH_MOBILE_PIN_ENABLED === "true" when the module initializes.
Provider id is mobile-pin. It reuses existing Auth.js JWT/session/revocation
callbacks and the same catch-all endpoint as website providers.

| Possible cause | Source/evidence assessment |
|---|---|
| Flag unset, false, misspelled/cased or whitespace-padded | **SUPPORTED hypothesis.** Any value other than literal true omits the provider in this source. Effective value not inspected |
| Flag changed after process initialized / different replica configuration | Possible; providers are constructed at initialization. Current replica/start/version/config metadata required; no restart attempted |
| Older/different Auth.js bundle | Possible; live deployed SHA/artifact unknown. GET registration now returning 405 weakens a blanket claim that all PIN code is absent but does not identify the Auth.js bundle |
| Missing PIN pepper/rate-limit key | Required for enrollment/login operations, but **not a provider-list registration condition**. These alone do not explain absence with the reviewed source and flag true |
| Missing PIN tables or failed migration | Would cause authentication/storage failures, but provider registration/listing does not query these tables. Provider absence is not evidence that the DB is broken |
| Missing/invalid general Auth.js/environment configuration | Can cause initialization errors; current providers 200 does not verify all configuration. No code selectively hides only PIN on a pepper/schema error |
| Wrong domain/service, stale artifact, routing or mixed deployments | Still unresolved until Railway domain mapping, root/source commit, build/start commands and replica state are confirmed |

**Exact live cause remains UNCONFIRMED.** If the infrastructure owner verifies
this exact Auth.js source is serving the request, the supported explanation is
that the provider was initialized without the literal-true feature flag. Do not
claim the flag is missing or enable it before schema/secret readiness is proved.

## 4. Registration route and build inclusion

- src/app/api/mobile/auth/register/route.ts exists in committed HEAD; Node runtime,
  force-dynamic, exports POST = mobilePinRegistration. It does not export GET.
- Handler is src/lib/auth/mobile-pin-registration.ts:59. With the current route,
  flag off returns 503 on POST, not a deliberate 404. Invalid fields/origin/quota
  produce 400/403/429. None should be tested through POST during this review.
- middleware.ts:41 exempts the exact registration path from session-required
  mutation admission; the handler owns origin/quota checks. No middleware rewrite
  or deliberate 404 for this route was found. next.config.ts defines no rewrites.
- Catch-all src/app/api/auth/[...nextauth]/route.ts re-exports the existing backend
  Auth.js handlers; no separate PIN login route file is required.
- Existing **local** .next build is stale: BUILD_ID zckuAMkxiE_LLTqCdSd3I;
  BUILD_ID timestamp 2026-10-24T06:36:53Z, app-paths manifest timestamp
  2026-10-24T06:35:27Z. Both inspected route manifests omit the PIN registration
  route while containing the Auth.js catch-all. This confirms that this local
  artifact does not represent current source, not that Railway runs that artifact.
- No new Next.js production build was run in this review. Current source follows
  normal App Router placement, but inclusion in the actual deployed production
  build must be checked in its build output/manifest. Inspect effective source
  root, .next artifact freshness, exact SHA and build logs, rather than running
  next start against a stale local build.
- .github/workflows/ci.yml runs checks/builds for main/master and PRs; no Railway
  deployment action is declared there. Railway GitHub autodeploy configuration,
  branch binding and push/deployment status cannot be inferred from that workflow.

## 5. Staging configuration checklist — names and requirements only

All effective Railway settings below are **UNVERIFIED**. Owners must check presence,
shape and consistency privately; never export variables or paste secret values.

| Variable | Purpose / required relationship |
|---|---|
| DATABASE_URL | Required PostgreSQL target; runtime and migrator must reference the independently confirmed isolated staging database/schema |
| AUTH_SECRET | Required stable high-entropy Auth.js secret across replicas; signs/encrypts JWT sessions. No separate PIN session-signing secret. Shared env validation minimum 16 characters is not an entropy guarantee; use approved random secret provisioning |
| NODE_ENV | Deployed Next.js staging uses production runtime behavior; do not use development fallback secrets |
| AUTH_URL / NEXTAUTH_URL | Explicit canonical staging HTTPS origin; AUTH_URL takes precedence. If both exist they must agree after permitted trailing slash normalization. NEXTAUTH_URL is also used by broader environment readiness checks |
| AUTH_STAGING_ORIGIN | Explicit approval of the same separate staging HTTPS origin; rejects both production origins, paths, credentials, queries/fragments |
| NEXT_PUBLIC_SITE_URL | If configured, keep staging public links consistent; not a replacement for canonical auth settings |
| AUTH_MOBILE_PIN_ENABLED | Literal true includes mobile-pin at initialization and enables registration; keep inactive until dependencies verified and activation separately approved |
| MOBILE_PIN_PEPPER_V1 | Required for hash/verify; independent high-entropy 32–256 characters, no outer whitespace, consistent across replicas; secure recovery custody. Only v1 supported |
| MOBILE_PIN_RATE_LIMIT_KEY | Separate required HMAC secret with same shape rules; purpose-separated login/registration identifiers. Rotation changes protection buckets |
| MOBILE_PIN_ACCOUNT_ATTEMPTS | Optional positive integer <=20; default 5 failed logins |
| MOBILE_PIN_ACCOUNT_WINDOW_MS | Optional positive integer <=86400000; default 900000 |
| MOBILE_PIN_GLOBAL_ATTEMPTS | Optional positive integer <=10000; default 300 total login attempts |
| MOBILE_PIN_GLOBAL_WINDOW_MS | Optional positive integer <=3600000; default 300000 |
| MOBILE_PIN_MAX_ACCOUNTS | Optional positive integer <=100000; default 10000 number-failure rows |
| MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR | Optional positive integer <=10000; default 5000 raw requests |
| MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR | Optional positive integer <=1000; default 100 admitted valid attempts |
| MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR | Optional positive integer <=10; default 3 |
| MOBILE_PIN_REGISTRATION_IP_PER_HOUR | Optional positive integer <=100; default 10 |
| MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER | Optional x-real-ip or x-forwarded-for only after proving ingress overwrites it with one valid IP. Unset shares one conservative bucket; a forwarding chain/malformed configured header fails closed |
| DEMO_LOGIN_ENABLED / DEMO_MOBILE_LOGIN_ENABLED / AUTH_MOBILE_OTP_ENABLED | Privately confirm real-account verification cannot use demo providers; mobile-demo registration is directly gated by AUTH_MOBILE_OTP_ENABLED. Preserve website/admin authentication |
| LOG_LEVEL / SENTRY_DSN | Existing optional logging/monitoring settings; not PIN feature gates. Fixed PIN stage/category console diagnostics do not require a new variable and are not controlled by LOG_LEVEL |
| HOMEZONE_ENFORCE_ENV | Existing wider runtime/readiness audit setting; inspect applicable application-wide requirements without equating unrelated integrations to PIN requirements |

PIN does not call SMS/email/OTP delivery or require OTP_PEPPER, sender/Resend/SMTP
configuration. Existing website/recovery services may independently need them.
Never remove existing website/admin settings as a PIN workaround. Do not change
v1 pepper in place: hash parser and SQL constraint require an approved versioned
transition before future rotation. Do not enable arbitrary hosts or weaken CSRF.

## 6. Deployment prerequisites, rollback and approvals

1. Owner confirms current project/environment/backend/database IDs, deployed SHA,
   deployment ID/status and domain mapping. Historical identifiers above are only
   leads; never use them as proof of the target for a write.
2. Reconcile the exact source artifact and complete migration history/schema;
   companion HOMEZONE_STAGING_DATABASE_READINESS.md specifies required evidence.
   No migration is authorized merely because commit 9f45e98 is present locally.
3. Prove recoverability, runtime/migrator permissions, capacity/lock budgets and
   actual schema before presenting the exact pending migration action for approval.
4. Privately validate required variables. Request separate founder approval for
   each intended staging configuration change, listing names/purposes only.
5. Request separate deployment approval for the confirmed staging service/artifact,
   source/provider/route changes, ALL automatic predeploy migrations and rollback.
   Do not push main or assume production cannot autodeploy from the same branch.
6. Rollback must retain credential tables/accounts/keys and migration evidence;
   revert to an identified compatible artifact or separately approved disablement.
   Do not drop PIN data, reset migration history, rotate pepper, or silently restore
   weaker/demo authentication. Existing sessions and revocation remain significant.
7. After deployment, obtain separately approved account/quota/AuthSession write
   scope for an owner-controlled test number/PIN and role journeys. No OTP or real
   account test was performed now.

Only this report and HOMEZONE_STAGING_DATABASE_READINESS.md were created. No source,
schema, settings, tests/builds, migrations, direct database access, account/OTP,
production, deployment, commit or push operations occurred. Existing work preserved.
