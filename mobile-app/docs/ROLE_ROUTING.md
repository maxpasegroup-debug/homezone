# Role persistence and dashboard routing — 2026-10-30

Source-only inspection and correction. No runtime authentication or persistence
verification was performed.

## Authoritative flow

- Prisma UserRole: USER, OWNER, BROKER, BUILDER, SERVICE_PROVIDER, ADMIN,
  SUPER_ADMIN. Profile.role defaults to USER and is stored in PostgreSQL.
- RoleScreen is an offline-preview selector. It passes a display label as a
  navigation argument; the preview form displays it and its success screen is
  not evidence of account creation. The screen explicitly says roles are local.
- In service mode /roles and /sign-up use RegistrationScreen, not RoleScreen.
  Registration sends only name, email and password. The strict backend schema
  does not admit a role. Email OTP verification creates User, PasswordCredential
  and Profile together, explicitly assigning USER. No additional profile field
  is required for this default registration.
- Auth.js reads Profile.role on session processing and returns the normalized
  role. BUYER is a legacy alias for USER; absent/unrecognized backend roles
  normalize to USER. Flutter identity comes from the independent session check,
  never a role label or registration acknowledgment.
- Startup awaits protected-storage restoration and server session verification.
  Verified sessions enter /buyer; others enter splash/onboarding. Login and
  completed OTP plus verified login also enter /buyer.
- /buyer and /workspace now confirm GET /api/mobile/account?view=profile before
  presenting the dashboard. The supported profile role must equal the current
  session role; generation and actor checks reject stale account responses.
  SUSPENDED, malformed, incomplete or mismatched profiles cannot unlock a
  dashboard. PENDING/REJECTED verification is not a new global account ban.
- USER opens marketplace; OWNER, BROKER, BUILDER and SERVICE_PROVIDER use the
  existing role workspace. ADMIN/SUPER_ADMIN retain the existing web-admin
  direction. Backend endpoint permissions remain authoritative.
- Authenticated entry into registration routes returns to this dashboard flow.
  Public /discovery and offline preview remain separate and unchanged.

## Confirmed gaps and correction

The reported select-role/success/select-role-again sequence is consistent with
the offline preview, whose selection is intentionally not persisted. Source alone
cannot identify which APK/configuration produced the report or prove a runtime
restoration failure. Service registration deliberately assigns USER; silently
persisting the UI selection would change backend policy.

Added ProfileDashboardGate and updated HomezoneApp to confirm the profile, show
loading and actionable retry/sign-in feedback, handle unknown roles safely, and
prevent already-authenticated users from repeating registration. A mismatch
requires retry or fresh sign-in; the profile response never rewrites identity or
promotes a user. Missing role/status cannot confirm routing; nullable fullName,
city and phone are not made mandatory. The existing profile API may create a missing default profile
through getOrCreateProfile; no backend behavior was changed and no API was called.

## Owner decisions and future verification

Additional self-selected registration roles need an explicit backend onboarding
and approval policy. Do not accept arbitrary roles, teams or associations through
registration. Missing/unsupported roles remain an account-support case rather
than grounds for local role assignment.

Later authorized verification must cover each server-provisioned role, fresh USER
registration, restart restoration, stale roles after a server role change,
profile errors/incompleteness, suspension, logout and cross-account races. It
requires approved staging accounts and device/build authorization; none were
created or used here. Android presentation and authentication runtime remain
unverified independently of the earlier catalogue connection evidence.

Files changed in this task: lib/app/homezone_app.dart,
lib/features/auth/profile_dashboard_gate.dart and this document. Existing modified
and untracked files were preserved. Checks were source reads and read-only Git
status/diff only. No tests, builds, analysis, device operations, HTTP requests,
database operations, environment changes, commits, pushes or deployments occurred.
