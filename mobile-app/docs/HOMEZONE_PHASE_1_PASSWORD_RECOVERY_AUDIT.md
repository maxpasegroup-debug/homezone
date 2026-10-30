# HomeZone Phase 1: native password recovery audit

Date: 2026-10-30. Branch: `main`. HEAD: `09a39de3888772c2ca712355a16f89d2c379a392`.
The working tree contains prior uncommitted authentication/admin/native-registration
changes; this audit inspected current source, not only HEAD. Those changes are preserved.
Only this report was created. No application/configuration/schema changes.

## Outcome

**INCOMPLETE:** the existing backend supports email-link password recovery for
Name + Email + Password accounts, including native-created accounts. The active
Flutter recovery forms intentionally send no request. An older API-wired recovery
screen exists but is not instantiated by the current routes. A secure reset can use
the existing website link; a complete native link-to-reset journey is not implemented.
No OTP, mobile-number requirement, PIN reset or second authentication system is needed.

**UNKNOWN:** effective deployed routes, database/client/migration parity, email
configuration, sender-domain readiness, actual delivery, reset behavior and session
revocation at runtime. Historical catalogue HTTP 200 is not recovery evidence.

Classifications below mean source inspection only:

- **VERIFIED IN SOURCE:** directly established by inspected code; not runtime proof.
- **INCOMPLETE:** partial wiring or a protection/compatibility gap exists.
- **MISSING:** the described component was not found in the inspected implementation.
- **UNKNOWN:** source cannot establish deployment, configuration or runtime behavior.

## 1. Existing website flow and API contracts

| Finding | Classification | Exact evidence and behavior |
| --- | --- | --- |
| Website Forgot password | VERIFIED IN SOURCE | `src/components/auth/auth-form.tsx:156` posts JSON `{email}` to `/api/auth/password/forgot`; its Forgot password action selects this flow at line 353. Response message is displayed; it does not establish delivery or account existence. Loading and the shared submission-ref guard prevent repeated clicks. |
| Forgot route | VERIFIED IN SOURCE | `src/app/api/auth/password/forgot/route.ts:1` re-exports `backend/api/auth/password/forgot/route.ts:10`. Public POST; valid email is trimmed/lowercased after schema validation. Unknown email skips token/delivery work. Normal completion returns 200 with the same generic message for existing/unknown accounts. |
| Email link destination | VERIFIED IN SOURCE | `backend/api/auth/password/forgot/route.ts:41` uses `authOrigin()`, not Host/forwarded headers, to build the canonical `/auth?flow=reset&token=<opaque-token>` link. This is a reset capability, not an OTP or authentication session. No actual token is included in this report. |
| Website reset page | VERIFIED IN SOURCE | `src/app/auth/page.tsx:36` accepts flow/token search parameters and passes the token into AuthForm at line 59. `src/components/auth/auth-form.tsx:173` posts `{password,token}` to `/api/auth/password/reset`. On success it clears the password and selects Sign In; it does not authenticate automatically. |
| Reset route | VERIFIED IN SOURCE | `src/app/api/auth/password/reset/route.ts:1` re-exports `backend/api/auth/password/reset/route.ts:8`. Public POST; valid, unexpired, unused token required. Success 200 `{message:"Password reset successfully."}`. Missing/used/expired token returns 400 with the same invalid-or-expired message; malformed body/fields also 400, quota rejection 429 with Retry-After, unexpected exception generic 500. |
| Generic forgot acknowledgment | VERIFIED IN SOURCE | Forgot route lines 53-55: "If an account exists and delivery is available, you will receive password reset instructions." Missing provider configuration, rejected recipient and caught delivery failure do not turn this into an account/delivery confirmation. Other exceptions before that acknowledgment can still return 500. |
| Input validation | INCOMPLETE | `src/lib/api/validation.ts:477` validates email format but has no explicit 254-character bound or schema trim before validation. Reset at line 481 accepts a token string of 32-256 characters and existing password rules (lines 25-31: 8-128, uppercase/lowercase/digit). These schemas do not reject unknown fields. `src/lib/api/response.ts:78` uses unbounded `request.json()` at application level, unlike existing 4 KiB bounded registration parsing. Infrastructure limits are UNKNOWN. |

The native registration handler in `src/lib/auth/web-registration.ts` stores the
same PasswordCredential hash format used by website/password login. Recovery finds
User by normalized email, not by registration channel, name or selected role.
No `emailVerified` prerequisite is present in forgot/reset or password authorization
(`backend/auth.ts:57`). Reset does not update `emailVerified`, Profile role/status,
team/organization associations or PIN credentials. A suspended account remains subject
to the existing sign-in/session suspension checks after changing its password.

## 2. Token, transaction and session security

| Finding | Classification | Evidence / practical limit |
| --- | --- | --- |
| Token entropy and database representation | VERIFIED IN SOURCE | `src/lib/auth/password.ts:24` uses 32 cryptographically random bytes encoded as hex; line 28 hashes with SHA-256. `PasswordResetToken.tokenHash` is stored, not the raw link token. Token hashes are unique. Raw token possession authorizes reset until expiry/use. |
| Expiry | VERIFIED IN SOURCE | Forgot route line 35 sets 30 minutes. Reset route line 28 rejects expired/used/missing tokens before hashing; its transactional claim at line 35 rechecks strict future expiry after any wait. Email GET alone does not consume the token. |
| Single use and concurrent same-token protection | VERIFIED IN SOURCE | Reset route lines 33-41 claims by id/hash/usedAt:null/expiry using updateMany; exactly one claimed row is required. Claim and password/session changes are one Prisma transaction. A failure rolls back token consumption and password/session writes together. Concurrent behavior remains UNKNOWN until authorized database-backed verification. |
| Password storage | VERIFIED IN SOURCE | Reset reuses `hashPassword()` in `src/lib/auth/password.ts:7`: random 16-byte salt, scrypt, format `scrypt:<salt>:<derived-key>`, not plaintext. No hash returned to the client. |
| All-session revocation and remaining tokens | VERIFIED IN SOURCE | `src/lib/auth/session-registry.ts:45` upserts PasswordCredential, increments User.sessionVersion, revokes all active AuthSession rows and marks all unused reset tokens for that user used. Auth.js/middleware registry validation rejects old versions/revoked/expired sessions (`session-registry.ts:22`, `backend/auth.ts:177`). |
| Role and identity preservation | VERIFIED IN SOURCE | changePassword targets an existing userId, not a caller-supplied role or account link. It does not create User/Profile, link a matching phone, change roles or update MobilePinCredential. Reset is not profile approval or a verified-email flag. |
| Credential enrollment policy | INCOMPLETE | Forgot route checks only that User exists, not that PasswordCredential exists. changePassword uses upsert. Thus a valid email reset can also create a website password for an existing email-bearing OAuth/other account. This is an existing compatibility policy, not necessarily an exploit; owner decision is needed before narrowing it. Do not silently change website behavior or call this PIN recovery. |
| Token cleanup and repeated requests | INCOMPLETE | No reset-token cleanup caller was found in backend/src; used/expired tokens accumulate. Repeated forgot requests create additional valid tokens; a later successful reset invalidates unused siblings, but merely requesting another link does not invalidate earlier links. Delivery failure leaves the created token unused until expiry/reset. |

Password change invalidates **all** Auth.js registry sessions for that User, including
a separate PIN-authenticated session if that same User has both credential types.
This preserves existing account-wide revocation; the PIN hash itself remains unchanged.
Reset does not automatically clear a native vault on another device: that app must
detect the invalid session through existing session/protected-request verification.
The current Flutter controller already clears invalid authority on verification and
handles scoped vault removal; an eventual native reset screen must use that lifecycle,
not assume an old cached identity remains valid or mint a new session.

## 3. Email delivery versus email verification

| Finding | Classification | Evidence |
| --- | --- | --- |
| Recovery delivery service | VERIFIED IN SOURCE | `src/lib/email/resend.ts:39` sends the reset link through Resend. No SMS or OTP service is used by password recovery. RESEND_API_KEY is required to send; sender priority is RESEND_FROM_EMAIL, EMAIL_FROM, then the existing source fallback. A configured API key alone does not prove provider/sender authorization. |
| Staging recipient isolation | VERIFIED IN SOURCE | `resend.ts:7` checks canonical origin and exact normalized recipient membership. When AUTH_STAGING_ORIGIN or a recipient policy is present, missing/malformed policy fails closed. STAGING_EMAIL_RECIPIENTS: comma-separated 1-20 valid emails, each <=254 characters, policy <=5100; no wildcard/domain matching. |
| Delivery failure handling | VERIFIED IN SOURCE | Forgot route lines 42-50 catches dispatch failures and logs a fixed delivery-unavailable label without recipient/token/provider body. Send result/provider acceptance is not mailbox delivery. The client acknowledgment is generic even when delivery is unavailable. |
| Timeout / timing behavior | INCOMPLETE | Recovery `sendPasswordResetEmail()` awaits fetch without an explicit timeout (`resend.ts:55-74`), unlike the adjacent registration sender with a 10-second timeout. Forgot awaits delivery only for existing accounts, so observable latency can vary by account existence/provider state. No runtime enumeration or stall was measured. |
| Other email mechanisms | VERIFIED IN SOURCE | Legacy `src/lib/auth/email-registration.ts` handles email OTP registration separately; conditional Auth.js Nodemailer magic links use SMTP (`backend/auth.ts:32`), and Prisma VerificationToken is distinct from PasswordResetToken. Neither OTP nor SMTP magic-link configuration is required by this recovery route. Do not substitute them for the approved password flow. |
| Effective mail readiness | UNKNOWN | No environment values, provider console, recipient mailbox, sender DNS, delivery logs or credentials were accessed. No mail was sent. |

Required configuration **names only**, with effective compliance **UNKNOWN**:

- `DATABASE_URL`: compatible isolated database for User/PasswordCredential/reset tokens
  and session registry; `AUTH_SECRET`: existing Auth.js session signing/encryption.
- `AUTH_URL` / `NEXTAUTH_URL`: canonical origin selected by `authOrigin()`; explicit in
  production/staging and consistent if both present. Staging `AUTH_STAGING_ORIGIN`
  must approve the same separate public HTTPS origin, no credentials/path/query/fragment.
  See `src/lib/auth/redirect.ts:6` and line 29. Do not derive reset destinations from
  Flutter input, arbitrary callback URL, Host or forwarded headers.
- `RESEND_API_KEY`; `RESEND_FROM_EMAIL` or `EMAIL_FROM`: source accepts a validated
  email value (`src/lib/env.ts:17,64`), not arbitrary display-name text. Although the
  sender has a fallback, verify an approved provider-authorized sender before activation.
- `STAGING_EMAIL_RECIPIENTS`: approved staging recipient allowlist as above. Never
  list its private contents here. No unapproved real recipient should be used.
- `PASSWORD_SIGNIN_HMAC_KEY`: existing password-login admission prerequisite after
  reset; forgot/reset currently use the separate process-memory limiter, not this key.
  PIN activation/pepper variables are not a dependency of password recovery.

No required variable is claimed missing; presence/compliance was not inspected live.

## 4. Flutter inventory and navigation

| Screen / layer | Classification | Actual source behavior |
| --- | --- | --- |
| Active Sign In -> Forgot Password | VERIFIED IN SOURCE | `mobile-app/lib/features/auth/auth_form_screen.dart:474` navigates to `/forgot-password`. `app/homezone_app.dart:138` and `features/auth/auth_screens.dart:32` construct the existing branded form in service mode. |
| Active service Forgot / Reset submission | INCOMPLETE | `auth_form_screen.dart:109` explicitly reports recovery unavailable and sends nothing. `auth_screens.dart:34-46` does not accept/pass the repository or reset capability. No account recovery is performed by these screens. Their validation/design remain usable. |
| Existing legacy API adapter screen | INCOMPLETE | `features/marketplace/account_access_screen.dart:32` can POST forgot/reset via the shared repository, protected:false, with email or token/new password. It has busy/complete/error state and obscured manual token input. No AccountAccessScreen constructor use was found outside its own definition; current routes do not use it. It checks merely that response.message is a string and lacks route/generation guards at the widget layer. Do not add another repository or blindly wire this whole legacy UI. |
| Cookie lifecycle after logout/failed restore | INCOMPLETE | `marketplace_repository.dart:151` routes public mutations through the cookie coordinator; only catalogue GETs have a cookie-free exception. `core/api/cookie_request_coordinator.dart:116` rejects a locallyInvalidated boundary. Thus protected:false alone does not make legacy recovery usable after logout. A future adapter needs an explicit owned/stateless public-recovery admission strategy on the existing client, preserving account-generation safeguards. Do not weaken the coordinator or reset another account's state from a screen. |
| Check Email / success screens | VERIFIED IN SOURCE | `features/auth/recovery_screens.dart:5,70` explicitly label local preview; email open/resend buttons send nothing and do not open email. They must not become delivery/password-change proof through navigation alone. |
| Native reset link intake | MISSING | Main Android manifest lines 26-29 has launcher filter only; no approved HTTPS reset-link intent filter. `ios/Runner/Info.plist` has no URL-type reset scheme; no associated-domain entitlements were found. SceneDelegate is empty subclass. Current named reset route receives no validated reset link/token. No app_links/uni_links dependency or application-specific reset-link handler found. |
| Native new-password form | INCOMPLETE | Existing AuthForm validates password/confirmation, but service submission is blocked and no capability is connected. The legacy screen manually accepts a token. Never infer a token from email or simulate reset without one. |
| Post-reset sign-in and role | VERIFIED IN SOURCE | Existing email/password CSRF/callback/session protocol and confirmedProfile/dashboard gate can be reused after a genuine reset. User must sign in separately, fetch actual role/status and pass existing checks. No automatic role change or account creation belongs in recovery. Actual reset-to-login behavior is UNKNOWN. |

## 5. Security findings and release gates

| Priority | Finding / classification | Evidence and smallest safe response |
| --- | --- | --- |
| High | Recovery abuse protection INCOMPLETE | `src/lib/api/rate-limit.ts:23,78,92` uses a process-local Map and caller IP headers. Forgot 5/min, reset 8/min; no adapter installation was found outside its definition. Not a replica-wide/per-email/global send budget; resets/restarts/distributed sources can bypass intended aggregate protection. Proxy-header trust is UNKNOWN. Plan separate recovery-purpose database admission using the existing infrastructure, private HMAC identifiers, bounded cleanup and reviewed limits; do not reuse registration/PIN counters. Do not activate unrestricted recovery based only on these memory limits. |
| Medium | Account-enumeration resistance INCOMPLETE | Normal forgot replies are generic and do not return User/token, but existing-user-only token creation/mail await causes timing differences. `authOrigin()` is outside the delivery catch and invoked only for existing users, so invalid canonical configuration can also cause a 500 for a known email while unknown email returns 200. Validate configuration independently and design bounded delivery handling without account-specific client diagnostics. No exploit was exercised. |
| Medium | Reset-token exposure hardening INCOMPLETE | The email deliberately contains a bearer token in the query. `/auth` passes it to the client; no reset-specific URL scrubbing/no-referrer policy or explicit no-store response was found. `middleware.ts:25` sets strict-origin-when-cross-origin: cross-origin paths are suppressed, same-origin referrers can contain the query. Browser/history/email tracking/reverse-proxy telemetry need review; no actual leak or cache behavior was observed. Keep token in memory only for reset submission; remove from visible URL when safely captured, exclude from logs/analytics and review reset-page/referrer/cache headers. Do not persist token in the session vault or navigation history. |
| Medium | Body bounds / diagnostics INCOMPLETE | Shared parseJson lacks explicit byte bounds for these routes. Recovery delivery logs are fixed/safe, but unexpected failures pass raw Error.message/stack through `src/lib/logging/logger.ts:41`; sanitization of Prisma/provider errors is not guaranteed. No request bodies are explicitly logged by the handlers. Use bounded parsing and stage/category diagnostics rather than serializing credentials, token material, hashes or provider payloads. Actual log disclosure UNKNOWN. |
| Medium | Credential compatibility policy INCOMPLETE | Public reset/admin action can upsert a website password onto an existing user without PasswordCredential. Admin UI hides password reset for confirmed PIN-only accounts; server action does not enforce that UI capability. Resolve policy before adding a new server guard; never alter the PIN hash or call this PIN recovery. |
| Medium | Token lifecycle operations INCOMPLETE | Repeated requests accumulate tokens; no bounded expiry cleanup found. Define retention/cleanup alongside admission, without invalidating existing user sessions merely for requesting recovery or automatically retrying uncertain reset mutations. |
| Review boundary | Origin / CSRF behavior VERIFIED IN SOURCE, deployment UNKNOWN | `/api/auth` is exempt from middleware mutation origin/auth checks (`middleware.ts:16,47`), and forgot/reset do not add route-specific Origin/Sec-Fetch-Site checks. They do not use Auth.js CSRF tokens. Reset authority is the explicit secret token, not an ambient session; forgot can cause mail traffic. This is not evidence of a session-only reset bypass. A future exact-route browser/native-aware policy must preserve native no-Origin requests and existing website behavior; do not require login for account recovery. |

## 6. Prisma and admin compatibility

**VERIFIED IN SOURCE:** `prisma/schema.prisma:435` PasswordCredential has unique
userId; PasswordResetToken at line 464 has unique tokenHash, usedAt, expiry, User FK
with cascading deletion and userId/expiry indexes. Existing migration
`prisma/migrations/20260704_password_auth_v1/migration.sql:10` supplies the reset
table/constraints. `20261010_auth_session_revocation/migration.sql:1` supplies
User.sessionVersion/AuthSession required by changePassword. No new reset model or
migration is necessary just to connect existing forgot API and browser link reset.
**UNKNOWN:** applied migration history, deployed client compatibility, constraints,
data health and backup state. No database or Prisma command was run.

**VERIFIED IN SOURCE:** `backend/api/admin/users/[id]/password/route.ts:17` handles
PATCH `/api/admin/users/<profile-id>/password`, requires session + isAdminRole,
existing password complexity and reason (3-500), hashes server-side and invokes the
same transactional changePassword helper. Audit log records actor/profile/reason,
not password/hash/token. Roles are not changed by this action. Hashes are not queried
from the target or returned; MobilePinCredential is not read or written by it.

**INCOMPLETE:** `src/components/admin/admin-action-panels.tsx:87` is only a UI
credential-capability guard; the server still supports upsert for any authorized
target. Audit recording occurs after the password transaction, so audit-write failure
can produce a failed response after a committed password change. Do not automatically
retry that mutation or claim rollback from a 500. This is an existing admin policy/
audit consistency issue, not authorization to change it in this recovery audit.

## 7. Smallest implementation step and dependency order

1. **Recommend next source slice: connect only active Forgot Password request.**
   Pass the existing MarketplaceRepository through HomezoneApp ->
   ForgotPasswordScreen -> AuthFormScreen. Add one focused recovery operation on the
   existing client/controller architecture, explicitly addressing the locallyInvalidated
   boundary without clearing a newer account or introducing another client/auth system.
   Normalize/validate email, submit only `{email}`, validate the generic acknowledgment,
   preserve loading/route/generation guards and accurate timeout/429/network messages.
   Do not display delivery success, account existence or reset completion.
2. For that first slice, keep reset-link completion on the **existing canonical website
   reset page**, opened by the user's email client. Explain that the user returns to
   HomeZone and signs in with the new password. This reuses supported infrastructure
   without inventing a native token channel, OTP or insecure manual reset shortcut.
3. Before public/live activation, review and source-harden recovery-specific admission,
   bounded input/delivery, enumeration behavior and token/log/referrer protections in
   small reviewable changes. Confirm existing password-enrollment/admin policy before
   narrowing compatibility. Reuse existing quota primitives if suitable; approve actual
   limits separately. No migration or new secret is automatically required by this plan.
4. If fully native reset is required, separately approve platform/domain link ownership,
   exact environment/path/query validation, Android verified links/iOS associated domains
   and a one-use in-memory token handoff to the existing reset form. Do not accept arbitrary
   host links or send tokens to a different environment. Domain association/signing and
   hosting prerequisites are not source-only runtime evidence.
5. After source review, separately authorize builds/checks, then controlled staging
   verification with an approved existing account/recipient and provider configuration.
   Forgot creates token rows and sends email; reset writes a credential and revokes
   sessions. Both need explicit live-mutation/recipient authorization. No such operation
   is authorized or performed by this audit.

Later acceptance evidence: unknown/known email generic responses; delivery-unavailable
behavior; malformed/expired/used token rejection; simultaneous same-token one-success
claim; rollback on injected failure; old sessions denied; unaffected other accounts;
new password works/old password fails; role/suspension retained; app restart/logout
and recovery after logout; no token/credential/PII in captured diagnostics. Collect no
raw links, tokens, passwords, cookies or hashes. `docs/STAGING_AUTH_VERIFICATION.md`
is a useful historical checklist, not execution evidence; its origin-fallback wording
is superseded by the current fail-closed `authOrigin()` implementation.

## Execution record / review boundary

Only `mobile-app/docs/HOMEZONE_PHASE_1_PASSWORD_RECOVERY_AUDIT.md` was created.
No application source, approved registration fields, PIN system, website authentication,
configuration, schema or prior user changes were modified. No database access, migrations,
accounts, emails/OTPs, requests, tests, builds, device actions, Railway changes,
credentials, deployments/restarts, commits or pushes. Stop for founder review; source
implementation of the recommended recovery slice requires the next instruction.
