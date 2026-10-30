# HOMEZONE master backend-to-mobile integration audit

Audit date: 2026-10-30. Actual source baseline:
`0a434a0f199cd8d45d1260d223b444d15876b1c4`. Working tree clean at inspection start.
SOURCE/DOCUMENT INSPECTION ONLY. No current device, network or database evidence
was collected. Historical observations are explicitly identified below.

## Executive assessment

**PARTIALLY INTEGRATED, not operationally complete or production-ready.** The app
has a separate fictional preview and substantial real-service source wiring.
One historical real Flutter catalogue request is verified. New official mobile
number + six-digit PIN registration/login is not connected end to end: backend
credential/session primitives exist; registration/enrollment and Flutter PIN
requests/UI do not. Real role-specific operations must not be called complete
until authorized runtime verification establishes their effects and permissions.

Current inventory remains 55 Dart files and 119 public Next.js route files.
The existing 40 screen/form-unit counting convention still applies: 17 demo-only,
5 local, 11 source API-connected and 7 partially integrated. This is a navigation/
implementation inventory, not tested feature counts or completion percentages.
Backend PIN-only changes do not create a new Flutter screen or verified workflow.

## Documents reconciled against actual source

Read the requested eight audit/implementation documents, including the actual
`MOBILE_PIN_FOUNDATION_REVIEW.md` filename (the supplied backslash before .md is
not part of its name). Also read the current PIN_SECURITY_DECISIONS, readiness,
role/media/catalogue/device evidence, API/configuration, registration, private
document, G7 and infrastructure handoff documents in docs. These are prior
evidence/plans, not an effective Railway configuration or deployed-commit record.

| Earlier statement | Current source finding / precedence |
|---|---|
| Demo roadmap prioritizes email OTP and mobile email/password | Describes older implementation, still active in Flutter but no longer target mobile requirement. New number/PIN without OTP or recovery takes precedence; web/admin unchanged |
| PIN audit says provider/model absent | Historical audit; now MobilePinCredential, MobilePinLoginBudget and default-off mobile-pin provider exist |
| Milestone 1A describes five total per-number attempts/full-profile reads/no diagnostic labels | Historical section retained intentionally. Current 1B source uses failure-only account counting, explicit selects and safe stage/category logs |
| Shared password sign-in G7 verification plans/evidence | Legacy password protection is separate; its documents/test results do not validate new PIN concurrency/locking |
| Role selected during preview signup should persist | RoleScreen is explicitly local preview. Service registration still assigns USER; listing creation separately promotes USER to OWNER on backend |
| Backend and all migrations previously Ready/applied | Historical owner reports, not current schema/pending set or deployment identity confirmation. A new unapplied PIN migration now exists in source |
| Flutter captures show UI | Internal render evidence, not normal Android app presentation. Later launcher screenshot worked with HOMEZONE absent; app presentation remains unverified |

## What actually connects: evidence boundaries

`STAGING_DEVICE_CONNECTION_EVIDENCE.md` records an attached real Flutter isolate
GET `https://homezone-staging.up.railway.app/api/mobile/properties?page=1&pageSize=12`
at 2026-10-29T11:47:32.246Z, approximately 805ms, HTTP 200, database source,
properties [], page 1, hasMore false. Request ID is recorded there. Screen load
was debugger-triggered after navigation, not proof of normal visible tap flow.
Flutter internal capture showed empty-state UI. Independent Railway log matching
was not completed. No newer request was made in this audit.

Historical Android launcher capture was visible and HOMEZONE had no PID; that is
a working emulator/capture baseline only. Previous HOMEZONE black Android captures
remain unresolved. Existing APK hash/provenance mismatch was previously observed;
no APK was inspected or launched now. A future reviewed build must correspond to
current source and explicitly selected staging defines.

Not verified: PIN or old email authentication, registration/delivery, restoration,
logout/revocation, role/profile gating, cross-account isolation, nonempty catalogue,
detail/media, saved/enquiry persistence, business-role actions or current DB health.

## Central connection architecture: retain and refine

| Layer / exact source | Actual behavior | Gap / plan |
|---|---|---|
| main.dart / ApiConfiguration | HOMEZONE_ENABLE_API defaults false; valid explicit defines create service resources; invalid enabled config renders error, never silent preview fallback | JSON does not load itself. Require explicit staging launch/build profile and artifact provenance |
| config/staging.local.json / scripts/build-android.mjs / .vscode/launch.json | API true, environment staging, origin-only staging host; script encodes JSON as Dart defines, assembleDebug; VS Code passes config file | Current APK configuration cannot be inferred from filename; release/signing separate. Do not reuse staging file for production |
| core/api/api_configuration.dart | Origin-only API base, explicit environment, HTTPS except local development; safe paths assembled once | Environment label alone does not forbid an arbitrary valid HTTPS production origin. Existing approved staging file is correct; future build manifest/CI checks should pin intended origin without production fallback |
| ApiClient / IoApiTransport | Same configured origin, bounded/validated JSON, HTTP categories, default 20s request/10s connection timeout, redirects off, normal TLS | Keep one API client; improve per-module typed validation where generic JSON success checks are weak; don't create second auth HTTP stack |
| CookieRequestCoordinator / PasswordAuthProtocol / AuthResponseParser | Owned serialized cookie tickets, CSRF cookie/token, callback and independent session verification, generation/provenance guards | Reuse for PIN with new provider/fields; current Flutter hardcodes callback/password and email/password |
| SignInController / SessionVault / native bridges | VerifiedIdentity only from session, startup restoration/resume/expiry; scoped vault with Android Keystore AES-GCM/iOS Keychain | Reuse for new provider; verify storage failure/clear/cancellation races. Never persist PIN for automatic login |
| MarketplaceRepository.call | Protected calls require verified identity, coordinated cookies, 401 clears local state; only public catalogue/detail GETs bypass cookies, with generation checks | Public browsing must remain independent of login. No fake data fallback exists in this path |
| ListingMedia / PublicListingMediaButton | Credential-free bounded HTTPS images, exact host/MIME/no redirects; confirmed initial public browser handoff | Both staging host lists empty: images/browser handoff intentionally blocked. External browser's later navigation is not continuously allowlisted |
| Backend auth/session/roles/middleware | Existing CSRF/canonical redirects, sessionVersion/revocation, roles/suspension and route-specific authorization | Provider code existence is not enabled/runtime proof; preserve website/admin and verify each protected handler |

Production origin/source allowlist and canonical configuration remain separate
from staging. No effective production values were read or changed. No new service
client, session-token mechanism or media transport carrying auth cookies is needed.

## Authentication: current implementation versus required target

Current Flutter RegistrationScreen still sends name/email/password to
/api/auth/password/signup, resend and verify; AuthForm/SignInController/PP still
submit callback/password. Existing recovery routes use email/token/password and
have a locally-invalidated-cookie admission gap. They are legacy functionality,
not a requirement to implement Forgot PIN. New mobile journey must not expose
them as PIN recovery or use old preview success pages as account proof.

Current backend: normalizeMobileNumber supports reviewed initial IN syntax;
MobilePinCredential uniquely binds canonical number/User independently of mutable
Profile.phone; salted versioned peppered scrypt; MOBILE_PIN_* configuration;
AUTH_MOBILE_PIN_ENABLED literal true opt-in; authorizer selects minimal fields and
returns stable identity into unchanged Auth.js callbacks. No account is auto-linked
through a matching phone, no role/verification flag is promoted by PIN login.

Milestone 1B actual source uses two transactions: global all-attempt admission and
number-row-locked verification/failure accounting. Five failures per 15-minute
window beginning at first failure, successes do not increase failure allowance
or clear previous unexpired failures; blocked attempts do not extend the deadline.
Global 300 per five minutes, bounded 10000 failure buckets, skip-locked cleanup,
two-job process KDF cap; fixed-label diagnostics only. No network header/IP bypass.
This remains uncompiled/untested. Locks during KDF, capacity, crashes and window
boundaries need specific later verification. Sustained denial of service remains
possible; no permanent lock is coded. Pepper rotation/loss and no-possession-proof
number enrollment remain operational/security decisions.

Missing: public PIN registration contract/service, registration admission separate
from login counters, atomic User/default USER Profile/credential creation and
concurrent duplicate-number responses. No route under src/app/api/auth currently
implements PIN signup. Auth.js callback/mobile-pin is a conditional catch-all
provider path, not a separate route file or enrollment API. Its schema migration
has not been executed by this work. Generated client/effective schema/secrets and
deployed provider availability are unverified.

## Service-backed screen-to-endpoint map (current source)

Each row is source-wired, not runtime verified, unless historical public catalogue
is explicitly noted. MR = existing MarketplaceRepository; PP/SC = owned auth
protocol/controller. Generic workspace modules below are variants of the same
screen classes, not new hardcoded dashboards.

| Existing screen / entry | Actual repository/API | Data/response handling and missing link |
|---|---|---|
| AuthForm login, /sign-in | SC.beginSignIn -> PP GET /api/auth/csrf; form POST /api/auth/callback/password; GET /api/auth/session | Existing secure flow but wrong credential contract for new target; switch mobile only after backend PIN signup/contract review |
| RegistrationScreen, service /roles,/sign-up | MR POST /api/auth/password/signup {name,email,password}; /resend {challengeId}; /verify {challengeId,code}; PP login | Existing server email challenge metadata and errors; replace service UI/flow with PIN later, preserve legacy web |
| AccountAccessScreen forgot/reset | MR POST /api/auth/password/forgot or /reset | Legacy acknowledgment/error; boundary gap. Remove service PIN-flow links, do not build Forgot PIN |
| _ServiceStartup / ProfileDashboardGate | SC.restore/revalidate GET /api/auth/session; MR GET /api/mobile/account?view=profile | Matching authoritative role/status, loading/retry/sign-in; GET may create default profile; no local role choice |
| MarketplaceScreen home/search /discovery and /buyer(USER) | MR.listings GET /api/mobile/properties with pageSize12/page/filters | ListingPage/source/page/hasMore validation, errors/empty/pagination, stale guards; only historical empty request verified |
| AccountListingScreen / LivePropertyScreen /property | MR.detail GET /api/mobile/properties/[id], related MR.listings | Published Listing projection, requested ID equality, category/nullable facts/amenities, unavailable/retry; authenticated view can POST /api/properties/[id]/view |
| LiveGalleryScreen / ListingImage / media buttons | ListingMedia HTTPS approved hosts; confirmed native browser/maps | Real URLs/coordinates not assets; fallback with empty lists; platform/host/provider prerequisites |
| Marketplace saved/shortlists/profile/enquiries tabs and dialogs | MR.account GET /api/mobile/account and /account/collections; /mobile/saved-status; POST/DELETE /properties/[id]/save; POST/PATCH/DELETE /shortlists children | Self-scoped real JSON/Listing collections/cursors; no demo substitution. Verify mutations/ownership and pagination |
| EnquiryForm | MR.enquire POST /api/leads {propertyId,name,phone,message,source,contactAction} | Requires ok + lead id, busy/error; owner response/delivery not established |
| ProfileEditScreen | Local tuple -> parent MR.updateProfile PATCH /api/mobile/account {city,phone}, reload | Does not change login number/PIN binding or roles; changed phone loses phone verification. New PIN UX must distinguish contact/login number |
| ComparisonScreen / LiveFilterSheet | Real Listing comparison local; filters local map -> parent catalogue | Intentional local state, not persistence or fake backend. No new API necessary |
| WorkspaceScreen | Server role menu -> Records/Summary; SC.signOut; POST /api/mobile/account-requests for review | Generic role workspace real API wiring; admin directions stay website; review is not deletion/refund |
| WorkspaceRecords / WorkspaceRecordPicker | MR.workspacePage GET /api/mobile/workspace?module&mode=cursor&parent&after; account collections where relevant | source/module/nextCursor/hasMore checks, <=20 rows, actor/generation/revision guards; create actions via forms |
| WorkspaceDetail | Module-specific GET details/read JSON plus existing PATCH/POST actions listed below | Permission/status controls, confirmations, website handoff for advanced/payment operations; generic JSON success checks need stronger per-action contracts |
| WorkspaceForm | MR.call at supplied actual POST/PATCH path; validated FieldSpec JSON | Busy/errors/server acknowledgment; listing create revalidates session after backend USER->OWNER change |
| WorkspaceSummary | MR GET /api/mobile/summary[?project] | Actual database metrics, loading/error; no fake totals |
| ListingPhotographsScreen | GET/POST /api/properties/[id]/media with expectedUpdatedAt/expectedMediaState; POST /api/mobile/upload {propertyId,base64} | Ownership/stale-state guards, cover/reorder/link management; no provider-file deletion claim |
| PrivateDocumentsScreen | GET/POST /api/mobile/documents?scope,parent; GET /[id] -> confirmed native export | PrivateFile/parent permissions, storage/scanner and native prerequisites; exported copies outside app cannot be revoked by logout |

The 119-route inventory and field-level mapping in BACKEND_API_INVENTORY.md and
MOBILE_BACKEND_SCREEN_MAPPING.md remain the detailed endpoint references. Fresh
route/source inspection confirms these modules and no PIN-signup route. Existing
API contracts must be reviewed at implementation time, not guessed from a generic form.

## Role/module contract and completeness

| Role/module | Existing backend/read and write paths | Current limits / next integration proof |
|---|---|---|
| USER | Profile.role default; catalogue/detail/saved/shortlists/leads/visits/workspace/history/requests/bookings/Studio/notifications | No registration role input; optional profile fields not made required; protected writes need real identity |
| OWNER | workspace properties/ownerEnquiries; POST /api/properties, PATCH /[id], /media, lead notes/tasks/visits | Draft/review/verified-publish constraints; user listing create promotes OWNER, then session revalidation; no publishing authorized |
| BROKER | /api/pro/leads + assignment/commission/notes/tasks children, /pro/team, calendar; scoped workspace | Picker needs active linked member; plain team row is not delegated identity. Commission records are not payments |
| BUILDER | /api/builder/projects + towers/units/team/campaigns/bookings; /builder/bookings/[id], /mobile/workspace/[id], /summary | Parent ownership/reservation transitions; concurrent inventory booking unverified, no payment conclusion |
| SERVICE_PROVIDER | /api/service-providers,/me, /service-requests,/service-quotes,/service-bookings; provider workspace | Verified/nonsuspended provider requirements, quote/booking transitions, customer scope; approval/provider state unverified |
| Studio requester/operator | /api/studio-requests and assignments/files/revisions/status children | Requester actions wired; rich assigned operator/admin/payment workflows often website, not complete native product |
| ADMIN/SUPER_ADMIN | Existing /api/admin/* and website; mobile workspace gives web-admin direction | No Flutter admin app needed or authorized; privileged provisioning/policy untouched |
| Notifications/transactions | /api/notifications and PATCH /[id], workspace payment history; /payments/* website/provider API; /mobile/account-requests | Inbox exists; no mobile push-token/delivery pipeline found. No native checkout/refund/deletion execution inferred |

## Demo/real separation

Fictional data stays in buyer/data/demo_properties.dart (four records), BuyerShell
and buyer/screens/*; filters, favorites, shortlists/history/comparison there are
memory-only. AuthForm preview signup/recovery delays and SuccessScreen/CheckEmail
are explicitly preview, not account creation/email delivery. Preview social/contact/
map/video/floor-plan buttons are notices/unavailable states, not service calls.

Service routes use MR instead of demoProperties. No source fallback to demo data
on HTTP failure was found in that repository. Service /roles maps RegistrationScreen,
not RoleScreen; /buyer-preview explicitly retains fictional BuyerShell even when
service mode is present. `/success` and `/check-email` remain routable preview
surfaces: future PIN service actions must not navigate there as proof of success.
Image placeholders and static option/status labels are not fake business records.

## Missing backend capability versus missing Flutter wiring

**Missing required backend:** PIN registration/enrollment and its registration
admission/duplicate/collision contract. Existing Auth.js PIN login foundation is
present but unverified; don't create another competing login/session API.

**Existing backend, missing/partial native product:** reels/social actions, AI
features, booking reviews, complex Studio operator functions, website admin and
payment/provider workflows. Keep website handoffs where appropriate; do not label
these missing APIs. Push/device-token delivery was not found in current mobile
surface. Team invitation/account binding and actual refund/deletion/retention
execution require policy and capability review. Phone OTP and Forgot PIN are not
new target requirements and must not be added as blockers or workarounds.

**External/runtime blockers:** effective staging target/secrets/provider flags,
schema/pending migration reconciliation and Prisma client generation, published
fixtures/media host approval/private scanner, current artifact provenance and
Android HOMEZONE presentation. No source report confirms their deployed state.

## Risks and first fixes

1. Central target mismatch: Flutter email/OTP versus backend PIN; solve through a
   reviewed registration contract then separate Flutter/protocol milestones.
2. PIN 1B concurrent failure/cleanup/timeout behavior is source-only; obtain later
   authorized regression/security/capacity verification before activation. Number
   ownership is unverified and low PIN entropy is an accepted architectural risk
   needing operational review, not solved by presence of scrypt.
3. Preserve legacy web/admin functionality and default USER/authoritative roles;
   decide legacy account enrollment without phone-based auto-link or fake PIN.
4. Make deployment effects explicit: railway.json declares preDeployCommand
   ["npm run db:migrate"] (package script prisma migrate deploy), build npm run
   build, start npm start -- --hostname 0.0.0.0. Source declaration does not prove
   active Railway settings or execution. Future deployment could apply all pending
   migrations, not just the PIN migration; no deployment is authorized.
5. Generic workspace response success checks and individual legacy handler security
   deserve scoped follow-up, not an authentication/UI rewrite. Dashboard entry check
   does not replace ongoing server authorization. Data reads can create profile/
   history and login/session operations write budgets/sessions; authorize effects.

## Audit execution

Read-only Git status/source/document/configuration searches only; no secret env
files read, no service/database/device accessed. Only the requested two master
documents created. No source/schema/config changes, tests/builds/compilation,
migrations/accounts/OTP, Railway/production actions, commits/pushes/deployments.
All existing work preserved. No new runtime success is claimed.
