# Mobile authentication source handoff — 2026-10-30

This is source inspection and implementation, not runtime verification. Existing
catalogue changes and evidence files were preserved. No backend or environment
configuration was changed.

## Supported contract

The service registration screen uses email OTP, not phone OTP. The origin-only
staging configuration remains `https://homezone-staging.up.railway.app` and must
be explicitly supplied through the existing build/launch mechanism.

| Operation | Method/path | Request / result |
|---|---|---|
| Start registration | POST /api/auth/password/signup | name, normalized email, password; 202 challengeId, expiresAt, expiresIn, resendAt, resendAfter, message |
| Resend | POST /api/auth/password/signup/resend | challengeId; replacement challenge metadata |
| Verify | POST /api/auth/password/signup/verify | challengeId, six-digit code; verified: true |
| CSRF | GET /api/auth/csrf | csrfToken, bound to the Auth.js CSRF cookie |
| Password login | POST /api/auth/callback/password | Form-encoded csrfToken, email, password, callbackUrl; independently check session |
| Session | GET /api/auth/session | Verified user id, server role and expiry; never infer identity from stored cookies |
| Logout | POST /api/auth/signout | CSRF-protected form; server revocation plus local credential clearing |
| Profile | GET /api/mobile/account?view=profile | Requires verified session; server profile |
| Profile update | PATCH /api/mobile/account?view=profile | city, phone; does not assign roles or verify a phone |

Registration validates name 2–120, email at most 254, password 8–128 with upper,
lower and digit. Login requires a password without imposing new-password rules.
Backend errors include 400 invalid/expired/used challenge, 403 security rejection,
429 throttling with retry metadata, and 503 availability/delivery failure. These
must not be interpreted as successful account creation or authentication.

## Correction in this task

Logout or failed restoration leaves the cookie coordinator locally invalidated.
Unlike password sign-in, registration previously had no way to admit a fresh
anonymous workflow, so its first request could fail locally before HTTP.

The controller now admits new registration through its protocol ownership guard.
Only an invalidated boundary is reopened; active authentication, restoration and
logout are refused. Generation and boundary are rechecked after lifecycle
listeners. Resend/verification do not reopen the boundary. No identity is granted,
no cookies are minted, and the existing coordinated HTTP path remains mandatory.

## Existing security and persistence

Email challenges expire after ten minutes, allow five verification attempts and
are claimed atomically. Account creation uses the existing transaction, scrypt
credential and default USER profile. Existing accounts are not overwritten.
Registration quotas remain database-backed: 5,000 requests/hour, 100 deliveries/hour,
three deliveries per email/hour, 60-second email cooldown, 1,000 verifications/hour.

Auth.js cookies, CSRF binding, session-registry revocation and generation checks
remain unchanged. Platform-protected storage is scoped to environment/origin;
restoration independently checks the session. Storage failures can leave sessions
memory-only. Logout clears local authority even if remote revocation is uncertain.
Password login permits existing unverified-email accounts under the separate web
registration policy; this is not proof of email ownership.

## Blockers and owner verification

- Phone registration/login is not implemented by these contracts. Existing
  /api/auth/otp/send and /verify require an authenticated user. sendOtpMessage
  returns delivered:false, including provider_integration_pending when configured.
  Do not wire these endpoints into public registration or use demo OTP login.
- The separate authenticated phone verifier needs a security review before use:
  lookup precedes an unconditional consumption update, allowing concurrent claims;
  its limiter is process-local. It was not changed or enabled in this task.
- Account recovery/reset also use coordinated anonymous requests; the analogous
  locally-invalidated boundary handling remains a follow-up outside this
  registration correction. Automatic reset-link app handling is not configured.
- Effective Railway variables remain owner-unverified: DATABASE_URL, AUTH_SECRET,
  OTP_PEPPER, PASSWORD_SIGNIN_HMAC_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL or EMAIL_FROM,
  STAGING_EMAIL_RECIPIENTS, AUTH_URL, NEXTAUTH_URL, AUTH_STAGING_ORIGIN,
  NEXT_PUBLIC_SITE_URL, NODE_ENV and disabled demo-login flags. Canonical URLs must
  agree with the staging origin; email recipients must be explicitly approved.
- No auth flow, secure-storage restoration, revocation, role routing or OTP email
  delivery was exercised. Android presentation remains a separate unresolved issue.

Future verification needs explicit build/device and authentication-test approval,
an owner-approved staging test account and approved email recipient provisioned
securely outside chat. Include registration after logout/failed restore, resend,
wrong/expired/used codes, throttling, duplicate email, session restart/revocation,
logout failure, network failure and role routing. Do not send OTPs or create
accounts before that authorization.

Checks performed: read-only Git status/diff and source/configuration inspection.
No tests, analysis, builds, runtime requests, device operations, database operations,
environment changes, commits, pushes or deployments were performed. A Python
file-edit attempt could not start because Python was unavailable; edits were then
applied using the patch tool.
