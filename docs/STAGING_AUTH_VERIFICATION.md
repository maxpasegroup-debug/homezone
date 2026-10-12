# HOMEZONE staging authentication verification

Status: application preparation only. No staging infrastructure, database migration,
PostgreSQL integration test, browser verification or deployment has been performed.

## Infrastructure gate — infrastructure administrator

- [ ] Provision a new PostgreSQL database dedicated to staging. Record non-secret
  provider/project/environment/database identifiers and the responsible owner.
- [ ] Confirm it contains no production data and does not share production's
  database, schema, credentials or application service. Never infer isolation from
  a variable's name or a connection string alone.
- [ ] Provision and verify a separate HTTPS hostname and certificate. Confirm
  ownership and DNS routing to the isolated staging service, including HTTPS
  forwarding. Do not route staging traffic or callbacks to production.
- [ ] Authorize the specific staging target for migration and disposable-data tests.
- [ ] Supply credentials through staging's secret manager only. Do not put database
  URLs, passwords, reset tokens or session cookies in this document or test logs.
- [ ] Give the migration identity the required PostgreSQL schema/DDL permissions;
  prefer a separate, least-privileged runtime identity. Confirm connectivity and
  any direct-connection requirements with the provider before running migration tools.
- [ ] Configure an isolated mail sandbox/capture service with restricted test
  recipients. Keep payment, AI, webhook, upload and other external integrations
  disconnected from production; do not send verification mail to real users.

## Origin and environment gate — application/infrastructure owners

- [ ] Configure `AUTH_STAGING_ORIGIN` with the exact approved HTTPS origin and set
  `AUTH_URL` to the same origin. If `NEXTAUTH_URL` is also present, keep it consistent.
  These are staging-only settings; do not change production variables.
- [ ] Use an origin only: no credentials, wildcard, path, query, fragment or internal
  hostname or the existing production origin. The implementation requires canonical lowercase ASCII hostname syntax
  and rejects IP literals and local/internal suffixes. An optional final slash is
  accepted. This syntax check does not establish DNS ownership or isolation.
- [ ] Confirm the active origin explicitly before testing. `AUTH_STAGING_ORIGIN`
  approves an origin but does not select it: without `AUTH_URL`/`NEXTAUTH_URL`, a
  production-mode build still uses the existing production-origin fallback.
- [ ] Keep the staging auth secret separate from production. Use isolated database,
  mail and any approved OAuth configuration. Disable demo authentication for security
  verification. Never copy production secrets or import production environment files.
- [ ] Verify secure, HttpOnly, SameSite session cookies over staging HTTPS and confirm
  malicious Host/forwarded headers cannot alter callback or recovery destinations.

## Migration gate — database/application owners

- [ ] Review all pending SQL and the PostgreSQL provider lock metadata. The Phase 4D
  migration adds `User.sessionVersion` and `AuthSession`; it does not replace
  Auth.js's JWT strategy with Prisma's existing `Session` table.
- [ ] Replay migration history on the authorized empty staging database, compare its
  resulting schema with `prisma/schema.prisma`, and inspect migration status/history.
  Any shadow database used for drift checks must also be isolated and authorized.
- [ ] Verify interrupted migration recovery with the installed Prisma version.
  The existing SQL has no explicit transaction wrapper and uses non-idempotent DDL.
  Do not assume `migrate resolve --rolled-back` undoes schema changes or that a retry
  can safely ignore existing objects. Inspect and reconcile both schema and migration
  records before any retry; keep reviewed SQL/checksums and failure evidence.
- [ ] Apply the reviewed migration before running authentication code that requires
  the registry, and regenerate Prisma Client as part of the staging build process.
- [ ] Plan for existing cookies to require fresh sign-in and for a 30-day absolute
  session lifetime. Assess database query latency, connection limits and registry
  growth; assign an owner for expiry-based cleanup. No cleanup job exists yet.

## Integration gate — application/test owner

- [ ] Use disposable accounts and record only their non-secret IDs. Test the actual
  handlers/Auth.js callbacks with PostgreSQL, not the serialized in-memory fixtures.
- [ ] Send two simultaneous valid requests to `POST /api/auth/password/reset` using
  the same token. Exactly one succeeds; reuse and expired tokens fail.
- [ ] Inject a controlled database failure after token claiming and confirm password,
  token consumption, user version and session revocation all roll back together.
- [ ] Verify reset and `PATCH /api/admin/users/<profile-id>/password` reject affected
  old sessions while allowing new sign-in and preserving other users' sessions.
- [ ] Exercise Auth.js CSRF-protected logout. Replay the copied cookie and attempt
  renewal: both must fail. Inject revocation failure and verify an error, not a
  successful cookie-only logout. Invalid, missing, expired and legacy claims fail.
- [ ] Over staging HTTPS, verify signup, sign-in, protected-page refresh/renewal,
  onboarding, sandbox recovery, reset, logout and safe internal redirects. Confirm
  no callback, recovery link or browser request navigates to production.
- [ ] Run the build and full regressions using verified staging configuration only.
- [ ] Remove only verification-created data identified by its recorded IDs. Retain
  sanitized test results, schema comparisons, migration status, SQL checksums,
  application revision and browser evidence. Never retain raw credentials or cookies.

## Recovery references

Prisma 6's [migration-history guidance](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/migration-histories)
requires the provider lock file to accompany migrations. Its
[failed-migration recovery guidance](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/patching-and-hotfixing)
distinguishes migration-record reconciliation from undoing partially completed SQL.
No migration or recovery command is authorized for production by this checklist.
