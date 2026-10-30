# Role-based authentication audit

Date: 2026-10-30. Baseline main/18ebcb401e95e178c1bc3f9f16faea735a044063. Verdict: **IMPLEMENTED IN SOURCE; deployed staging activation BLOCKED BY ENVIRONMENT at last observation; runtime authentication UNKNOWN**.

## Source journey and contracts

| Stage | Source | Actual behavior and classification |
| --- | --- | --- |
| Startup | mobile-app/lib/main.dart | HOMEZONE_ENABLE_API defaults false. With service defines builds one API/session/repository graph and shows loading while restoreSession validates saved credentials. IMPLEMENTED IN SOURCE. |
| Entry/routes | app/homezone_app.dart; features/auth/splash_screen.dart; onboarding_screen.dart | Unauthenticated onboarding/public discovery separate from authenticated /buyer route and fictional /buyer-preview. /buyer is a shared route name, not permission to be USER. |
| Role selection | features/auth/role_screen.dart; role_first_auth_screen.dart | Five options map Buyer→USER, Owner→OWNER, Broker→BROKER, Builder→BUILDER, Service Provider→SERVICE_PROVIDER; no public ADMIN/SUPER_ADMIN. Selected role temporary only. |
| Sign-in/up navigation | mobile_pin_auth_screen.dart | Role selection opens sign-in directly, Create a new account below preserves selected role. Matches founder's later compact UX decision; no extra chooser page needed. |
| Registration | POST /api/mobile/auth/register; src/app/api/mobile/auth/register/route.ts → src/lib/auth/mobile-pin-registration.ts | Strict bounded JSON {mobileNumber,pin,confirmPin,role}; no extra privilege fields. Account/profile/credential atomic; generic acknowledgment then separate sign-in, not automatic authenticated success. API CONNECTED — RUNTIME UNVERIFIED. |
| Normalization | src/lib/auth/mobile-number.ts; Flutter form validation | IN region; 10-digit national starting 6–9, +91/91 forms and approved separators; canonical +91. Exactly six ASCII digits as string, leading zeros preserved. Syntax is not ownership/reachability proof. |
| Hashing | mobile-pin-hash.ts | Salt16 bytes, scrypt v1 N32768/r8/p1, derived64 bytes, HMAC pepper/purpose/number/PIN, timing-safe compare, unknown-user dummy KDF, two concurrent derivations/process. IMPLEMENTED IN SOURCE, real capacity UNKNOWN. |
| CSRF | core/api/password_auth_protocol.dart | GET /api/auth/csrf; coordinator owns cookie/CSRF generation. Existing Auth.js validation, no manually minted session. |
| Login | POST /api/auth/callback/mobile-pin via Auth.js catch-all src/app/api/auth/[...nextauth]/route.ts; backend/auth.ts; mobile-pin.ts | Form-encoded phone,pin,csrfToken,callbackUrl. Provider authorize returns existing user only after credential/profile/suspension/version checks. Selected role is NOT used to grant server permissions. |
| Session | backend/auth.ts; src/lib/auth/session-registry.ts | Existing JWT cookie strategy plus database AuthSession registry, sessionVersion, expiry and revocation/suspension checks; 30-day maxAge in source. GET /api/auth/session independently verifies result. |
| Profile | GET /api/mobile/account?view=profile | Profile fields fullName,city,phone,role,verificationStatus; derived authenticated user, never arbitrary actor ID. Handler getOrCreateProfile can create a missing profile for other auth users: do not assume every authenticated GET is inherently DB-write-free. PIN users require profile during login. |
| Role mismatch | mobile_pin_auth_screen.dart: profile-role comparison before navigation | Actual profile role must equal verified session role and selected role; signout and clear explanatory message on mismatch; no account role change during login. IMPLEMENTED IN SOURCE. |
| Dashboard gate | profile_dashboard_gate.dart; app/homezone_app.dart | Profile/session/generation confirmation; PENDING/VERIFIED/REJECTED accepted, SUSPENDED rejected. USER marketplace, other roles WorkspaceScreen. Backend remains authoritative. |
| Persistence | core/api/session_vault.dart; SessionVaultBridge.kt | Environment/origin-scoped cookies only, Android Keystore-backed AES-GCM ciphertext. No PIN/password persisted. Storage failure must not be claimed as persisted session. |
| Restore/expiry | features/auth/sign_in_controller.dart | OS credential read capped at5s; independently verifies session, schedules expiry, revalidates on app resume. Stale-generation results cannot become newer account state. Caught restore/revalidation failures clear local auth, including transient network failure; conservative UX limitation. |
| Logout | controller/protocol → POST /api/auth/signout with CSRF; session-registry.ts | Revocation callback and local state/secure-storage deletion; UI distinguishes server acknowledgment failure from local clearing. Failure cannot be declared successful revocation. |

## Required backend protections

Registration: origin when supplied must exactly equal authOrigin(); sec-fetch-site cross-site rejected. Native missing Origin allowed; origin checks do not make endpoint inaccessible to non-browser callers. Bounded JSON is reused from registration-admission.ts. Literal AUTH_MOBILE_PIN_ENABLED true gates registration and provider. DB quotas before KDF; independent namespace mobile-pin:registration:v1, defaults 5000 requests/hour,100 valid attempts/hour,3/mobile/hour,10/ingress-IP/hour. Trusted header selection requires proven proxy guarantees, otherwise clients share one conservative bucket.

Login: mobile-pin-admission.ts uses MobilePinLoginBudget DB counters and row locks; global default300/5min, number5 failures/15min,10000 tracked identities, bounded cleanup. Success doesn't consume failure allowance or erase unexpired failures. Blocked attempts do not extend denial window. No per-IP rotation bypass of the canonical-number budget. Actual PostgreSQL concurrency and multi-replica performance remain UNKNOWN.

MobilePinCredential normalizedMobile and userId unique; migration CHECKs enforce canonical format/hash version. Registration never upserts existing credentials/roles or auto-links editable Profile.phone. Legacy phone collision is generic acknowledgment without enrollment. New User.emailVerified=null; Profile role selected from server public enum, verificationStatus=PENDING, whatsappVerified=false. No teams/organizations/admin assignments from request.

## Configuration and deployment state

Required names: DATABASE_URL, AUTH_SECRET, NODE_ENV=production, explicit AUTH_URL and/or NEXTAUTH_URL (if both, consistent), staging AUTH_STAGING_ORIGIN equal staging canonical origin, AUTH_MOBILE_PIN_ENABLED, MOBILE_PIN_PEPPER_V1 and MOBILE_PIN_RATE_LIMIT_KEY. Both PIN secrets require32–256 chars/no outer whitespace, independent high entropy and replica consistency. v1 pepper custody/backup required; rotation/recovery not implemented. Optional rate-limit names and exact defaults are in HOMEZONE_STAGING_READINESS_VERIFICATION.md and source. Effective settings UNKNOWN; no values inspected.

At last staging read-only check (2026-10-30 09:01:40.173 UTC), providers contained password only and callbacks used production origin. Do not infer absent provider's exact cause: disabled configuration, stale/different artifact or wrong target remain possible. Correct code registers mobile-pin only for literal true at initialization. Supplied 21/no-pending logs do not identify exact PIN checksum/schema/deployed artifact.

Local migration 20261030120000_mobile_pin_foundation and models exist; applied catalog/client compatibility UNKNOWN. Existing website/admin email/password and retained OTP routes remain backend functionality, not the active mobile login requirement. Never remove them as a side effect of PIN integration.

## Findings requiring attention, no changes made

1. **BLOCKED BY ENVIRONMENT:** deployed provider/canonical callback readiness not established; fix by approved staging rollout/configuration after identity/schema checks, not new client architecture.
2. **UNKNOWN:** actual registration, duplicate race, bad PIN, role mismatch, restart, secure-store failure and logout revocation behavior against staging.
3. **Policy discrepancy to review:** backend/api/properties/route.ts converts USER to OWNER during listing creation. Login never changes role, but later business action does. Workspace form revalidates session afterward. Do not claim roles immutable for lifetime or remove existing policy in an audit.
4. **PARTIALLY CONNECTED UX:** live marketplace help still mentions email-verified registration, inconsistent with current mobile policy. No authentication bypass implied; text correction is future scope.
5. **Deliberately MISSING:** Forgot PIN, ownership verification and pepper-rotation workflow. Accept risk/custody explicitly; no OTP should be added.
6. Role/account linking does not arise from client role choice. Existing getDemoProfile has synthetic verified-looking data behind demo identities; effective demo gates must be checked before real trial. Source normalizeRole falls back to USER for missing/unknown legacy roles; do not represent this fallback as actual backend role repair.

## Verification prerequisites

Founder-approved staging identity/deployed SHA, private config compliance, reconciled schema/client/recoverability, rollout approval and one controlled test identity/role/PIN entered privately. Account/quota/session writes, bad-PIN trials and device execution require approval. Verify real Flutter action→request→DB-backed auth→session→profile→dashboard, then true process restart and logout/denial. No secrets, cookies, OTPs or full session bodies in evidence.

No live authentication, account creation, source/configuration changes, builds/tests or database actions were performed.
