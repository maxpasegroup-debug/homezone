# Complete authentication UI audit and first implementation slice

## Email/password sign-in and session source update — 2026-10-30

This update supersedes earlier sign-in handoff descriptions. **IMPLEMENTED BUT
RUNTIME UNVERIFIED**; no tests, builds, device actions, requests or accounts used.

| Area | Source assessment | Remaining evidence |
| --- | --- | --- |
| Sign In fields/provider | VERIFIED IN SOURCE: existing email/password form, normalized email and unchanged password use existing Auth.js `password`; no PIN/OTP substitution | Authorized real account login; no active deployment claim |
| Credential compatibility | VERIFIED IN SOURCE: native registration and password provider share normalization and existing scrypt format; unverified email can sign in subject to suspension/session checks | Deployed schema/client/config parity and actual credential verification |
| Session confirmation | VERIFIED IN SOURCE: existing CSRF -> password callback -> independent session endpoint through one cookie coordinator | Actual Flutter request/response and authenticated UI |
| Profile/role before navigation | VERIFIED IN SOURCE: new shared `MarketplaceRepository.confirmedProfile()` retrieves protected profile and compares role/account generation with verified session; optional selected public role must match | Five approved role fixtures and mismatch/unauthorized tests later |
| Loading/errors/cancellation | VERIFIED IN SOURCE: busy through profile check/logout, no duplicate submission; existing invalid-credential/network/timeout/429 messages; stale completions suppressed and captured local session cleared on interrupted profile handoff | Device navigation/concurrency and error scenarios later |
| Role mismatch | VERIFIED IN SOURCE: no role writes; refuses dashboard, calls existing signout, warns if server/device cleanup uncertain | Backend role/profile and server revocation evidence |
| Restore/dashboard gate | VERIFIED IN SOURCE: existing scoped OS vault + independent session restoration retained; dashboard reuses same profile check | True restart, expiry/suspension/revocation; durable secure-storage success not guaranteed merely by source |
| Logout/profile retry | VERIFIED IN SOURCE: existing CSRF/server revocation/local clearing retained. Gate Sign in again now logs out first, avoiding active-session redirect back to failed profile gate | Successful and failed server/storage logout paths |

Files changed in this slice: `lib/app/homezone_app.dart`,
`lib/features/auth/auth_screens.dart`, `lib/features/auth/auth_form_screen.dart`,
`lib/features/auth/profile_dashboard_gate.dart`,
`lib/features/marketplace/marketplace_repository.dart`, plus this audit and the
Phase1 plan/status/blockers documents. No backend/session controller/protocol/native
storage/schema/PIN changes. Registration fields, generic duplicates, separate login,
branding and preview remain intact. Consent content/persistence, native recovery and
social OAuth are still incomplete. Compilation and runtime results are UNKNOWN.

## Prior native registration source update — 2026-10-30

Supersedes the initial native-backend gap below: role→email Create Account is now
IMPLEMENTED BUT RUNTIME UNVERIFIED through POST /api/mobile/auth/email-register.
Form submits name,email,password,role,termsAccepted:true via the same repository;
valid generic acknowledgment leads to separate existing password sign-in, not a
fake success/session screen. Duplicate and uncertain submissions never overwrite or
automatically repeat creation. Generation/navigation guards protect late responses.

Backend reuses web-registration.ts with static native/browser entrypoints: bounded
strict schema, public-role enum, normalized email, existing scrypt/DB quotas and
atomic User/PasswordCredential/Profile creation. Browser strict Origin/default USER
contract remains; native no-Origin permitted and supplied mismatched Origin/cross-site
rejected. Handler, not a broad middleware bypass, protects the new public route.

Consent status remains INCOMPLETE/MISSING: only explicit request acknowledgment is
validated; no approved documents/version/retention model exists. Native reply says
consentRecorded:false, UI explains no versioned legal record stored. No policy text,
version, database consent field or AuditLog legal proof invented. Supplying approved
legal content and approved persistence architecture remains necessary before release.

Source fields, required validation, loading, acknowledgment and recoverable errors are
connected. Runtime/database/deployed artifact UNKNOWN. No test/build/device/request/account
operations. Recovery and Google native handoff remain incomplete, Apple provider absent.
Prior initial-inventory entries below describe the earlier snapshot where not updated.

Date: 2026-10-30. Source-only audit; no screenshots were attached to this request. Existing AuthLayout, inputs, password visibility toggle, brand tokens, onboarding artwork and cards/buttons are the visual baseline. Pixel/device presentation is UNKNOWN. No build/test/device/runtime request performed.

## Latest approved requirement

Create Account uses **Full name + Email address + Password + Terms/Privacy acceptance**, not phone/PIN/OTP. This supersedes older mobile PIN-only UI requirements in prior reports, not the PIN infrastructure itself. Preserve PIN schema, migration, hashing, provider and admin compatibility, plus existing website authentication.

This slice audits all current auth components and restores existing email-form navigation and existing password sign-in integration. **The complete registration/recovery experience is INCOMPLETE**; no claim of end-to-end completion. Do not activate or deploy based on this source change.

## Screen inventory and status

| Screen / exact Flutter source | UI | Navigation | Backend connection | Validation / errors | Remaining work |
| --- | --- | --- | --- | --- | --- |
| A Welcome: features/auth/onboarding_screen.dart; splash_screen.dart | VERIFIED IN SOURCE: existing two-page artwork/branding/Skip/Next/Get started/sign-in preserved | VERIFIED IN SOURCE: Get started and Skip keep existing /roles behavior; Sign In now opens email/password form directly; public discovery and preview separate | UNKNOWN runtime; onboarding itself is navigation, not authentication | Existing layout/preview/service labels retained | Supplied screenshots/device comparison not available; no new Skip behavior invented. |
| B Role: role_screen.dart; role_first_auth_screen.dart | VERIFIED IN SOURCE: five cards, one selection, disabled Continue until selected | IMPLEMENTED BUT RUNTIME UNVERIFIED: service Continue opens existing email Create Account with selected canonical role; Already have an account link now available in service entry too | INCOMPLETE registration role persistence; selection alone grants nothing | Buyer maps USER, others OWNER/BROKER/BUILDER/SERVICE_PROVIDER; no public admin choices | Complete native email registration contract and server role persistence in next slice. |
| C Create Account: auth_screens.dart/SignUpScreen; auth_form_screen.dart | VERIFIED IN SOURCE: name,email,password,checkbox; existing PasswordInput toggle; Google/Apple buttons preserved | IMPLEMENTED BUT RUNTIME UNVERIFIED: selected role carried explicitly; push to Sign In retains signup controllers beneath route so Back restores draft; no password passed through route arguments | INCOMPLETE: service signup sends no API request until legal/role/native contract is established. Clearly reports details not submitted; does not route to preview success | Existing AuthValidators name2–120,email<=254,password8–128/upper/lower/digit, acceptance required; no new password policy | Approved legal content/consent contract, supported native no-OTP registration adapter, generic acknowledgment and duplicate handling, real role persistence. |
| D Sign In: auth_form_screen.dart + SignInController | VERIFIED IN SOURCE: original email/password form restored; no PIN substituted into Create Account | IMPLEMENTED BUT RUNTIME UNVERIFIED: welcome→login; signup→login carries selected role; verified sessions enter existing /buyer profile/dashboard gate | IMPLEMENTED BUT RUNTIME UNVERIFIED: uses existing Auth.js password provider through PasswordAuthProtocol; CSRF/callback/session verification reused | Existing-password validation checks presence, not new-password complexity; existing protocol handles failures; selected-role mismatch signs out/message, never changes stored role | Real account/device verification later. No new provider. Full-name/email/password accounts cannot sign in with a PIN they never created. |
| E Forgot/Reset: auth_screens.dart; auth_form_screen.dart; recovery_screens.dart | VERIFIED IN SOURCE: existing screens preserved | IMPLEMENTED BUT RUNTIME UNVERIFIED: service login reaches existing recovery form rather than PIN-recovery message | INCOMPLETE: backend forgot/reset exists, native request/deep-link/token flow not connected here; service forms never simulate request/password change | Existing email/new-password/confirmation validation; explicit no-request message | Reuse secure existing recovery endpoints and hashed single-use reset token flow; do not invent OTP or reset without token. CheckEmailScreen/SuccessScreen remain explicitly preview, not service result. |
| F Terms/Privacy: dialog inside auth_form_screen.dart | INCOMPLETE: preview information exists, no approved documents found in inspected auth/app files | VERIFIED IN SOURCE for information dialog only; no guessed URLs | MISSING approved consent-recording implementation/model found in inspected auth schema/routes | Checkbox is UI state only, not proof of recorded consent; service message says no consent recorded | Founder must supply approved public links/repository content and approved consent contract/policy. No data storage/schema invented. |

## Backend capability comparison

| Capability | Evidence | Classification / consequence |
| --- | --- | --- |
| Password sign-in | backend/auth.ts Credentials id password; existing password credential hash verification, admission and session callbacks | VERIFIED IN SOURCE; reused by native email Sign In. Effective deployment UNKNOWN. |
| No-OTP direct web signup | src/app/api/auth/password/web-signup/route.ts → src/lib/auth/web-registration.ts | VERIFIED IN SOURCE for browser contract name,email,password; requires exact canonical Origin, bounded strict body, quotas, scrypt and atomic User/PasswordCredential/Profile, emailVerified:null, default USER. |
| Native email signup with selected public role | POST /api/mobile/auth/email-register delegates to nativeEmailRegistration in existing web-registration.ts | IMPLEMENTED BUT RUNTIME UNVERIFIED: native-specific strict public-role/terms acknowledgment validation and quotas; browser contract preserved, no arbitrary Origin injection. Legal consent persistence remains missing. |
| Email OTP registration | Existing /api/auth/password/signup, resend, verify and retained features/marketplace/registration_screen.dart | VERIFIED IN SOURCE, not the new active Create Account flow. No OTP introduced. Do not replace no-OTP flow with this legacy implementation. |
| Mobile PIN | /api/mobile/auth/register, callback/mobile-pin, MobilePinCredential and mobile_pin_auth_screen.dart | VERIFIED IN SOURCE, retained unchanged by this slice. No longer substituted into new email Create Account/navigation. No PIN infrastructure removed. |
| Recovery | backend/api/auth/password/forgot/route.ts and reset/route.ts, src/app/api wrappers; PasswordResetToken model | VERIFIED IN SOURCE backend. Forgot sends generic acknowledgment, existing delivery dependency; reset validates hashed token/expiry/single-use and changes password/revokes sessions transactionally. Native integration INCOMPLETE. |
| Google | backend/auth.ts conditional Google provider via existing environment checks | VERIFIED IN SOURCE backend; deployed availability UNKNOWN; native OAuth/browser callback integration MISSING in current form. Button explicitly unavailable, no fake authentication. |
| Apple | No Apple provider in inspected backend/auth.ts | MISSING backend/mobile integration; preserve button as unavailable per founder, do not invent provider. |
| Profile/session/admin | existing account profile route, ProfileDashboardGate, session registry, secure vault, admin compatibility slices | VERIFIED IN SOURCE; runtime UNKNOWN. No roles/privileges/admin login changes. |

## Changes implemented in this review boundary

1. app/homezone_app.dart: /sign-in now opens existing password SignInScreen with existing controller; verified session retains dashboard path. Recovery routes reuse existing forms with service mode, not an incorrect PIN message.
2. features/auth/role_first_auth_screen.dart: selected role opens existing SignUpScreen email form instead of MobilePinAuthScreen. Underlying role remains journey context, not server permission.
3. features/auth/role_screen.dart: canonical role mapping reused and Sign In link available for service role selection, carrying selected role. Existing five cards and Continue rules preserved.
4. features/auth/auth_screens.dart: wrappers pass explicit selected role/service mode into existing forms; no new credentials architecture.
5. features/auth/auth_form_screen.dart: role context retained across push/back; existing password sign-in checks optional selected role and routes through existing profile gate. Service signup/recovery never execute preview delay/success path. Existing fields/design/toggle/consent checkbox retained; messages accurately distinguish unavailable integration, social buttons and preview. Incorrect memory-only session wording replaced with server-verification wording.

No backend, marketplace, admin, schema or PIN code modified in this slice. Existing uncommitted admin/PIN changes preserved. No new email-registration endpoint, role assignment, consent storage or social/recovery mechanism invented.

## Review boundary and next slice

The founder's latest credential decision is accepted. This is not a completed registration workflow: valid form submission currently returns a clear unavailable message and sends nothing. Required next backend work is an explicit native-compatible no-OTP email registration contract reusing existing password/quota/session infrastructure, validating exactly the five public roles and not breaking existing strict browser signup/default role behavior. Generic duplicates must never overwrite existing identities/roles. Define consent document/version/acceptance handling only through approved backend policy, not local checkbox claims.

Question requested from founder during this task: approved Terms/Privacy URLs or repository paths and existing consent contract. No answer available when recording this review. These are required content/contract inputs, not permission to switch credentials or invent legal text. No secret requested.

After that reviewable slice, connect native registration response/result→separate password sign-in, then secure recovery deep links, optional existing Google handoff only if approved/configured. Apple remains unavailable unless separately approved. No backend rollout, runtime tests or live verification implied. Phase0 remains PENDING and does not block independent source work.

## Execution record

Source diff inspected; no tests, builds, type checks, formatting commands, live requests, accounts, database access/writes, migrations, device operations, settings/secret changes, deployments/restarts, commits or pushes. Runtime/device presentation and complete backend connectivity remain UNKNOWN. Stop here for review before the next slice.
