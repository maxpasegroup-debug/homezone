# Mobile number + six-digit PIN implementation plan

Date: 2026-10-30. PLAN ONLY. Companion: MOBILE_PIN_AUTHENTICATION_AUDIT.md.
This supersedes the old email-OTP roadmap for the newly required target journey,
not authorization to modify existing production or delete legacy/demo functionality.

## Architectural approach

Keep Auth.js, stable User/Profile identities, authorization and role workspaces,
JWT cookies, AuthSession/sessionVersion revocation, owned Flutter cookie protocol
and platform vault. Add a distinct phone/PIN credential method and strict
registration service. Do not invent a parallel token system or use the static
mobile-demo OTP provider. No OTP, email dependency, email/password sign-in or
Forgot PIN in the target flow. Keep any legacy code/data isolated until its
compatibility/cutover policy is approved; retaining old source is not approval to
leave alternate providers publicly enabled forever.

Suggested new paths/model names below are proposals, NOT existing APIs/schema:

- Auth.js Credentials provider id `mobile-pin`; callback dispatch path would be
  /api/auth/callback/mobile-pin within the existing catch-all.
- POST /api/auth/mobile-pin/signup: dedicated registration with strict bounded JSON.
- A `MobilePinCredential` (working name) linked to User by unique userId, holding
  unique canonical phone, versioned pinHash and hash/key version metadata.
  Protection state may use a separate row/table or reviewed RegistrationBudget
  extensions; do not declare that current counters implement failure lockouts.
- Proposed helpers phone-identity.ts, mobile-pin.ts, mobile-pin-registration.ts,
  mobile-pin-admission.ts under src/lib/auth; use existing shared components when
  their contracts actually fit. No new dependency assumed.

Canonical login phone is authoritative in that credential binding, not Profile.phone.
Decide whether to display a separate contact number or keep a read-only mirrored
phone in Profile. Existing profile-edit/OTP/admin paths must never mutate the
credential binding accidentally. No number-change or recovery workflow is proposed.

## Proposed contracts for review

| Operation | Proposed request / response | Required safeguards |
|---|---|---|
| Registration | POST /api/auth/mobile-pin/signup JSON {phone,pin,confirmPin}; unknown keys rejected, no role/name/email requirement | Explicit international phone policy, both PIN strings exactly six ASCII digits and equal, bounded body; admission before expensive hashing; atomic account creation |
| Registration acknowledgment | Proposed 200 {message:'Continue with secure sign-in.'} for new or duplicate; 400 generic validation; 403 security denial; 429 accurate Retry-After; 503 generic unavailable | No created/authenticated claim, no phone/account enumeration; duplicate never changes credentials. Final response wording/status must be approved before implementation |
| Login | Existing CSRF GET; form POST /api/auth/callback/mobile-pin {csrfToken,phone,pin,callbackUrl:'/'}; independent GET /api/auth/session | Use Auth.js provider/callback conventions, not custom cookies; no body/credential logging; consistent invalid/throttled account messages |
| Session/profile | Existing /api/auth/session and /api/mobile/account?view=profile | Same stable id/server role/expiry, whatsappVerified false unless separately genuinely verified; no phone returned unnecessarily |
| Logout/protected access | Existing CSRF POST /api/auth/signout and current authenticated requests | Revoke registry and clear vault, preserve generation checks; no new headers/token architecture |
| Forgot PIN | No endpoint, screen, link or fallback in target journey | Deferred. Do not reset PIN through existing email password reset/changePassword helper |

Registration acknowledgment followed by normal PIN authentication is the proposed
way to reach the appropriate experience without treating a duplicate acknowledgment
as proof. Capture the same submitted credentials for this attempt, do not read
mutable controller text after awaits, and clear both PIN fields on exit/completion.
If sign-in cannot be confirmed, offer sign-in only; never automatically recreate
the account or promise future recovery.

No SMS/email credentials are needed for this new flow. Existing AUTH_SECRET,
canonical AUTH_URL/NEXTAUTH_URL/staging approval, DATABASE_URL and secure-session
configuration remain required. A proposed `MOBILE_PIN_PEPPER` (or an owner-selected
equivalent secret name) and PIN admission HMAC/policy configuration are NEW proposals,
not present/verified settings. Prefer distinct-purpose keys; never reuse OTP_PEPPER
or silently reuse old password counters. Secret provisioning needs separate approval.

## Small, dependency-ordered milestones

Each milestone needs its own reviewed diff and acceptance evidence. No milestone
authorizes database execution, runtime tests or production deployment. Complexity
describes scope, not an elapsed-time promise.

| # | Milestone / classification | Minimal reviewable change | Dependencies / acceptance criteria | Complexity |
|---|---|---|---|---|
| 0 | Close identity/cutover decisions — Security requirement, Configuration change | Approve country/canonical format, duplicate/privacy policy, no-possession-proof limitation, legacy account enrollment and web/admin scope; approve temporary-protection thresholds | Must not quietly leave email login or OTP as target fallback, nor lock existing users out without approved cutover | Medium decision effort |
| 1 | Backend phone/PIN foundation — Backend change, Database/schema change | Propose dedicated identity/credential schema and additive migration source; strict phone and six-digit string schemas; preserve nullable email and existing IDs | #0; unique canonical phone and user binding, existing edit paths cannot alter identity. Review migration only; no migration execution | Medium–High |
| 2a | Secure PIN hash — Backend change, Security requirement, Configuration change | Reuse scrypt primitives with explicit calibrated/versioned format, random salt, purpose-bound secret prehash and constant-time compare; bounded invalid hash handling | #1; no plaintext/default PIN or PasswordCredential overload; pepper/key storage/rotation/loss approved before activation | High security review |
| 2b | Persistent login protection — Backend change, Security requirement | PIN-specific aggregate and number-keyed admission, atomic failed-attempt/cooldown state, distributed capacity/cleanup; unknown-user dummy verification bounded by admission | #2a; temporary protection policy, race behavior, denial under storage/secret failure; correct PIN can't bypass active cooldown; no permanent lockout | High |
| 3 | Atomic registration/duplicates — Backend change, Security requirement | Dedicated bounded signup service/route, admitted hash outside short creation transaction; create User/Profile(USER)/PIN credential together, uniqueness race handled | #1–2; no roles/teams/org input; no overwrite/automatic existing-phone linkage; generic duplicate and uncertain-outcome behavior; phone/email remain unverified | Medium–High |
| 4 | Auth.js session integration — Backend change, Security requirement | Add new provider, lookup canonical binding, verify PIN and suspension, return User/sessionVersion; retain callbacks/registry/CSRF/cookies | #2–3; new sessions proven only by existing session endpoint; no competing tokens; old provider exposure governed by #0 | Medium |
| 5 | Flutter registration — Flutter change | Adapt existing RegistrationScreen to phone/PIN/confirmation; remove OTP state/timers/resend and email input from active service path; reuse owned registration admission/busy/error patterns | #3–4; correct approved payload, no simulated success or auto-retry; no PIN persistence; maintain design and explicit staging selection | Medium |
| 6 | Flutter login/protocol — Flutter change, Security requirement | Numeric masked PIN and country-aware phone input, new provider field mapping, controller error text; remove service email/social/recovery access; preserve ownership/generation/cancel/CSRF | #4–5; independent session check, transient credential clearing, no recovery code implemented | Medium–High |
| 7 | Existing dashboard/profile routing — Flutter change, Backend change only if proven necessary | Reuse ProfileDashboardGate, USER marketplace and role workspace/admin web direction; optional name/email and contact-number display assessed; startup restores session, not PIN | #6; role from server only; no new role policy. Listing-created OWNER transition still works; absent/suspended/mismatched profile safe | Medium |
| 8a | Source readiness/cutover review — Security requirement, Configuration change | Review source contracts, migration/backfill risks, provider exposure, template names; approve staged enablement and rollback boundaries | #0–7; legacy users preserve IDs, no synthetic email/default PIN, existing production untouched | High |
| 8b | Later verification — separately authorized | Add/run targeted backend/mobile regression tests, approved staging schema deployment, build and actual device PIN journeys, session/role/abuse/duplicate races | Requires explicit test/build/device/network/account/database permissions and fixtures, never inferred from this audit | High, device/external blockers |

## Migration and legacy compatibility plan — preparation only

1. Freeze intended commit/model contract. Authorized database owner later confirms
   target identity, migration history/checksums/schema, backup and restore readiness.
   Do not infer production history from staging or 20 local migrations.
2. Owner privately inventories current user/profile phones and canonical collisions,
   missing numbers, contact verification states and existing associations. No
   account PII, raw numbers or connection strings in chat/reports.
3. Review additive identity/credential schema. Old PasswordCredential records stay
   intact. Optional User.email already supports phone-only accounts; no fabricated
   email or emailVerified timestamp. Assess dependent views/admin/support code.
4. Existing phone is not sufficient enrollment proof. Decide a separately approved
   secure enrollment path for legacy users or restrict initial staging trial to
   explicitly authorized new fixtures. Never let a new public registration claim
   an existing profile by matching its phone or reuse its privileges.
5. Review conflict policy where canonical login number matches an old Profile.phone:
   fail safely, do not merge/unlink/overwrite. Raw unique Profile.phone may otherwise
   cause an unexpected transaction failure even with a separate canonical binding.
6. Controlled rollout must not silently keep old email/password/OTP providers as a
   security fallback if the official change is global. Conversely, removing those
   providers from shared production before legacy/admin continuity is approved is
   unsafe. Stage backend support, reviewed mobile source and explicit provider
   cutover as separate changes. Define old-session validity versus revocation.
7. Rollback should disable new account admission/provider through approved release
   handling without deleting newly created accounts/hashes/relationships. A pepper
   rotation/loss cannot be solved by deferred Forgot PIN; operational plan required.

No data conversion, migration execution, enrollment, provider activation or secret
provisioning is authorized by this plan. No recovery mechanism is being built.

## Security acceptance checklist for later authorized review

- Canonical-number uniqueness independent of formatting; simultaneous duplicate
  signup creates one account, never changes an existing PIN/role/association.
- PIN preserves leading zeros, rejects anything except six digits, confirmation
  matches; no extra complexity/blocklist rule invented without approval.
- Hash/version/salt/key handling reviewed; KDF capacity calibrated later under
  approved testing, not guessed from the old default cost; one-million PIN space
  and first-claim ownership risks explicitly acknowledged.
- Distributed limits and temporary protection survive process restart/replicas,
  bound unknown-number attacks and fail closed; counters/HMAC purposes separate
  from legacy OTP/password quotas; no unbounded hash or cleanup paths.
- Native/browser origin policy and Auth.js CSRF preserved; registration under
  /api/auth explicitly checks security because middleware skips generic mutation
  checks there. No environment-derived arbitrary redirects or production fallback.
- EmailVerified remains null, whatsappVerified remains false, verificationStatus
  not falsely promoted. User created with default USER; no public role selection.
- Correct identity restored from secure session material, not saved PIN; logout
  and revoked/suspended sessions fail protected access; cross-account stale
  responses cannot publish identity/data. Recovery/reset never modifies PIN.
- No plaintext PIN, phone, confirmation, cookie or token in diagnostics, analytics,
  backups of raw requests or crash reports. Only sanitized stage/category evidence.
- Actual Android presentation remains independent prerequisite; catalogue HTTP 200
  does not verify PIN/session/role workflows. No fabricated runtime completion.

## Required approvals before implementation

Approve milestone 0 decisions and milestone 1 source/schema proposal first, then
review each subsequent small milestone. In particular specify whether the new
official authentication applies to website/admin as well as mobile, approved
number regions/format, PIN protection thresholds and existing-user strategy.
Do not provide secret values in chat. Forgot PIN remains deferred in all milestones.

## Actions performed

Created only MOBILE_PIN_AUTHENTICATION_AUDIT.md and this plan. Read baseline audit
documents first, then read/search current source and inspect read-only Git state.
No application/schema/config changes, migrations, tests, builds, live requests,
OTP/account creation, database connections/writes, production/Railway changes,
commits, pushes or deployments. Stop here pending approval.

## Milestone 1 source status — 2026-10-30

Subsequent owner authorization implemented only backend credential/provider
foundation: separate MobilePinCredential/MobilePinLoginBudget, India normalization,
versioned peppered scrypt, configurable shared attempt windows and default-off
Auth.js mobile-pin provider. See MOBILE_PIN_BACKEND_FOUNDATION.md for exact files,
settings, conservative defaults and limitations. Migration is source-only and was
not run; Prisma client generation, compilation and runtime verification remain
unperformed. Registration/enrollment API and all Flutter work are still pending.
Existing web/admin authentication remains unchanged by explicit milestone scope.

## Milestone 1B source status — 2026-10-30

Approved security refinement implemented failure-only per-number accounting under
a database row lock, retained separately committed aggregate admission, bounded
skip-locked cleanup, safe fixed-category operational diagnostics and explicit
authentication selects. Existing models/migration and v1 hash format unchanged.
Default is five failures in a fixed 15-minute window from first failure; successes
consume only aggregate admission, do not reset prior unexpired failures; blocked
attempts do not extend expiry. See MOBILE_PIN_SECURITY_DECISIONS.md for key rotation,
operational limits and required future concurrency/security verification. This
is not enrollment, Flutter integration, provider activation or runtime approval.
