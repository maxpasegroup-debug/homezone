# Phase 1 — authentication implementation readiness

## Latest slice: email/password sign-in and session integration, 2026-10-30

**IMPLEMENTED BUT RUNTIME UNVERIFIED.** This section supersedes older sign-in
handoff assumptions below. No compilation, tests, device or live authentication
verification is authorized or claimed for this slice.

### Existing foundation reused (VERIFIED IN SOURCE)

- `src/app/api/mobile/auth/email-register/route.ts` delegates to
  `src/lib/auth/web-registration.ts`: normalized lower-case trimmed email,
  unchanged password, existing salted scrypt hash, atomic selected-public-role
  account creation and generic duplicate acknowledgment. Registration does not sign in.
- `backend/auth.ts` credentials provider `password` normalizes email the same way
  and verifies the same password hash. It rejects suspended profiles; no OTP or
  email-verification requirement was added. PIN and website/admin providers retained.
- `mobile-app/lib/core/api/password_auth_protocol.dart` already obtains CSRF,
  submits the form callback to `/api/auth/callback/password`, then independently
  verifies `/api/auth/session` through the existing cookie coordinator/transport.
- `sign_in_controller.dart`, `session_vault.dart`, native Android/iOS secure storage
  and `main.dart` already persist scoped session credentials, independently verify
  restoration, expire/revalidate sessions and use CSRF signout plus server registry
  revocation. Passwords are not stored. Storage failure retains only in-memory access;
  a transient restore failure clears local access. These policies are unchanged.

### Changes in this slice (VERIFIED IN SOURCE)

1. `app/homezone_app.dart` and `features/auth/auth_screens.dart` pass the same
   MarketplaceRepository/session owner to the existing email Sign In form.
2. `features/marketplace/marketplace_repository.dart` extracts `confirmedProfile()`
   from the dashboard gate: protected GET `/api/mobile/account?view=profile`, same
   generation/account/session-role checks, supported role and nonsuspended status.
   The backend scopes this response to the authenticated actor. Public registration
   still permits only USER/OWNER/BROKER/BUILDER/SERVICE_PROVIDER; existing admin
   routing remains the protected web-admin handoff.
3. `features/auth/auth_form_screen.dart` keeps loading/duplicate-submit protection
   through credentials, independent session verification, profile confirmation and
   optional selected-role comparison. Credentials are passed directly to the existing
   controller, not stored in route arguments. Selected registration role is journey
   context only; login never mutates database roles. Mismatch/profile failure refuses
   dashboard navigation and attempts existing logout; cleanup uncertainty is reported.
   Route/attempt guards discard stale completions, and leaving profile confirmation
   clears only the captured local session. No automatic account creation or retry.
4. `features/auth/profile_dashboard_gate.dart` reuses the profile check after restore.
   Its Sign in again action now calls existing logout before navigating; previously
   an active session could redirect that action straight back to the failed gate.
   It guards repeated actions and reports unconfirmed server/device cleanup.

### Remaining acceptance gates (UNKNOWN / INCOMPLETE)

Authorize later compilation and focused checks; then controlled staging account
verification must demonstrate native signup acknowledgment -> separate email login ->
session/profile/role -> dashboard, bad password/network/429, role mismatch, suspension,
true process restart, expiry/revocation and logout including failure paths. No deployed
artifact, effective configuration, schema or secure-storage behavior verified here.
No new provider, variable or migration. Existing DATABASE_URL, AUTH_SECRET,
PASSWORD_SIGNIN_HMAC_KEY, canonical origins and compatible PasswordCredential,
Profile, AuthSession and quota schema remain activation prerequisites.

Approved Terms/Privacy content and durable versioned consent remain missing; native
recovery/social integration remains incomplete. Checkbox validation does not establish
recorded legal consent. Phase0 remains PENDING separately. No backend, PIN, schema,
website/admin auth or infrastructure change in this slice. Stop for founder review.

## Prior slice — native email registration with public roles, 2026-10-30

SOURCE IMPLEMENTED, RUNTIME UNVERIFIED. The prior native-signup contract gap is
closed in source: POST /api/mobile/auth/email-register delegates to the existing
web-registration service through a server-selected native mode. No second password
hash/session system. Browser endpoint retains required exact Origin, strict original
body, default USER, existing namespace and response. PIN infrastructure unchanged.

Native strict JSON: name(2–120 trimmed), email(normalized lowercase,valid,<=254),
password(existing8–128/complexity rules), role(USER/OWNER/BROKER/BUILDER/SERVICE_PROVIDER),
termsAccepted:true. No public admin or client-supplied associations. Missing native
Origin allowed, provided Origin must match canonical auth origin; cross-site denied.
Only exact route exempted from middleware's session-required mutation classification;
handler retains origin checks, bounded4KiB JSON and database admission before hashing.

Existing scrypt/Prisma transaction/duplicate helper reused. Atomic User(name,email,
emailVerified:null), PasswordCredential and Profile(fullName,validated public role).
Existing case-insensitive User email uniqueness must be deployed; generic200 duplicate
ack never overwrites credentials or roles. Native quotas separate namespace:5000 raw
requests/hour,100 attempts/hour,3 per normalized email/hour,60second cooldown. Uses
existing PASSWORD_SIGNIN_HMAC_KEY with namespace separation and bounded cleanup.

Flutter SignUpScreen receives the same MarketplaceRepository, sends exact fields
through existing transport/coordinator, checks acknowledgment, prevents repeat submits
and never creates trusted identity. Success/uncertain outcomes offer existing password
Sign In with selected role. Registration does not auto-login. Errors are sanitized;
late responses cannot publish into a newer session/navigation generation.

Consent gap remains: no approved policy documents/versions or dedicated consent
architecture exists in inspected source. Server validates checkbox acknowledgment only;
no durable/versioned legal consent stored or falsely claimed. Native response explicitly
includes consentRecorded:false, also for duplicates. UI explains limitation. Do not treat
checkbox validation as proof of informed legal acceptance or policy version coverage;
approved legal content/retention architecture remains a release prerequisite. No schema,
AuditLog consent record or policy text/version invented. No new migration proposed.

Required existing config: DATABASE_URL,AUTH_SECRET,PASSWORD_SIGNIN_HMAC_KEY and explicit
canonical auth origin (staging AUTH_URL/NEXTAUTH_URL/AUTH_STAGING_ORIGIN consistency).
Native email signup has no MOBILE_PIN activation/pepper,OTP or email-provider dependency.
Existing 20261024000000_email_registration supplies RegistrationBudget and the
User_email_normalized_key lower(email) unique index; password/session prerequisites
must also be present. Their live application status is not established here.
Current effective config/schema/client and runtime remain UNKNOWN, Phase0 PENDING.
No requests, accounts, DB access, migrations, settings, credentials, deployments,
restarts, tests/builds/device operations, commits or pushes. Stop at this source slice.

## Latest founder requirement — email Create Account UI, 2026-10-30

This supersedes earlier PIN-only mobile UI statements below: Create Account must
use Full name, Email, Password and Terms/Privacy acceptance. Existing PIN foundation,
website/admin authentication and prior source changes remain intact. No OTP introduced.

Current review slice reuses existing email AuthFormScreen/PasswordAuthProtocol and
restores welcome→email sign-in and role→email signup navigation. Role context survives
signup→sign-in push/back; optional selected-role mismatch signs out without role changes.
Service signup/recovery are explicitly INCOMPLETE and send nothing, rather than running
local preview success. Full status in HOMEZONE_COMPLETE_AUTHENTICATION_UI_AUDIT.md.

Next slice: define native-compatible no-OTP email registration with server-validated
public roles and approved legal/consent contract, reusing existing password/quota/atomic
creation infrastructure. Browser web-signup is strict-Origin/name-email-password and
creates USER; do not weaken it or silently reuse it for non-USER native registration.
Approved Terms/Privacy content and consent handling are missing inputs; no storage or
policy invented. Secure native recovery and social OAuth remain later incomplete work.
No backend/schema/infrastructure change or runtime verification in this UI slice.

Date: 2026-10-30. Source baseline: main/09a39de3888772c2ca712355a16f89d2c379a392.

**Phase 0 is PENDING by founder decision. It is not a blocker to Phase 1 source implementation.** Infrastructure access, secret rotation, migration/deployment and live authentication remain separate operational approval gates.

## Implementation progress — registration slice, 2026-10-30

- VERIFIED by source inspection: reused POST /api/mobile/auth/register and the existing
  MobilePinAuthScreen request {mobileNumber,pin,confirmPin,role}. No new endpoint/model,
  OTP, email requirement, account approval or auth architecture was needed.
- Corrected a concrete boundary defect in src/lib/auth/mobile-number.ts: JavaScript's
  end anchor can match before a final line break. isMobilePin now requires length6,
  mobile normalization rejects any character outside approved ASCII number/separator
  set and requires exactly10 national digits. Leading-zero PINs remain strings.
- src/lib/auth/mobile-pin-registration.ts explicitly bounds pin/confirmPin to length6
  before shared validation; mobile_pin_auth_screen.dart uses the aligned number rule.
- Existing normalized uniqueness, public-role allowlist, salted scrypt, admission before
  KDF and atomic User/Profile/MobilePinCredential creation retained. New emailVerified
  remains null, selected role persisted, no public admin/teams/associations accepted.
- Existing duplicate/concurrent collision handling is a safe no-op/generic200
  acknowledgment, not proof of creation. No overwrite or reset, no account enumeration
  response introduced. Flutter keeps clear submitted/uncertain outcomes and separate
  Continue to sign-in; no account-creation retry or implicit authentication added.
- Added source regression cases in tests/mobile-pin-registration.test.mjs for PIN/mobile
  line-break/control-character boundaries and route400/no account creation. NOT RUN.
- UNKNOWN: compilation and runtime results. No checks/builds/tests, requests, accounts,
  databases, migrations or infrastructure changes. Existing work preserved.

Environment dependencies remain existing DATABASE_URL, AUTH_SECRET, canonical Auth.js
URL settings/staging override, AUTH_MOBILE_PIN_ENABLED, MOBILE_PIN_PEPPER_V1 and
MOBILE_PIN_RATE_LIMIT_KEY plus optional existing quota settings. No values inspected
or new variables introduced. Existing migration20261030120000_mobile_pin_foundation
and session/profile prerequisites suffice by source inspection; no new migration.
Deployment/schema/secret compliance remains separate pending Phase0 activation work.

## Implementation progress — admin compatibility slice, 2026-10-30

- VERIFIED by source inspection only: first slice added canonical mobile search/display.
- VERIFIED by source inspection only: admin users and listing-owner queries now select
  credential presence using existing relations (password credential id, mobile canonical
  number only), and both AdminUserPanel callers pass booleans rather than credentials.
- VERIFIED by source inspection only: PIN-only accounts no longer show the website
  password action; accounts with website passwords, including dual-credential accounts,
  retain it. Non-PIN accounts retain their existing action. Labels explicitly distinguish
  website passwords, mobile PINs, Login mobile and Contact phone. No PIN recovery added.
- VERIFIED by source inspection only: admin password route query narrowed to profile
  id/userId and user email. Hashing, authorization, PasswordCredential update/upsert and
  session revocation behavior remain unchanged; MobilePinCredential is not read/written.
- UNKNOWN: compile/runtime behavior; no builds, tests, type checks or live operations run.
- Remaining decision: backend restriction of website-password enrollment for PIN-only
  accounts still requires separate policy approval. UI capabilities are not server
  authorization; direct authorized calls retain existing route behavior.
- Remaining source task: stale mobile marketplace email-verification help copy; outside
  this admin-only compatibility slice. Earlier audit findings below describe baseline
  behavior where explicitly noted; completed steps are recorded here.

## Classification and evidence

- VERIFIED: behavior confirmed by inspected source or explicitly identified historical evidence, not a runtime success claim.
- INCOMPLETE: implementation exists but a confirmed compatibility/UX gap remains.
- MISSING: required or deliberately deferred capability not found in relevant inspected source.
- UNKNOWN: deployed configuration/schema/behavior or unresolved policy cannot be established from available evidence.

Reviewed existing PIN audit/implementation plan, foundation/review/security decisions, role-based authentication audit, complete connectivity audit, staging readiness/deployment identity/activation handover and Phase0,0.2,0.3,0.4 reports. Older reports' default-USER-only signup, mobile OTP and prior source baselines are superseded by actual selected-public-role PIN implementation. Latest Phase0.2 evidence supersedes earlier production-callback observation: staging callback URLs were corrected at09:52 UTC, but PIN provider remained absent then. No live request repeated here.

Fresh source inspection covers Flutter role/PIN/screens/controllers/protocol/profile gate, Auth.js authorizer/registration/session services, Prisma models/migration, admin user list/query/panels/mutation routes, admin guard and validators. Prior untracked Phase0.2/0.3/0.4 reports preserved; no source or configuration changed. No tests/builds/device/database/account operations.

## 1. Existing implementation inventory

| Finding | Classification | Exact source and behavior |
| --- | --- | --- |
| One service API/session architecture | VERIFIED — source | mobile-app/lib/main.dart; core/api/api_client.dart, api_transport.dart, cookie_request_coordinator.dart, password_auth_protocol.dart; one ApiClient + IoApiTransport graph and MarketplaceRepository. No replacement needed. |
| Explicit staging selection | VERIFIED — source | mobile-app/config/staging.local.json, core/api/api_configuration.dart, scripts/service-config.mjs; staging origin-only HTTPS, API enabled. main.dart defaults preview without compile defines. Runtime selection UNKNOWN. |
| Role-first entry | VERIFIED — source | features/auth/role_screen.dart, role_first_auth_screen.dart; Buyer→USER, OWNER,BROKER,BUILDER,SERVICE_PROVIDER; no public admin. |
| Compact sign-in/create-account navigation | VERIFIED — source | mobile_pin_auth_screen.dart opens sign-in after selection, create-account link retains role, Back supported. Preserve latest UX; no new chooser page. |
| PIN registration/login forms | VERIFIED — source | MobilePinAuthScreen validates Indian number and exactly6 ASCII digits as strings; confirmation match on signup; captures submitted credentials, duplicate-submit/loading/navigation guards. No OTP/email/password in active service flow. |
| PIN registration endpoint | VERIFIED — source | src/app/api/mobile/auth/register/route.ts POST → src/lib/auth/mobile-pin-registration.ts. Existing contract reused. |
| PIN provider and authentication | VERIFIED — source | backend/auth.ts:92 mobile-pin gated by literal AUTH_MOBILE_PIN_ENABLED=true; mobile-pin.ts resolves canonical credential, verifies hash, profile/suspension/sessionVersion and rechecks binding. |
| Hashing/brute-force protection | VERIFIED — source | mobile-pin-hash.ts versioned salted peppered scrypt; mobile-pin-admission.ts DB aggregate + per-number failed budgets; independent registration quotas. Actual PostgreSQL concurrency/capacity UNKNOWN. |
| Sessions and role authority | VERIFIED — source | Auth.js JWT + AuthSession registry in session-registry.ts; backend profile role loaded in callbacks. Session version, expiry/revocation/suspension checks. |
| Profile and role dashboard routing | VERIFIED — source | GET /api/mobile/account?view=profile; MobilePinAuthScreen compares profile/session/selected role; ProfileDashboardGate; app/homezone_app.dart. USER marketplace, other roles shared WorkspaceScreen; backend authorization authoritative. |
| Secure persistence/restart/logout | VERIFIED — source | core/api/session_vault.dart, Android SessionVaultBridge.kt, SignInController; scoped OS-protected credentials; CSRF signout and registry revocation. Runtime behavior UNKNOWN. |
| Separate fictional preview | VERIFIED — source | /buyer-preview, features/buyer/* demo data; retained auth_form_screen.dart/recovery preview paths not active PIN auth. Do not delete. |
| Admin user list integration for PIN identity | VERIFIED — source slice completed | Canonical MobilePinCredential.normalizedMobile search/display and credential capabilities now included without hashes; runtime UNKNOWN. |
| PIN recovery | MISSING — intentionally deferred | No Forgot PIN, OTP recovery or admin PIN-reset implementation. Do not implement now. |
| Deployed complete authentication journey | UNKNOWN | Last observed mobile-pin absent; no controlled account/device journey verified. Phase0 pending does not prevent source work. |

## 2. Backend/Flutter contracts to preserve

| Step | Contract / implementation | Classification |
| --- | --- | --- |
| Registration | POST /api/mobile/auth/register strict bounded JSON {mobileNumber:string,pin:string,confirmPin:string,role:public enum}. Indian number normalized +91;6digits preserve leadingzeros. | VERIFIED — source |
| Account creation | User(emailVerified:null), MobilePinCredential(normalizedMobile unique,userId unique,pinHash), Profile(selected role,PENDING,whatsappVerified:false) in one transaction. No public teams/org/admin assignment. | VERIFIED — source |
| Duplicate/collision | Generic200 acknowledgment, no overwrite/link. Legacy Profile.phone collision declines enrollment without linking; acknowledgment not proof of creation. | VERIFIED — source; live race behavior UNKNOWN |
| Registration errors | 400 invalid fields/body;403 origin/security;429 quota with Retry-After;503 disabled/config/dependency; safe generic messages and stage/category diagnostics. | VERIFIED — source |
| Login | GET /api/auth/csrf → POST /api/auth/callback/mobile-pin form fields phone,pin,csrfToken,callbackUrl → independent GET /api/auth/session. | VERIFIED — source |
| Actual role | GET /api/mobile/account?view=profile; compare profile with authenticated session and selected role. Mismatch signout/message, no role update. | VERIFIED — source |
| Restart/logout | Scoped secure credentials → independently verify saved session; signout with CSRF, registry revocation and local clearing; user warned if server revocation unconfirmed. | VERIFIED — source; actual native/server outcome UNKNOWN |

Account approval is not required: Profile.PENDING is verification metadata accepted by dashboard gate; PIN login rejects SUSPENDED, not simply PENDING. Existing listing/provider-business verification is separate policy and must not be bypassed to make registration appear functional. No active mobile OTP or email verification should be added. Existing website/admin authentication and legacy backend endpoints remain intact.

## 3. Admin integration: confirmed source gaps

### A. Canonical mobile identity — first source slice completed

- Baseline getAdminUsers filtered Profile.fullName,phone,city and User.email only.
- The first implemented slice now includes normalized canonical mobile search and a
  read-only Login mobile display separately from Contact phone, with no hashes selected.
- PIN registration creates no User.name/email and no Profile.fullName/phone, only credential identity plus role/defaults. Consequently new PIN users can list with role/status but generic label and no login number; searching canonical mobile cannot find these fresh users unless a separate contact profile happens to match.

Required smallest correction: authorized admin-only query selects user.id plus mobilePinCredential.normalizedMobile (never pinHash), exposes a distinct read-only login-mobile display/search field, retaining separate editable contact phone and existing email search. Reuse normalizeMobileNumber for canonical number search when valid; retain bounded existing textual search semantics and role/status filters. Do not backfill Profile.phone or use it as credential identity. Use a deliberate projection/presentation mapping, not user:true/credential:true. This requires no public API change.

### B. Password action — compatibility UI completed; server policy pending

- Before this slice, AdminUserPanel rendered Admin password reset for every profile.
  It now receives explicit credential booleans and hides the action for PIN-only users,
  while preserving website password behavior for other accounts and stating PIN recovery
  is unavailable. Both users and listing-owner callers supply the capability context.
- backend/api/admin/users/[id]/password/route.ts uses hashPassword/changePassword; session-registry.ts changePassword upserts PasswordCredential and revokes sessions. It does NOT change MobilePinCredential.pinHash. Calling it on a PIN-only user can create an additional website-password credential and invalidate sessions without recovering the PIN.

Required source correction: provide explicit credential-capability context to shared panel and explain that website password reset does not reset mobile PIN; hide/disable that action for confirmed PIN-only accounts while preserving password-based website users. No replacement PIN-reset action. Both callers must be accounted for: src/app/admin/users/page.tsx and src/app/admin/listings/[id]/page.tsx (via getAdminListing query in operations.ts). Unknown capability should not display a misleading reset promise.

Server policy decision: whether to reject password-enrollment attempts for PIN-only accounts at existing password route. A UI guard is not authorization; current route explicitly supports password upsert. Changing that behavior needs owner acceptance to preserve website/admin policy. Recommended narrow policy is to reject PIN-only password reset with a safe response while leaving existing PasswordCredential reset unchanged; do not implement until scoped approval. Dual-credential users must retain existing website password behavior and PIN remains unchanged.

### C. Admin authorization and account controls — VERIFIED source; policy risks UNKNOWN

src/app/admin/layout.tsx/users/page.tsx call requireAdminProfile; src/lib/auth/admin.ts derives session and admin role. PATCH /api/admin/users/[id] delegates to backend/api/admin/users/[id]/route.ts, checks isAdminRole, updates profile role/status and writes AuditLog. Public registration cannot reach admin roles through its strict enum.

Existing adminProfileUpdateSchema permits all appRoleSchema roles. Current privileged-tier policy (ADMIN managing SUPER_ADMIN/self/other admins) is not specialized in this handler. Do not quietly redesign it in Phase1; document existing behavior and obtain policy decision before tier restrictions. Existing suspension/session validation is reused; no new account approval workflow or separate admin login is required.

## 4. Database and migration requirements

| Finding | Classification | Requirement |
| --- | --- | --- |
| Required models | VERIFIED — source | User,Profile,MobilePinCredential,MobilePinLoginBudget,AuthSession; existing PasswordCredential retained for website accounts; User.email/emailVerified nullable. |
| Existing PIN migration | VERIFIED — source | prisma/migrations/20261030120000_mobile_pin_foundation/migration.sql: tables/indexes/FK/canonical/hash/count checks. No application/backfill executed. |
| Additional migration for admin identity projection | Not required by inspected change — VERIFIED source assessment | Existing User.mobilePinCredential relation provides canonical mobile; use read-only select/search. Do not copy identity into Profile.phone or add redundant columns. |
| Deployed schema/client compatibility | UNKNOWN | Existing21/no-pending staging logs strengthen runner evidence, but no exact history/checksum/catalog/artifact parity. Reconcile at activation gate, not before source edits. |
| Existing account PIN conversion/linking | MISSING — intentionally unsupported | Do not infer from Profile.phone or automatically enroll legacy accounts. Requires separately reviewed ownership/recovery strategy later. |

No new schema/migration appears necessary for the confirmed Phase1 source fixes. Do not regenerate/apply migrations in this milestone. Missing runtime Prisma models are an operational prerequisite, not a reason to create duplicate tables/models.

## 5. Configuration: required names, no proven missing values

Effective variables remain UNKNOWN; absence is not established. Preserve pending Phase0 security remediation of founder-reported exposed AUTH_SECRET/database credential; no rotation now.

- DATABASE_URL: verified isolated target and compatible schema/client at activation time.
- AUTH_SECRET: stable high-entropy key consistent across Auth.js/middleware replicas; NODE_ENV=production in deployed staging; private custody/rotation scope.
- AUTH_URL and/or NEXTAUTH_URL: explicit canonical selected origin; if both set, agree. Staging AUTH_STAGING_ORIGIN same separate staging origin; NEXT_PUBLIC_SITE_URL consistent for links. Founder confirms four updated URLs; Phase0.2 observed correct staging callbacks, not all private settings.
- AUTH_MOBILE_PIN_ENABLED: literal true only when approved backend readiness/activation complete. Do not change/enable as source implementation shortcut.
- MOBILE_PIN_PEPPER_V1 and MOBILE_PIN_RATE_LIMIT_KEY: independent high-entropy32–256characters/no outer whitespace, replica-consistent, privately retained. No secret generation or pepper rotation here.
- Optional MOBILE_PIN_ACCOUNT_ATTEMPTS, MOBILE_PIN_ACCOUNT_WINDOW_MS, MOBILE_PIN_GLOBAL_ATTEMPTS, MOBILE_PIN_GLOBAL_WINDOW_MS, MOBILE_PIN_MAX_ACCOUNTS, MOBILE_PIN_REGISTRATION_REQUESTS_PER_HOUR, MOBILE_PIN_REGISTRATION_ATTEMPTS_PER_HOUR, MOBILE_PIN_REGISTRATION_MOBILE_PER_HOUR, MOBILE_PIN_REGISTRATION_IP_PER_HOUR and MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER: existing source defaults/validation retained. Without approved ingress-header selection one conservative shared ingress budget is used.
- Flutter nonsecret build defines HOMEZONE_ENABLE_API,HOMEZONE_API_ENV,HOMEZONE_API_BASE_URL,HOMEZONE_IMAGE_HOSTS,HOMEZONE_MEDIA_HOSTS; preserve explicit staging config and empty media restrictions.

No new Phase1 variable is proposed. No SMS/OTP/email-provider credential is needed for mobile PIN. Existing website/admin dependencies remain separate.

## 6. Required code changes and ordered tasks

| Order | Source task / exact files | Classification / boundaries |
| --- | --- | --- |
| 1 | Extend getAdminUsers in src/lib/admin/operations.ts and render read-only canonical login mobile in src/app/admin/users/page.tsx; search canonical mobile via existing relation/normalizer | INCOMPLETE → first narrow implementation slice. No schema, auth behavior, infrastructure or public PII endpoint changes. |
| 2 | Add minimal credential-capability projection/presentation to admin queries and AdminUserPanel; update both admin users and listings callers | INCOMPLETE. Select only booleans/necessary identifiers; no hash/secret fields. Preserve layout and email/password users. |
| 3 | Add clear PIN-only password-reset boundary; if approved, narrow server guard in backend/api/admin/users/[id]/password/route.ts | INCOMPLETE; requires explicit compatibility-policy decision before changing password upsert behavior. Never add PIN recovery. |
| 4 | Correct stale mobile help wording in mobile-app/lib/features/marketplace/marketplace_screen.dart mentioning email-verified signup | INCOMPLETE text only. Keep actual MobilePinAuthScreen/protocol/routes/UI architecture unchanged. |
| 5 | Focused source parity review of selected-role registration, mismatch signout, profile/restore/logout after admin changes | VERIFIED existing source reused; UNKNOWN runtime. Fix only demonstrated new defects, no speculative rewrite of existing files. |
| 6 | Update HOMEZONE_COMPLETE_INTEGRATION_STATUS.md/HOMEZONE_REMAINING_BLOCKERS.md and Phase1 handover | Record source completed separately from Phase0 PENDING and runtime UNKNOWN. Do not erase history or claim activation. |
| 7 | Later separately authorized local checks/build and controlled staging acceptance | UNKNOWN until performed. Not authorized by current readiness task. Existing auth/PIN/session/admin tests can be extended where meaningful; run only with authorization. |

Dependencies: tasks1/2/4 can proceed as small source-only milestones after readiness approval even while Phase0 is pending. Task3 depends on password-enrollment policy approval. Runtime trials and infrastructure changes depend on separate gates; do not block independent source work or silently perform activation.

## 7. Acceptance criteria

### Source acceptance (future review; not performed tests)

1. Registered PIN-only users appear in authorized admin list/search by canonical mobile with correct stored role/status, including null name/email/contact phone. Login-mobile labeled separately from contact phone.
2. Query projections contain no pinHash/passwordHash/pepper/session cookie/token. Canonical mobile never appears in public catalogue or anonymous API responses, diagnostics or mutation audit payloads unnecessarily.
3. Existing website users remain searchable/manageable. Shared panel callers compile conceptually with explicit capabilities; unknown/PIN-only credential reset is not presented as PIN recovery. Dual-credential website password behavior preserved under approved policy.
4. No public ADMIN/SUPER_ADMIN, approval, OTP, email requirement or automatic account linking introduced. Existing PIN uniqueness/hash/quota/transaction/session logic unchanged.
5. All public roles persisted from server allowlist; login uses database role and mismatch rejects clearly; selected role never grants permission. Admin role/status controls remain behind existing server guards.
6. No schema/env/infrastructure activation changes required for read-only admin representation; no new API/client/provider.

### Later runtime acceptance (UNKNOWN; requires approval)

Actual authorized Flutter registration→separate PIN login→profile/role→correct dashboard; leadingzero PIN preserved, duplicate and invalid-PIN behavior; role mismatch, suspended account, expired session, true restart/secure persistence and logout revocation. Admin can identify that same real account and apply authorized role/status controls with proper isolation. No secret/private payload capture. Cross-role/account denial verified under approved fixtures, not inferred from navigation.

## 8. Risks and dependencies

| Risk | Classification | Handling |
| --- | --- | --- |
| Infrastructure/credential exposure remains pending | UNKNOWN remediation completion | Keep Phase0 PENDING; no activation/account operations until separately approved. Does not block admin source fixes. |
| Six-digit PIN without phone verification/recovery | VERIFIED policy limitation | Preserve approved policy, hashing/throttling and custody; never imply phone ownership verified. |
| Admin identity projection is personal data | VERIFIED data sensitivity | Restrict canonical-mobile select/display to authorized admin pages, no hashes/full relation dump or logging. |
| Admin password reset can create website credential on PIN-only user | INCOMPLETE compatibility boundary | Capability UI correction plus owner decision/server guard as above, no new recovery. |
| Existing admin privileged-tier policy | UNKNOWN owner intent | Existing isAdminRole checks allow broad admin operations; review separately, not silently widen/restrict tiers here. |
| Existing USER→OWNER listing creation | VERIFIED source policy | backend/api/properties/route.ts changes USER during create-listing; login itself retains role. Separate business-role decision; no Phase1 rewrite. |
| Provider/listing verification | VERIFIED existing business gates | Not account approval; preserve, communicate separately. |
| Restore on network failure clears local auth | VERIFIED source behavior, UX risk | Preserve fail-closed approach unless a demonstrated issue/policy warrants later change. Runtime handling UNKNOWN. |
| Admin query type/caller compatibility | UNKNOWN until authorized validation | Explicit projections, both shared panel callers, focused future checks; no build/test run now. |

## Conclusion and smallest next implementation step

Phase1 **source implementation can proceed independently of pending Phase0**. Core Flutter/backend PIN architecture is VERIFIED in source and should be reused; admin identity compatibility is INCOMPLETE. No application/configuration changes were made by this readiness report and no new migration is proposed.

**Completed review boundary:** admin canonical-mobile representation and shared password-action UI compatibility. Stop this slice for review. The next small source task is correcting stale mobile help copy; any backend password-enrollment restriction requires separate policy approval. No infrastructure activation is implied.
