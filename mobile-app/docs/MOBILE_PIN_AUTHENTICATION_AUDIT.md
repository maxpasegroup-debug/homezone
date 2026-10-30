# Mobile number + six-digit PIN authentication audit

Date: 2026-10-30. Source baseline: f6e1e8699f1d99a81a171d5987f950bc79a0a9ec.
Working tree was clean before this documentation task. No runtime checks.

## Decision and reconciliation with the architectural baseline

Read first: DEMO_UI_INVENTORY.md, BACKEND_API_INVENTORY.md,
MOBILE_BACKEND_SCREEN_MAPPING.md and DEMO_TO_PRODUCTION_ROADMAP.md. They describe
the old email/password plus mobile email-OTP architecture, not the newly approved
product requirement. Their instructions to preserve OTP describe historical
scope; they do not override the founder's new no-OTP/no-email-password target.
They remain unchanged as historical audit records.

New target: mobile number + exactly six ASCII numeric PIN digits and matching
confirmation for registration; number/PIN for login. No OTP, verification/resend,
email/password login or Forgot PIN in the target journey. Forgot PIN is deferred,
not an invitation to substitute email recovery or invent support resets.

**Verdict: the session architecture is reusable; the credential/identity flow is
NOT IMPLEMENTED.** Existing source does not support this requirement simply by
renaming password fields. A reviewed additive identity/credential schema and
backend provider are needed before Flutter integration. No implementation made.

No material contradiction was found between those four documents and the current
email-auth source. Important details for this change: generic /profile PATCH
requires a nonadmin role; listing creation already promotes USER to OWNER and
WorkspaceForm revalidates the session; neither is PIN registration role selection.
Profile.phone uniqueness is only uniqueness of existing stored text, not proof
of canonical phone identity or ownership. The historical no-phone-OTP capability
gap is no longer a delivery prerequisite: the new requirement deliberately has
no OTP. Building an SMS/email provider is not part of this plan.

## Current architecture and exact differences

| Area / evidence | Current source behavior | Required disposition |
|---|---|---|
| Service registration: lib/features/marketplace/registration_screen.dart:25,138–209 | Name/email/password, email OTP challenge, resend/verification, then password sign-in | Flutter change: number/PIN/confirmation; remove email/password/OTP dependency from service journey; confirm server response then independent sign-in/session |
| Login: lib/features/auth/auth_form_screen.dart:63; validators.dart | Email/password login via controller; password presence for login; complexity for new password | Flutter change: mobile-number validator and exactly six digits; preserve loading/cancellation/design |
| Preview: auth/role_screen.dart, auth_form_screen.dart:94, recovery_screens.dart | Local role, delayed signup/recovery, preview success; social notices | Preserve demo assets but label preview; do not reuse delayed success as real registration. No Forgot PIN screen/API |
| Password protocol: core/api/password_auth_protocol.dart:260–310 | CSRF GET then /api/auth/callback/password with email/password, followed by GET /api/auth/session | Backend + Flutter change: dedicated PIN credentials provider/fields, same coordinated CSRF/cookie/session protocol |
| Backend provider: backend/auth.ts:51–88 | Password provider queries User.email and PasswordCredential, scrypt verifies, suspension denies | Backend change: canonical number lookup + separate PIN hash; no email lookup or PIN-as-password shortcut |
| Existing signup APIs | POST /api/auth/password/signup, /resend, /verify; email-registration.ts | Old mobile EmailRegistration/RegistrationBudget and email-provider dependencies; not usable as PIN registration |
| Separate web signup | POST /api/auth/password/web-signup, web-registration.ts | Direct name/email/password with emailVerified:null; not phone/PIN. Shared web cutover scope needs owner decision |
| Forgot/reset | /api/auth/password/forgot,/reset; AccountAccessScreen | Existing email reset is not PIN recovery and must not reset/attach a PIN credential |
| Authenticated phone OTP | /api/auth/otp/send,/verify; auth/otp.ts | Existing-session profile verification, delivery pending; no public PIN capability. Do not call it or use demo-mobile OTP provider |
| Hashing: src/lib/auth/password.ts:7–24 | Random 16-byte salt, scrypt-derived hash and timingSafeEqual | Reusable primitives, but low-entropy PIN needs explicit policy/versioning, separate purpose/pepper and stronger online protection; never weaken password schema |
| Admission: password-signin-limit.ts | Existing shared PostgreSQL RegistrationBudget limiter; keyed HMAC, fixed-cardinality aggregate, database-time locking, fail-closed; defaults 10/account per 5min, 1000 total, capacity 10000 | Security requirement: reuse design, not keys/policy verbatim; PIN-specific atomic admission/failure/cooldown protections must be designed and approved |
| Session: backend/auth.ts:163–206; session-registry.ts:7–61 | Auth.js JWT cookie, random session identifier hashed in AuthSession, 30-day expiry, sessionVersion/revocation/suspension check | Reuse; new provider returns stable existing User ID/version; no new bearer-token system |
| Transport/vault: core/api/*; native SessionVaultBridge/AppDelegate | Same-origin HTTPS, cookie scope/provenance, generation guards, Android Keystore AES-GCM/iOS Keychain | Reuse; store session material only, never phone/PIN credential pair for auto-login |
| Roles: prisma/schema.prisma:32–40,456–470; backend/auth.ts:184–205 | Profile.role persisted; session returns role; mobile profile gate confirms matching role | Reuse default USER and existing dashboards; no client roles or privileged association fields |

Paths beginning lib/ are relative to mobile-app/. API paths include /api.

## Existing schema and phone identity

Confirmed in prisma/schema.prisma:

- User:370 has stable id, optional unique email, nullable emailVerified, optional
  name, sessionVersion, Profile, PasswordCredential and AuthSession relations.
  There is no primary phone login field or PIN credential relation.
- Profile:456 has unique userId, nullable unique phone:461, role USER default,
  whatsappVerified false and verificationStatus PENDING. Its phone is contact data.
- PasswordCredential:434 has unique userId/passwordHash. Its semantics and reset
  path are email/password; do not silently put a six-digit PIN into this column.
- Account, Session and VerificationToken support the existing Auth.js adapter;
  JWT operation additionally uses AuthSession:387. Keep adapter compatibility.
- EmailRegistration and RegistrationBudget support email OTP/quota. OtpChallenge
  stores phone challenge state, not PIN login. Lead/BrokerTeamMember/BuilderTeamMember
  phone fields are contact records, not authenticatable accounts.
- Initial migration creates Profile_phone_key; current uniqueness does not collapse
  formatting/country-prefix equivalents. Existing normalizePhone only strips
  punctuation and is not a comprehensive country-aware canonicalizer.

Contact edits are a critical trust boundary: src/app/api/mobile/account/route.ts:42
PATCH accepts city/phone and resets whatsappVerified on a changed phone. Generic
backend/api/profile/route.ts also edits phone. If Profile.phone became login
identity directly, existing edit paths could change login binding without a new
proof/reauthentication policy. Keep canonical auth identity separate; do not let
any contact-edit/admin/team/OTP path attach or change a PIN identity accidentally.

## Reusable versus modification versus missing development

Reusable: User/Profile IDs and relations, role/suspension authorization, owned
cookie coordinator, CSRF binding, canonical redirect rules, session registry,
platform vault, independent restoration/session check, marketplace protected
requests, dashboard gate, UI styling and form busy/error/cancellation patterns.

Modification: mobile auth screens/validators/protocol/controller messages/routes;
backend Auth.js provider composition and admission helper generalization; profile
identity-edit boundaries; new registration atomic service; docs/config templates
for proposed PIN settings; targeted tests later only when authorized.

Missing: canonical phone-identity specification; PIN credential model/provider;
PIN registration and safe concurrent duplicate handling; persistent PIN attack
protection; existing-account enrollment/cutover strategy. None can be inferred
from existing email OTP or six-digit OTP regex.

## File-by-file impact register

| Classification | Actual files / proposed new files | Necessary scope |
|---|---|---|
| Flutter change | features/marketplace/registration_screen.dart | Replace service email challenge form/state/timers with number/PIN/confirm; server-confirmed create then independently verified session; preserve input transiently, clear on exit |
| Flutter change | features/auth/auth_form_screen.dart, auth_screens.dart, validators.dart; shared/ui/auth_components.dart only if existing controls cannot express numeric masked PIN | Phone/PIN sign-in and exact string validation; leading zero preserved; no email/social/forgot link in target service auth |
| Flutter change | core/api/password_auth_protocol.dart, features/auth/sign_in_controller.dart | Separate/review credential field mapping for new provider; preserve owner and session-generation semantics, CSRF and independent session; don't rename all shared classes unnecessarily |
| Flutter change | app/homezone_app.dart, features/auth/onboarding_screen.dart, main.dart | Route target service auth, remove access to obsolete email/recovery flows for PIN journey; startup/vault reuse; no PIN persistence |
| Flutter change | features/marketplace/account_access_screen.dart, features/auth/recovery_screens.dart, role_screen.dart | Remove active PIN-flow links to legacy recovery/success; preserve explicit offline preview data rather than deleting it |
| Flutter change | features/marketplace/marketplace_screen.dart (profile edit only), features/auth/profile_dashboard_gate.dart, features/workspace/workspace_screen.dart | Audit contact-phone editing/account messages and post-login role routing; no unrelated catalogue changes |
| Backend change | backend/auth.ts; src/app/api/auth/[...nextauth]/route.ts and backend catch-all delegate reviewed, not duplicated | Add proposed distinct PIN provider; reuse existing session callbacks and revocation; legacy provider cutover only after explicit scope approval |
| Backend change | Proposed src/lib/auth/mobile-pin-registration.ts, mobile-pin.ts, phone-identity.ts; proposed src/app/api/auth/mobile-pin/signup/route.ts | Focused strict/bounded registration and canonical identity helpers; these paths do not exist now |
| Backend change / Security requirement | password-signin-limit.ts, registration-admission.ts or proposed mobile-pin-admission.ts | Reuse PostgreSQL atomic-limiter infrastructure with separate purposes/keys, persistent cooldown/failure state and bounded cleanup; no process-local-only fallback |
| Backend change / Security requirement | src/lib/api/validation.ts, middleware.ts, src/lib/auth/redirect.ts | Add separate PIN schema/canonical phone validation and new auth route security; preserve old password rules/origin/CSRF; /api/auth is public in middleware, so new registration must enforce its own policy |
| Backend change | src/app/api/mobile/account/route.ts; backend/api/profile/route.ts; backend/api/auth/otp/verify/route.ts; src/lib/auth/profile.ts | Audit all contact edits/profile creation; do not treat phone/whatsappVerified as PIN identity ownership or auto-link accounts |
| Database/schema change | prisma/schema.prisma and future additive migration (not created) | Dedicated unique canonical-number login binding + PIN hash/version; persistent protection state if RegistrationBudget insufficient; preserve stable IDs and current email credentials |
| Configuration change | src/lib/env.ts, nonsecret templates/docs and PIN-specific limiter config (future) | Proposed separate PIN pepper/HMAC key policy; preserve AUTH_SECRET/origin/database/session settings; no actual new variable configured |
| Backend change, conditional web scope | src/components/auth/auth-form.tsx; email-registration.ts, web-registration.ts; old signup/reset route files | Required only for approved global web cutover/deprecation plan; do not leave an old alternate login path active accidentally or break existing production unannounced |
| Security requirement | tests/auth-middleware.test.mjs, password-signin-limit.test.mjs, registration.test.mjs, mobile-api.test.mjs and mobile-app/test auth/protocol/session suites | Later authorized extension/regression; names indicate existing assets, not tests executed or adequate coverage |

Unchanged on present evidence: catalogue/data APIs, Android renderer/settings,
media allowlists, session-cookie naming and production settings. Audit shared
user display for nullable email/name; do not fabricate email addresses for phone users.

## Security requirements and inherent limitations

1. Six digits are a string matching ^[0-9]{6}$, not a number or OTP. Preserve
   leading zeros; do not trim a PIN into validity, accept Unicode digits or reuse
   the old minimum-eight/complex-password schema. Match confirmation client-side
   and server-side if the registration contract accepts it; never store it.
2. Only 1,000,000 possible PINs exist. Salted memory-hard hashing does not create
   entropy. Use calibrated/versioned scrypt or equivalent, random per-record salt,
   purpose-separated secret prehash/pepper stored outside the DB, strict online
   admission and temporary protection; review combined DB+secret compromise risk.
   Pepper/key rotation and loss are operational decisions; deferred recovery makes
   loss particularly consequential. Do not promise resistance to unlimited guesses.
3. Bound input before normalization/hashing. Canonicalize explicit country-aware
   international numbers once on server; client follows same rules. Supported
   regions/default-country choice needs approval. Profile regex/normalizePhone
   alone cannot prevent duplicate formatted identities. Check uniqueness in DB,
   not only preflight; catch only the expected canonical-phone uniqueness conflict.
4. Separate account-level persistent temporary cooldown/failure state, aggregate
   request/hash budget, creation budget and trusted-network/device abuse signals.
   Unknown/existing numbers should have comparable denial behavior and bounded
   dummy hash work after admission. Fail closed on storage/config errors. Do not
   trust caller-supplied forwarded IPs, evict live protection or permit replica
   bypass. Decide thresholds/durations/capacity before coding; old password defaults
   are not an approved PIN policy. Avoid permanent attacker-triggered lockout.
5. Account creation is one User + default USER Profile + dedicated PIN credential
   transaction. No upsert/reset/replace of an existing person's credential. Concurrent
   requests for the same canonical number can create at most one identity. A
   duplicate acknowledgment is not account creation/authentication; auto sign-in
   must check the PIN through Auth.js and independently verify the session. A
   transport failure leaves creation uncertain: offer sign-in, not automatic retry
   or deferred Forgot PIN. Never silently create another account on a collision.
6. No OTP means no proof of number possession, consent to messages or ownership
   of existing phone/contact records. Set emailVerified null; leave whatsappVerified
   false; do not promote verificationStatus or link any existing account based on
   a number match. First registration can reserve someone else's/recycled number.
   That limitation cannot be solved by hashing/rate limiting alone; accept and
   document it or revisit requirements separately, without sneaking OTP into scope.
7. Never log PIN/confirmation/number/request body/session cookies; number identifiers
   in quota keys require purpose-separated HMAC, not plain SHA or raw phone. Logs
   use sanitized stage/category only. Never persist PIN on device; vault sessions only.
8. Preserve canonical-origin/CSRF/protected handler restrictions; no new trust in
   Host headers. Reject cross-site/mismatched-origin browser registration; define
   native missing-Origin policy explicitly. Existing /api/auth middleware exemption
   does not protect a new custom registration handler automatically.

## Existing accounts and migration constraints

An additive schema change is recommended for a separate credential binding; reuse
of Profile.phone alone could technically avoid a new identity field but is unsafe
without auditing/changing every existing edit/enrollment path. Do not weaken
PasswordCredential semantics to avoid a migration. Exact model names remain proposed.

Existing email users have no PIN hash and may have no phone, an unverified phone,
or differently formatted duplicate phones. Cannot derive their PIN or grant phone
ownership from stored contact data. Preserve IDs, listings, roles, associations,
sessions and password hashes; no default PIN, fake email, bulk conversion or merge.
Privately authorized future reconciliation must identify collisions and choose a
safe enrollment/cutover policy. No DB evidence was collected here.

Unresolved: whether official change covers website/admin or mobile only; legacy
sign-in availability during a temporary migration window; identity enrollment for
existing users without OTP/recovery; one-number/one-account rules for shared or
recycled numbers; supported countries; PIN lockout/budget values and secret rotation;
contact number versus login number UX; immediate post-registration auto-sign-in.
Existing default USER registration and admin-only privileges remain unchanged.

No PIN flow is runtime verified. Existing catalogue verification does not transfer
to this proposed credential system. Android display investigation remains separate.

## Activity

Only this audit and the companion implementation-plan Markdown were created.
Source/configuration/schema unchanged; no migration created; no tests, builds,
commands that run application logic, HTTP/OTP/account/database operations,
environment/Railway/production changes, commits, pushes or deployments performed.
