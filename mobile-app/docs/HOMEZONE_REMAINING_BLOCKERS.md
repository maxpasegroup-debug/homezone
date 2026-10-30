# HOMEZONE remaining integration blockers

## Latest mission: confirmed runtime gates — 2026-10-30

Current source compiles; full Flutter suite passes 300 tests and standard npm test
passes including both new PIN suites. Current staging APK is built, installed and
visible. Direct sign-in after role selection and public catalogue HTTP 200/empty
were verified on the actual emulator. Source code is not the current live blocker:

1. **Deployed PIN login unavailable:** read-only GET /api/auth/providers returned
   HTTP 200 without mobile-pin. This confirms absence from advertised providers,
   not whether old deployment or feature configuration caused it.
2. **Registration route deployment/routing unresolved:** read-only GET
   /api/mobile/auth/register returned 404. No live POST was attempted. The reviewed
   source route must be reconciled with the deployed artifact before account tests.
3. **Target/schema/config unknown:** public catalogue success does not establish
   MobilePinCredential, MobilePinLoginBudget, User.sessionVersion or AuthSession
   readiness. Effective staging IDs, migration history/checksums/partial state,
   backup/restore and secret/provider settings remain owner-unverified.
4. **Authorization gates remain:** exact migration action, Railway changes, staging
   deployment and live test-account/database writes each need separate approval.
   This mission authorized local source/build/tests, not those operations.
5. **Authenticated modules:** USER/OWNER/BROKER/BUILDER/SERVICE_PROVIDER workspace
   source is compiled; real role dashboards, restore/logout, favorites/enquiries,
   submissions, inventory and service mutations remain unverified until approved
   accounts/records and live-write authorization exist. Protected workspace roles
   now also must match the verified Flutter session before records are displayed.
6. **Property/media fixtures:** catalogue still has zero published results; no
   properties were created/published. Existing empty media allowlists intentionally
   prevent remote media. Owner must approve records/hosts before detail/media tests.

### Concrete approval sequence to unblock operations (not executed)

- First provide nonsecret Railway project/environment/backend/database service IDs
  and staging database/schema identity. Confirm runtime and migration runner target
  the same isolated staging database, and supply sanitized history/schema/recovery
  evidence. Do not send secrets or full connection strings.
- Review the complete local modified/untracked implementation and choose an isolated
  staging deployment artifact/branch. Current branch main has uncommitted work;
  do not push it or assume it cannot trigger production deployment.
- If PIN migration is pending, present the exact approved pending set and staging
  migration action for permission. No assumed migrate resolve/reset/backfill.
- After schema readiness, separately approve required staging-only variables:
  AUTH_MOBILE_PIN_ENABLED, MOBILE_PIN_PEPPER_V1, MOBILE_PIN_RATE_LIMIT_KEY and any
  confirmed canonical-origin/registration-policy changes. Generate/provision secrets
  privately; approved trusted ingress IP header must be proved, not guessed.
- Separately approve deployment to the confirmed staging service serving
  https://homezone-staging.up.railway.app. Include source PIN route/provider/role
  contract, automatic predeploy migrations and rollback plan. Retain new credential
  tables, accounts and pepper on rollback; disabling feature does not erase data.
- Then approve ONE registration for an owner-controlled unused +91 test number,
  role USER, PIN supplied privately on-device. Scope includes quota writes, account/
  profile/credential creation, AuthSession creation, incorrect-PIN budget changes
  and logout revocation. Never send that PIN in chat. Extend to the other four
  roles only with explicitly approved account/data scope.
- Verify real Flutter signup -> separate PIN login -> profile/dashboard -> restart
  restoration -> logout/revocation, then independent role/business milestones.

All independent local implementation/check/build/UI/public-read work described in
the current status report was completed. Stopping before the live approval gates
is required by the owner, not evidence that an unavailable provider was tested.

## Earlier blocker context (still applicable unless superseded above)

## Role-first milestone update — 2026-10-30

The founder approved direct public roles USER, OWNER, BROKER, BUILDER and
SERVICE_PROVIDER. New registration now requires role and stores the validated
selection; no ADMIN/SUPER_ADMIN or other assignments are accepted. Earlier
default-USER-only statements below are historical and superseded. Login compares
the selected role with authenticated session and fetched profile; it never changes
an existing role. No schema change is needed for these existing enum values.

Remaining gates: reconcile staging schema/history and secrets, review the expanded
public-role policy against resource permissions, approve backend deployment and
account writes separately, then verify new-account roles, duplicates, mismatches,
restoration/logout and actual workspaces using approved staging fixtures. Existing
business verification/ownership checks still apply; selecting a role does not
create linked teams/provider approvals/projects or privileged associations.
Coordinate the new required-role contract with the new APK: older PIN APKs omit
role and cannot register against this contract. Role-first screens and retained
Broker selection across signup/sign-in were verified in normal Android captures;
no live authentication was submitted. Previous catalogue evidence is not evidence
for new account creation or role dashboards. All previous database/configuration gates below
remain, except the explicitly superseded default-USER-only policy.

Updated 2026-10-30. Read HOMEZONE_COMPLETE_INTEGRATION_STATUS.md for exact source,
tests, artifact and Android evidence. Overall integration remains partial.

## 1. Enablement gate: PIN schema, secrets and backend deployment

Status: BLOCKED for live authentication, COMPILED locally.

No source inspection establishes the effective staging database or deployed
provider. Owner/infrastructure evidence must independently tie runtime and
migration runner to the intended staging project/environment/database/schema,
separate from production. Reconcile all intended migration names/checksums and
actual schema, including existing 20261030120000_mobile_pin_foundation,
MobilePinCredential unique normalizedMobile/userId, MobilePinLoginBudget and
AuthSession. This work did not execute that migration or any SQL.

Confirm recoverability before authorizing writes. Review the current local source
diff and approve the staging-only migration/configuration/deployment separately.
Deployment can trigger prisma migrate deploy through the existing predeploy
command, so deployment is not a harmless source publication.

Owner must privately confirm DATABASE_URL, AUTH_SECRET, canonical staging AUTH_URL
and NEXTAUTH_URL consistency, AUTH_STAGING_ORIGIN approval and NEXT_PUBLIC_SITE_URL
relationship; demo providers should remain disabled for real account verification.
Confirm MOBILE_PIN_PEPPER_V1, MOBILE_PIN_RATE_LIMIT_KEY and optional login/registration
policy values meet documented rules. Never paste secrets/URLs into chat.
AUTH_MOBILE_PIN_ENABLED must not be turned on before schema/configuration and
reviewed backend are ready. No Railway value was inspected or changed here.

Decide whether Railway reliably overwrites a single client-IP header before
selecting MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER. Without that verified choice,
all registration callers share the conservative 10/hour ingress bucket. Do not
raise limits or trust forwarding headers merely to pass a registration test.

## 2. Controlled PIN authentication verification

Status: BLOCKED pending the above and explicit account/write authorization.

Approve a staging-only test number and new account procedure through a private
credential channel. No OTP/phone-possession proof is implemented by design. A
first claimant can claim an unused number; PIN hashing/throttling do not prove
ownership. Legacy Profile.phone collisions are refused generically, not linked;
manual account-enrollment/recovery policy remains unresolved. Forgot PIN is
intentionally unavailable. Secure backup of the pepper is essential; no automatic
pepper rotation/reset procedure is provided.

Then verify actual Flutter registration acknowledgment -> separate PIN login ->
CSRF callback -> independently verified session -> profile/default USER dashboard.
Include leading-zero PIN, duplicate/concurrent registration without overwrite,
wrong PIN/temporary lockout, success not consuming failure allowance, aggregate
limits, stale requests, expiry, suspension, restart/secure restoration, logout and
server revocation, and two-account isolation. Local mocked tests do not prove
PostgreSQL locking, real Auth.js cookies, capacity or durability.

## 3. Populated catalogue and media

Status: public empty catalogue RUNTIME VERIFIED; nonempty/detail/media BLOCKED.

Owner must authorize use/publication of an appropriate staging property through
the existing supported property/admin lifecycle. Do not seed or insert records
directly. Identify property ID, publication/verification state, ownership and
approved media hosts. Empty image/media allowlists are unchanged and intentionally
block remote media; approving exact hosts is separate configuration work.

Verify discovery tap -> correct ID detail -> nullable fields/price/location/
amenities -> gallery and allowed video/tour links; unpublished/unavailable cases,
filters, pagination, loading/errors and retries. Current empty result is not
evidence that a migration/table or all property records are missing.

## 4. Authenticated business workflows

Status: existing source COMPILED, live behavior BLOCKED.

After approved accounts/data are available, verify saved/shortlist/enquiry writes,
owner draft/edit/media/status/enquiries, broker assignments/team/commission,
builder inventory/reservations and service quotes/bookings in small independent
milestones. Each requires explicit staging mutation approval and authoritative
server roles/records. No new registration roles or privileged associations were
introduced. Current generic workspace wiring is not evidence every business
workflow is operational. Cross-account/resource ownership checks need runtime
evidence as well as existing local authorization tests.

## 5. Supporting product gaps

- Native push/device-token delivery NOT IMPLEMENTED in the reviewed mobile surface.
- Rich native admin, payment checkout/refunds, some Studio/operator/social/AI
  workflows remain missing/partial native capability or website handoffs. Existing
  backend APIs must be assessed per module; these are not all missing APIs.
- Actual refund, deletion and retention execution needs business policy/capability
  review; account-request acknowledgment must not be displayed as completion.
- Fictional buyer preview remains demo/local; no demo records were connected as
  database records and no fake-success replacement was added.
- Full current end-to-end role journeys and all-screen runtime coverage remain
  outstanding. Do not interpret APK compilation as their completion.

## 6. Android and checks

The final APK rendered onboarding, empty discovery and PIN forms in normal Android
screenshots. Black display did not reproduce; original root cause remains unknown.
No permanent renderer workaround was applied. Recheck presentation on a physical
device and cold/warm restart before release. Current output is debug, not a signed
distribution release.

Backend TypeScript, final npm test, eight PIN registration tests and 100 focused
Flutter tests passed. Analysis retains 77 lint/style notices. Full production
Next.js build, real PostgreSQL concurrency/capacity, complete Flutter suite and
all business-module runtime verification are not claimed.

## Next owner action

Review the local PIN enrollment/mobile diff and obtain the sanitized staging
schema/configuration/recoverability evidence in item 1. Approve the exact staging
migration/configuration/deployment scope and one controlled test-account procedure
separately before any live authentication write. Production remains out of scope.
