# HOMEZONE - Local blockers and staging authorization update

Date: 2026-10-24. Verdict: **READY FOR OWNER REVIEW; staging actions ON HOLD**.
Staging: **NOT VERIFIED**. Production: **NOT VERIFIED**.

Subsequent password-admission engineering is recorded in
[G7_DISTRIBUTED_SIGNIN.md](G7_DISTRIBUTED_SIGNIN.md). This report's process-local
limiter description/test counts are historical. G7 remains BLOCKED pending full
owner-approved client controls/configuration and authorized multi-instance proof.

## Scope, fixes and evidence

The six requested readiness/registration reports were reviewed alongside current
source, tests and Git state. Initial baseline: main,
9cba8d77afabedd5fbf32af638a3ee45615487e5; 36 modified, 38 untracked, nothing staged.
No secret values/config files were inspected. Existing QA evidence is retained;
this phase's logs use the separate ignored build/qa-local-blockers directory.

1. **Canonical authentication origins now fail closed.** authOrigin no longer
   implicitly selects production when production/staging config is missing.
   AUTH_URL or NEXTAUTH_URL must explicitly select a valid canonical origin;
   production/approved staging rejects conflicting selectors, and a configured
   staging approval cannot select production or local origin. Paths, queries,
   whitespace and noncanonical input are rejected. Optional trailing slash is
   supported. Development without staging approval retains loopback fallback.
   Regression tests cover missing selectors, conflicts, staging-to-production,
   invalid canonical values and existing Auth.js/cookie/redirect compatibility.
   This is route/helper enforcement, not a preDeploy database-isolation guard.
2. **Staging Resend recipient enforcement added.** Both actual registration and
   password-reset adapters validate canonical auth config and apply the server
   STAGING_EMAIL_RECIPIENTS allowlist before fetch. Whenever AUTH_STAGING_ORIGIN
   is present, a missing/malformed list denies sends. A supplied list restricts
   these adapters even without the staging marker. Configuration supports 1-20
   exact valid email addresses, comma-separated, <=5100 characters; comparisons
   normalize case/outer whitespace. No wildcards/domain/suffix/plus-alias matching.
   Rejections return safe delivery failure, never success; original registration
   cleanup/quotas remain unchanged. Mocked fetch assertions prove zero dispatches
   for denied destinations and exact destinations for two approved sends. Real
   provider/mailbox/remote configuration is NOT verified. SMTP/Google/legacy routes
   are not covered by this adapter policy and must remain disabled/out of scope.
3. **Delayed provider acceptance after expiry now explicitly regressed.** Existing
   implementation already rejects acceptance after expiry; a new fake-clock test
   proves no accepted challenge or account activation. Existing tests continue to
   cover provider completion after supersession, stale publication grants,
   resend/verification orderings, five guesses per replacement, expiry boundaries,
   overlapping quota deadlines, request admission and conditional cleanup. No
   speculative challenge rewrite was needed. A previously sent email can arrive
   late; code invalidation cannot recall it or guarantee mailbox arrival order.

No schema/migration, Flutter source, authentication ownership/provenance, CSRF or
session safeguards were changed. No shared-store/proxy identity architecture was
invented. No persistence/account deletion policy was silently added.

## Current gate disposition and exact owner deliverables

The full gate register remains in INFRASTRUCTURE_OWNER_SIGNOFF.md with requirement,
evidence, responsible approver, safe procedure and stop condition for every gate.
No owner names, remote evidence or signatures have been provided; none is APPROVED.

| Gates | Current status | Required owner deliverables before dependent activity |
|---|---|---|
| G1 isolation; G2 history/duplicates; G3 recovery | PENDING EVIDENCE | Infrastructure/DB owners: non-secret app/database/schema identities, restricted role/network access and runtime/migrator agreement; actual history/checksums/drift/pending set; count-only normalization review; encrypted backup, second isolated restore rehearsal, lock budgets and recovery approval. No database queries/migrations were run here. |
| G4 origins; G5 secrets | PENDING EVIDENCE | Infrastructure/security/secret custodians: explicit matching canonical staging manifest for backend/mobile/build/preDeploy scopes; independent staging secrets, entropy/access/rotation attestations; unused/demo providers disabled. Do not send secret values in evidence. Local guards do not attest actual deployment. |
| G6 ingress/topology | PENDING EVIDENCE | Ingress/security owner: canonical TLS/Host/proto, header overwrite/rejection, direct-origin closure, body/time/concurrency limits, repeated Set-Cookie preservation and exactly one Node process/no overlap for first tests. General rate utility still trusts forwarded headers without proven ingress. |
| G7 distributed password admission | BLOCKED | Security/infrastructure/engineering owners: approve shared atomic store/client identity/failure policy/capacity/key rotation, then implement and test before any multi-instance use. Existing password limits remain process-local and reset on restart. One-process tests do not satisfy this gate. |
| G8 restricted email | PENDING EVIDENCE | Email/security owners: approve exact controlled recipients and STAGING_EMAIL_RECIPIENTS provisioning, AUTH_STAGING_ORIGIN marker and canonical URLs, separate provider credentials, verified sender/domain, permitted counts and egress/provider restrictions; disable other email providers. Validate actual configuration only after authorization. Missing/invalid policy must block sends. |
| G9 monitoring | PENDING EVIDENCE | Monitoring/security owner: safe logging/redaction at each capture boundary, metrics/thresholds/alerts and named on-call proof. General captureException still accepts original exception text/stack; LOG_LEVEL/SENTRY_DSN do not prove safe telemetry. Resolve source leaks before affected tests. |
| G10 retention/incident/cleanup | PENDING EVIDENCE | Privacy/DB/incident owners: personal-data/mail/backup/artifact retention, scheduled or explicitly owned idle cleanup, approved fixture-account disposal without blind cascades, incident stop/resume authority and recovery runbook. Bounded on-request cleanup is not a retention guarantee. |
| G11 authorization matrix | PENDING EVIDENCE | Test authorizer: source/migration/backend/mobile artifact IDs, UTC window, endpoint methods, accounts/mailbox aliases/devices, per-case and aggregate attempts/deliveries/concurrency, observers/stop thresholds and separate permission for migration/deploy/mail/fault/race/recovery actions. All remote cases 1-16 remain unauthorized/NOT RUN. |
| G12 account/product/privacy | PENDING EVIDENCE | Product/privacy/security owners: approve controlled test disclosure and cleanup; track public privacy/support/deletion/consent policy and a real deletion/anonymization workflow before public account rollout. Persistent secure session restoration remains absent; restart requires sign-in. Local clear/cancellation is not server revocation or undo. |

## Fresh local validation

Commands run from repository root unless noted. Mocked email/storage only. No real
PostgreSQL locks, distributed deployment, inbox delivery or live session integration
were tested. Existing old reports are historical and were not used as pass evidence.

| Exact command | Result |
|---|---|
| node --test --test-isolation=none tests/registration.test.mjs | Exit 0; 39 reported tests before the additional expiry case (final registration count below). |
| node --test --test-isolation=none tests/auth-middleware.test.mjs | Exit 0; 22 reported tests. |
| npm test | Exit 0; tsc --noEmit, 6 smoke checks and 120 reported Node tests: 22 auth +21 leads +19 sessions +8 password limiter +10 mobile API +40 registration. |
| npm run lint | Exit 0. |
| flutter --no-version-check test --no-pub --reporter expanded (mobile-app) | Exit 0; full suite 293 passed, includes registration/session/marketplace tests. Cached SDK, CI/analytics suppression, no package resolution. |
| .\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma | Exit 0; matching cached Windows schema engine, inert loopback DATABASE_URL and loopback-only engine mirror. No database connection, migration or engine download. |
| git -c core.safecrlf=false diff --check | Exit 0 at interim check; final preservation check recorded below. |

Flutter analysis/formatting were not rerun because no Dart files changed; full suite
was explicitly requested and ran. No production build, emulator installation/UI
run, migration rehearsal, provider send or remote verification was performed.
Android build results and final Git/hash evidence are appended after completion.

Android completion (mobile-app/android, JDK 17, cached offline toolchain):

- First invocation of .\gradlew.bat --offline --console=plain --max-workers=1
  -Ptarget=lib/main.dart -Ptarget-platform=android-x64 assembleDebug exited 1:
  PowerShell split the unquoted target into lib/main and a .dart task. This was an
  invocation defect, not an application compile failure. The log was preserved.
- Corrected command: & .\gradlew.bat '--offline' '--console=plain' '--max-workers=1'
  '-Ptarget=lib/main.dart' '-Ptarget-platform=android-x64' 'assembleDebug'. Exit 0,
  BUILD SUCCESSFUL in 17 seconds, 53 tasks (14 executed, 39 up-to-date).
  Existing Kotlin/Gradle compatibility/deprecation warnings remain; no dependency
  or configuration changes were made to suppress them. No APK install/launch or
  native UI verification was performed. This builds the default offline app, not
  an owner-approved staging service-mode artifact.

Final preservation: branch/commit unchanged. 38 modified and 39 untracked files,
nothing staged (initial 36 modified/38 untracked). All 74 initially changed files
remain. SHA-256 comparison found no changes outside this phase's intentional
existing-file edits; earlier QA directories were not overwritten. Two previously
clean tracked files (redirect.ts/env.ts) and one new report explain the status
increase. Final git -c core.safecrlf=false diff --check exited 0. No Git history or
index mutation, deployment, remote database access, migration, real email/account
action, production secret inspection or package installation occurred.

## Files in this phase

Code: src/lib/auth/redirect.ts, src/lib/env.ts, src/lib/email/resend.ts.
Regression tests: tests/auth-middleware.test.mjs, tests/registration.test.mjs.
Documentation: this report, INFRASTRUCTURE_OWNER_SIGNOFF.md,
INFRASTRUCTURE_READINESS_GATE.md, STAGING_REGISTRATION_READINESS.md,
REGISTRATION_IMPLEMENTATION.md and REGISTRATION_SECURITY_FIXES.md.

Next action: owners supply the evidence above and sign narrowly scoped authority
for the next remote action. Local tests or this report do not authorize staging.
