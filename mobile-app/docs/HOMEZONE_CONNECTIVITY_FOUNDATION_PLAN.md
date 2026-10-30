# HOMEZONE connectivity foundation — milestone 0 reconciliation

Date: 2026-10-30. Checkout: baae7608116cd16068d47a87351007472df0cf13.
Working tree clean at inspection start. PLAN ONLY; not a connectivity test,
deployment authorization or claim that current services work.

## Founder-level conclusion

Do not replace the connection architecture. A central authenticated API client,
public catalogue boundary, environment selection and secure session lifecycle
already exist in source. The immediate missing product link is new PIN account
registration and the Flutter PIN credential contract, not another HTTP client.

Only one real Flutter empty-catalogue request is historically verified. Everything
else needs separate evidence. This task made no live/device/database requests.

Smallest recommended first implementation: **backend PIN registration only**,
after approving the registration contract, isolated signup quotas and legacy phone
collision policy. Keep provider activation, migration execution, Flutter screens
and all runtime verification outside that milestone.

## Documents reconciled

Read HOMEZONE_MASTER_BACKEND_INTEGRATION_AUDIT, its ROADMAP, PIN_FOUNDATION_REVIEW,
PIN_SECURITY_DECISIONS and PIN_BACKEND_FOUNDATION Markdown files, then inspected
actual current source/configuration. Historical milestone 1A's total-attempt
accounting/full-profile queries are superseded by 1B failure-only accounting and
explicit selects. Earlier email-OTP plans describe current legacy mobile wiring,
not the new mobile target. New target is phone/six-digit PIN with no OTP or Forgot
PIN; website/admin authentication remains unchanged. Historical audit commits
are not the actual checkout above or evidence of a deployed commit.

## Current architecture and smallest changes

| Area | Source evidence | Current assessment / smallest necessary work |
|---|---|---|
| API enablement | lib/main.dart:14–45 | API flag false selects explicit preview; enabled invalid config shows error, not silent fallback. Keep composition and loading startup |
| Staging configuration | config/staging.local.json | true/staging/https://homezone-staging.up.railway.app; origin-only, no /api suffix; image/media lists empty. No edit needed on inspected evidence |
| Selection mechanism | .vscode/launch.json; scripts/build-android.mjs | Staging profile passes --dart-define-from-file; wrapper requires --mode service --config and encodes defines into assembleDebug. JSON is not loaded by opening the app. Verify artifact/defines later, don't assume any installed APK matches |
| URL construction | core/api/api_configuration.dart | Explicit environment and valid origin, endpoint appends /api/... once, HTTPS except development loopback. Keep it; environment label alone does not prevent an operator choosing a wrong valid HTTPS origin. Add source/build provenance checks only if separately scoped |
| Central transport | core/api/api_client.dart, api_transport.dart | One service client, exact configured origin and normal TLS, no redirects, allowed headers, 20s request/10s connection deadlines; JSON/HTTP/body failure categories. No demonstrated need for replacement |
| Public versus protected | features/marketplace/marketplace_repository.dart:147–221 | Catalogue/detail public GETs omit cookies and cookie commits with generation checks. Protected calls require verified session and coordinated cookies; 401 clears local authority. Preserve both boundaries |
| Serialization | Listing/ListingPage, auth response parser and MR JSON helpers | Catalogue source/page/hasMore/ID/type checks exist; nullable numeric strings accepted. Generic workspace mutations accept weaker generic JSON acknowledgments: strengthen per action only in that module milestone |
| Authentication | backend/auth.ts; src/lib/auth/mobile-pin*.ts; Flutter password_auth_protocol.dart:264 | Default-off mobile-pin provider and hash/failure protection exist, but Flutter callback/password still sends email/password. Adapt the existing protocol to phone/pin later, not another client/session system |
| PIN registration | src/app/api/auth current route inventory | No PIN enrollment/signup route exists. Email/password signup/resend/verify are not this API. Add strict bounded PIN service/route with new-account transaction and isolated signup admission |
| Sessions | features/auth/sign_in_controller.dart; core/api/cookie_request_coordinator.dart, auth_response_parser.dart | Independent Auth.js session before identity, startup restoration/resume/expiry, ownership/generation and cookie provenance. Reuse after PIN callback; actual restoration/logout/revocation unverified |
| Secure storage | session_vault.dart and native SessionVaultBridge/AppDelegate | Environment/origin-scoped OS-protected session material; not PIN storage. Preserve; storage/clear failures and restart behavior require later device evidence |
| Profile/roles | profile_dashboard_gate.dart; /api/mobile/account; backend Auth.js session callback | Server session/profile match and nonsuspended state before dashboard; roles not client-selected. Keep default USER and existing role workspaces. Profile.phone remains editable contact, not login binding |
| UI feedback | marketplace_screen.dart, registration_screen.dart, workspace_screen.dart | Real service paths have loading/empty/error/busy states. Authentication UI is still legacy email OTP and cannot meet official PIN requirement yet. No fake success permitted for new path |
| Images/media | listing_media.dart, public_listing_media_button.dart | Separate credential-free approved-host transport is intentional security separation, not a competing auth client. Empty lists intentionally block images/handoff. Owner exact-host approval required; no guessed Cloudinary/video hosts |

All lib/ paths above are relative to mobile-app/. Existing deployment/configuration
source is not proof of effective Railway values. No secret environment files read.

## What connects today versus unknown

Historical STAGING_DEVICE_CONNECTION_EVIDENCE.md records actual Flutter isolate
GET /api/mobile/properties?page=1&pageSize=12 at 2026-10-29T11:47:32.246Z, HTTP 200,
source database, properties [], page 1, hasMore false. The screen load was invoked
through the debugger; normal visible navigation was not established. No current
health check or independent Railway log correlation was performed here.

PIN registration/login, cookies/session restore/logout, profile/role persistence,
nonempty properties/details/media and business writes are unverified. Previously
working launcher screenshot with no HOMEZONE process confirms Android baseline,
not HOMEZONE presentation. Current installed APK/defines and deployed service
commit/schema/provider state remain unknown. No request should be attributed to
Flutter solely because a Railway HTTP 200 log exists.

## Demo boundaries

- BuyerShell, DemoProperty assets/data and buyer/screens/* remain fictional preview;
  local favorites, history/shortlists/comparison are not database collections.
- Preview AuthForm signup/reset delays, CheckEmailScreen and SuccessScreen remain
  explicitly preview. New PIN service flow must never route there as evidence of
  created account, authentication or delivery.
- Service /roles,/sign-up currently open real legacy RegistrationScreen, not local
  RoleScreen. Service /buyer routes by verified server role; /discovery is public;
  /buyer-preview explicitly preserves fiction. No source HTTP-failure fallback to
  demoProperties was found in MR. Keep this separation.
- Legacy email/recovery/social links in active mobile auth will need removal from
  the PIN service journey, not deletion of website/admin or offline preview code.
  The old recovery boundary issue is not a mandate to implement Forgot PIN.

## Missing/incorrect integration points

1. **Missing backend:** PIN signup/enrollment, independent signup throttling and
   duplicate/collision response contract; foundation hash helper alone is not signup.
2. **Incorrect mobile target contract:** service registration still sends name/
   email/password and requests OTP; protocol still calls callback/password. No
   Flutter phone/PIN credential forms or backend signup calls are wired.
3. **Unverified readiness:** PIN models/migration source do not establish generated
   client, actual schema, approved secrets or provider readiness. Provider stays
   default-off; do not enable it merely to make a request succeed.
4. **Policy dependency:** canonical number uniqueness and low-entropy PIN are not
   phone-possession proof. No account may auto-link through Profile.phone. Decide
   legacy contact collisions, signup budgets and first-claim risk before enrollment.
5. **External blockers:** visible HOMEZONE Android presentation, artifact provenance,
   staging-only schema/config evidence, published fixtures, media host/provider
   approvals. Each requires separate authorization; no production fallback allowed.

## Exact implementation order and independent boundaries

| Order | Small scope / likely files | Dependencies | Reviewable exit; execution excluded |
|---|---|---|---|
| 0A | Contract decision record only | Approve proposed phone/pin/confirmPin signup, generic duplicate/uncertain outcome and signup quotas/contact collision behavior | Do not invent quota values; no new source yet |
| 1 / recommended next | Backend PIN signup only: proposed auth/mobile-pin/signup route + focused service/admission helper using existing normalization/hash; schema only if demonstrably required | 0A, review existing 1B foundation semantics | Atomic User/Profile(USER)/credential, strict input, no link/overwrite, no cookies/session claim; no Flutter, migrations/activation or live accounts |
| 2 | Existing PP/SC PIN field/provider adaptation and sanitized failures | Existing provider/contract from step 1; preserve cookie/CSRF/ownership/vault | callback/mobile-pin then independent session; no new HTTP client or bearer tokens |
| 3 | Service registration phone/PIN/confirmation UI; existing design | Steps 1–2 | Captured credentials, duplicate-submission guard, real acknowledgment followed by sign-in; no OTP/fake success or automatic creation retry |
| 4 | Service login/navigation + legacy link isolation | Step 2; preview/web preservation | Six digits including leading zeros; no email/social/OTP/Forgot PIN in service journey; logout/restoration reused |
| 5 | Profile and role compatibility follow-up only | Steps 2–4 | Optional phone-only user name/email safe, contact/login distinction, server role only; no new policies or privileged associations |
| 6 | Authorized staging preparation and controlled verification, not assumed source implementation | Explicit generated-client/build/tests/schema/config/device/account permissions and approved fixtures | Source validation, actual PIN/signup/session/profile/protected-request evidence, cross-account/security/concurrency checks; do not bundle deployment into code approval |
| 7 | Marketplace/detail/saved/enquiry modules individually | Verified auth where protected; public reads remain independent | Reuse existing APIs, fix demonstrated parsing/state defects; real data/404/empty/error and persistence evidence |
| 8 | Owner, broker, builder, provider modules each as separate approved milestones | Previous module contracts/fixtures, business policies and mutations authorized | Existing endpoints first; specific generic-response/permission gaps only; no fabricated records |
| 9 | Notifications/supporting modules and website admin handoffs | Approved provider/push/payment/delegation policies where needed | Inbox/read exists; keep web admin, no new Flutter admin app or inferred refunds/deletion |

No confirmed centralized-transport source defect from this reconciliation justifies
rewriting ApiClient. Source/build validation is an approval prerequisite for runtime
activation, not work executed in this document-only milestone. Android diagnosis
can run as a separately approved parallel workstream without blocking backend source.

## Later verification authorization and evidence requirements

Separately authorize: tests/typecheck/Prisma generation; build/install/launch and
startup auth API effects; staging-only applied schema/config inspection; new-account
and login/session/quota writes; published property fixtures and media downloads.
No OTP or Forgot PIN testing belongs to the new mobile journey. Do not send secrets
or full sensitive traces in chat. Record commit/config/artifact, actor fixture
reference, UTC request/status, approved staging origin, observed UI and sanitized
server correlation. Correct callback alone is not session proof; stored cookie
alone is not restored identity; profile GET may create defaults and detail may
write history. Production health/migration state cannot be inferred from staging.

## Actions performed and preservation

Only HOMEZONE_CONNECTIVITY_FOUNDATION_PLAN.md was created. Read-only Git status,
source/config/document inspection and endpoint inventory searches performed.
No application/schema/config changes, migrations/Prisma commands, tests/builds/
compilation, device/emulator operations, live requests, accounts/OTP, database
access/writes, Railway/production changes, deployments, commits or pushes.
Stop here for explicit approval of the next narrow milestone.
