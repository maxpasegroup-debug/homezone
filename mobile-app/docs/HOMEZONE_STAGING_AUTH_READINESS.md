# HOMEZONE staging authentication readiness review

> Superseded policy notice, 2026-10-30: this review predates the founder-approved
> role-first milestone. The current registration request requires role and assigns
> one of USER/OWNER/BROKER/BUILDER/SERVICE_PROVIDER directly; login checks selected
> role against session/profile. Default-USER-only and role-less-contract statements
> below describe the earlier snapshot. Consult HOMEZONE_COMPLETE_INTEGRATION_STATUS
> and re-review the current diff before rollout; this prior review is not approval
> of the changed public-role policy or permission to deploy. Database/configuration
> and live-auth evidence remain unverified.

Reviewed: 2026-10-30. Review-only milestone 2.

## Verdict

**Source: APPROVE WITH LIMITATIONS. Confidence: medium.** No new P0/P1 defect or
authentication bypass was established by inspection of the current implementation.
This is not a security certification or approval to activate the provider.

**Database: NOT VERIFIED. Configuration: NOT VERIFIED. Live authentication:
BLOCKED. Staging deployment: HOLD pending the deployment checklist.**

The previous implementation remains an uncommitted working-tree change over
`decd89cd04defab4a2db5bc62b48b136bf50945f`. New route/service/UI/test files are
untracked. HEAD alone does not identify the proposed deployment contents. A final
reviewed deployment artifact/commit and its full migration set must be fixed first.

Read the six requested documents, the complete tracked diff, newly added PIN
service/route/forms/tests, existing foundation/auth/session/schema/migration code,
configuration templates and supporting client/vault/profile paths. Older foundation,
review and implementation-plan documents describe earlier milestones: their
statements that enrollment/Flutter PIN code or generated client/compilation are
absent are superseded by actual source and HOMEZONE_COMPLETE_INTEGRATION_STATUS.
The old proposed signup path is not the implemented contract.

## Source review findings and limitations

| Priority | Finding | Source and disposition |
|---|---|---|
| P2 | True per-IP registration protection depends on trusted ingress attribution. Without configuration all callers share 10 attempts/hour; an approved header must contain one valid IP, not a forwarding chain | src/lib/auth/mobile-pin-registration.ts:77. Confirm proxy overwrite/format before choosing the optional header. Do not assume Railway provides a safe header or silently raise limits |
| P2 | Verification holds a database connection/number-row lock during scrypt; global locks, bounded cleanup and two-process KDF jobs have not been measured on staging | src/lib/auth/mobile-pin-admission.ts:83; mobile-pin-hash.ts:18; registration.ts:30. Real multi-connection concurrency/timeout/capacity evidence remains required; in-memory fixture serialization cannot prove PostgreSQL behavior |
| P2 | Public enrollment cannot prove number ownership, and legacy editable contact-phone collisions are refused generically | src/lib/auth/mobile-pin-registration.ts:108; mobile-number.ts:4. This follows the no-OTP requirement, but first-claim squatting and contact-induced enrollment denial require explicit acceptance and a legacy enrollment/support policy |
| P2 | Secure-storage write failure intentionally leaves authentication memory-only; UI success does not prove durable session storage | mobile-app/lib/features/auth/sign_in_controller.dart:60. Existing fail-safe behavior, not introduced by this diff. Restart and vault-failure evidence is required before claiming persistence |
| P3 | v1 pepper/hash/SQL checks support no rotation or recovery workflow | src/lib/auth/mobile-pin-hash.ts:4; migration.sql:12. Retain secure pepper backups; do not rotate v1 in place. Forgot PIN remains deferred |
| P3 | Earlier documents and the default npm test command do not describe/run every new PIN-specific check | HOMEZONE_COMPLETE_INTEGRATION_STATUS.md lists the separate PIN test command. Include it explicitly in later validation; source-only tests do not validate a live provider |

No application-source correction is justified as a mandatory P0/P1 fix by this
review. Suggested refinements above require separate scope/approval where they
change behavior. Existing generic lockout can still deny legitimate users during
sustained abuse; fixed temporary windows do not guarantee availability.

## Registration assessment

- Thin Node/dynamic route: src/app/api/mobile/auth/register/route.ts:1.
- Handler: src/lib/auth/mobile-pin-registration.ts:59. Exact middleware exception
  at middleware.ts:41 admits anonymous enrollment only; it does not exempt all
  mobile writes. Handler repeats canonical Origin comparison when Origin exists
  and rejects Sec-Fetch-Site:cross-site. Native clients without Origin are allowed.
  Anonymous registration does not use ambient cookies to assign existing identity.
- Bounded JSON input uses registration-admission.ts:10 (4096 bytes); content type,
  strict fields, normalization, PIN shape and confirmation are checked. No public
  role/team/organization/invitation field is accepted.
- Canonical India normalization is separate from Profile.phone. No OTP/email
  provider is called. PINs remain strings, preserving leading zeros.
- Independent registration keys use `mobile-pin:registration:v1:` in the existing
  MobilePinLoginBudget table. Database time, a global registration row lock and
  bounded expired-identifier cleanup are used. Raw request admission precedes
  parsing; admitted valid-attempt/IP/mobile quotas precede expensive hashing.
  Existing login/OTP/password quota namespaces are not reused or reset.
- Salted versioned scrypt uses N32768/r8/p1, 16 random salt bytes and 64-byte output,
  with purpose-bound HMAC pepper prehash, fixed parser/cost and constant-time
  comparison. Hashing occurs outside the account-creation transaction.
- Creation transaction at registration.ts:104 creates User(emailVerified:null),
  Profile(USER/PENDING/whatsappVerified:false) and MobilePinCredential together.
  User email/name and Profile phone remain null; India uses the existing default.
  No existing user/credential/profile/role is updated or merged.
- Unique canonical number and unique user binding protect duplicates. Only the
  exact normalizedMobile P2002 target is treated as a duplicate race. Other
  transaction/configuration/hash errors become generic 503 responses with fixed
  stage/category diagnostics. Legacy contact matches return the same acknowledgment
  without account creation; the contact query is not a permanent cross-table
  uniqueness constraint and does not prevent concurrent contact edits.

## Login/session/security assessment

backend/auth.ts:92 conditionally adds provider mobile-pin only when the feature
flag is literal true. Existing website/admin providers and callbacks are unchanged.
The provider delegates to mobile-pin.ts:11, which normalizes phone, admits login,
requires an exact numeric PIN string, selects only necessary credential/user/profile
fields, performs real or dummy KDF, and rechecks binding/hash/version/suspension.
Missing/suspended profiles cannot authenticate through this provider.

mobile-pin-admission.ts:36 commits aggregate admission separately, then locks the
number's failure row during verification. Defaults: five failures per 15 minutes
from first completed failure; success neither consumes failures nor clears
unexpired failures. Blocked attempts do not extend the deadline. Global protection
counts all attempts (300/5 minutes). HMAC-number keys prevent per-number bypass by
IP rotation. Capacity defaults to 10000 failure buckets, cleanup at most 100 rows
with SKIP LOCKED. Storage/config/KDF errors fail closed; normal failures are generic.

Auth.js uses its existing JWT strategy and AUTH_SECRET for signing/encryption;
there is no second PIN session secret or bearer-token mechanism. Installed Auth.js
cookie defaults are HttpOnly, SameSite=Lax, path / and Secure on HTTPS, without a
cross-domain cookie setting in the application. trustHost:true is existing proxy
behavior, not an origin allowlist; deployment still requires correct canonical
URLs and trusted ingress. authOrigin never selects callbacks from incoming Host.

issueSession creates a random session ID stored as a hash in AuthSession, checks
User.sessionVersion, and uses a 30-day expiry. JWT/session validation checks
registry ownership/version, revocation, expiration and suspension. Signout revokes
the registry entry; a failed remote signout must not be reported as proven server
revocation. Existing Flutter code always clears local identity/cookies/vault for
its current generation and reports remote uncertainty separately.

## Exact API contracts

| Operation | Request | Response/authority |
|---|---|---|
| Enrollment | POST /api/mobile/auth/register; JSON mobileNumber, pin, confirmPin only | 200 generic `{message:"Registration submitted. Sign in with your mobile number and PIN."}` for new/duplicate/contact collision; never proof of creation/login |
| Invalid enrollment | Wrong PIN/confirmation/number/body | 400 `{error:"Enter a valid mobile number and matching six-digit PINs."}` |
| Registration security/quota | Origin mismatch/cross-site; exhausted quota | 403 `{error:"Request not permitted."}`; 429 generic attempts error plus Retry-After |
| Disabled/unavailable enrollment | Flag off or dependency failure | 503 generic registration unavailable; caught failure advises sign-in before retry |
| Login bootstrap | GET /api/auth/csrf | Auth.js CSRF token plus cookie; not an authenticated session |
| PIN login | POST /api/auth/callback/mobile-pin; URL-encoded phone,pin,csrfToken,callbackUrl:/; existing x-auth-return-redirect flow | Auth.js callback URL response; invalid credentials return generic CredentialsSignin error URL, which the client converts to unauthorized. Do not require a fixed HTTP 401: installed Auth.js can return HTTP 200 with an error URL |
| Session/restore | GET /api/auth/session with scoped session cookies | Independently validate user.id, backend role and expiry; callback acknowledgment/cookie presence alone is insufficient |
| Logout | Fresh CSRF GET then form POST /api/auth/signout | Existing Auth.js/session-registry revocation, then local clearing; failed revocation remains uncertain |
| Profile | Authenticated GET /api/mobile/account?view=profile | Profile fields/role/status; 401 anonymous, 403 suspended; profile role must agree with session |
| Protected actions | Existing cookie-based routes | Server roles/ownership and revocation authoritative; Flutter routing is not permission enforcement |

## Database readiness

There are **21 local migration directories**, including the PIN foundation after
the historical 20. The exact applied/pending set is UNKNOWN. Historical reports
of 20 applied migrations and catalogue HTTP 200 do not establish PIN tables,
AuthSession compatibility, schema drift, failed attempts or absence of partial DDL.

Schema/migration are consistent by text inspection: optional User inverse; credential
required id/userId/normalizedMobile/pinHash/timestamps; primary key; unique userId
and normalizedMobile; cascading User FK; budget key primary key, count default 0,
resetAt and resetAt index. Three SQL checks constrain Indian canonical numbers,
v1 hash envelope and nonnegative counts. Prisma does not represent those checks;
future migrations must preserve them. Client-side cuid/updatedAt generation is
consistent with existing Prisma conventions. No backfill or existing-account update
is performed by this migration.

Direct PIN-DDL prerequisite: existing User(id). Runtime also needs compatible
Profile, User.sessionVersion and AuthSession. Relevant migrations include initial
schema, 20260618_phase_2c_verification_trust, and
20261010_auth_session_revocation. Enrollment's contact-collision query requires
Profile.phone. Registration quotas reuse MobilePinLoginBudget; no additional
registration migration is needed. Reconcile the entire ordered chain, including
the prior private-files failure, against STAGING history only; do not resolve it
based on old evidence or infer production status.

Readiness requires owner-provided sanitized target identity, history/checksums/
failed logs and actual tables/columns/indexes/FKs/checks/enum/default evidence,
plus backup/restore readiness and capacity/privilege checks. No live schema was
inspected and no migration or introspection was run in this review.

## Android integration readiness

Current nonsecret staging file has API true, environment staging, origin-only
https://homezone-staging.up.railway.app, and unchanged empty media allowlists.
The supported build/launch must explicitly pass this file; JSON is not loaded
automatically. No production fallback is introduced.

MobilePinAuthScreen captures the same number/PIN values before awaits, masks PINs,
preserves zeros, confirms equality, prevents duplicate submissions, clears PIN
fields on completion/exit, and shows uncertain-registration guidance. Registration
acknowledgment leads to separate sign-in; no auto-login/retry or fake success.
Protocol/controller use existing owned CSRF/cookies, exact callback allowlist,
independent session validation and generation/cancellation guards. ProfileDashboardGate
checks supported server role/status before dashboard presentation. USER registration
never assigns OWNER/BROKER/BUILDER/SERVICE_PROVIDER/ADMIN/SUPER_ADMIN locally.

SessionVault scopes credentials to environment+origin; Android Keystore AES-GCM
storage and ordered vault operations remain. No PIN is stored. Startup and resume
verify the existing session endpoint, not saved UI state. Logout/expired/401 paths
clear authority; failure to persist is memory-only, not proof of restored sessions.

Prior milestone evidence (not rerun now): backend npm suite, eight synthetic PIN
registration tests and 100 focused Flutter tests passed; debug APK built; normal
Android screenshots show PIN forms and public discovery; real Flutter staging
catalogue returned 200/empty. None proves live PIN login or database durability.
The earlier black-screen cause remains unknown although it did not reproduce.

## Review outcome and changes

Only this document and HOMEZONE_PIN_AUTH_DEPLOYMENT_CHECKLIST.md were created.
Existing modified/untracked work was preserved. No application/schema/configuration
edits, tests, builds, runtime requests, emulator interaction, database access/writes,
migrations, OTP/account creation, Railway changes, production access, deployment,
commit or push occurred during this milestone.
