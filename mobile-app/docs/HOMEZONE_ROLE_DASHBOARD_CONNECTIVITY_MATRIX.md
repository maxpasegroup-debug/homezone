# Five-role dashboard connectivity matrix

## Current role function cross check 2026-11-04

Baseline: main / bfcabf4486c9f4bfb4fe62b398682b87cb380d6c.

**Verdict: PARTIALLY INTEGRATED. All role functions cannot be marked working or ready for live acceptance.** Five role shells and substantial real API integration exist. The review found specific privacy, permission, workflow and payment gaps. No current five-role Android/staging journey was executed.

This current section supersedes the historical report below. Current mobile registration uses Name + Email + Password + Terms acknowledgment. PIN infrastructure remains separate. Owner publication is direct, requires two distinct photos and permits six selections during creation; normal successful creation does not require reopening the listing or admin approval.

### Role and action inventory

“Connected” means actual source calls an existing backend route, not that staging execution succeeded. Every live workflow in this table remains **RUNTIME UNVERIFIED** by this check.

| Role / menu | Functions and existing API wiring checked | Assessment |
| --- | --- | --- |
| Buyer Home / Search | Published catalogue, keyword/city/purpose/category/currency/budget/bedroom filters, sorting, pagination/hasMore; GET /api/mobile/properties | Connected; loading/empty/error/retry states. Filters can legitimately exclude a new listing. |
| Buyer details / gallery | GET /api/mobile/properties/[id], photographs, coordinates, media links, enquiry entry | Connected; unpublished/unavailable detail rejected. Floor plans unavailable; video/tours configuration-blocked. |
| Buyer Saved / shortlists | Saved status, POST/DELETE property save, shortlist create/rename/delete/add/remove, account collections | Connected and actor-scoped reads. Public mutation published-state gap F5. |
| Buyer Enquiries | POST /api/leads, own account enquiry collection, linked property detail | Connected, but unsafe account-switch draft F1 and unpublished-ID gap F5. |
| Buyer compare / recent | Comparison of real listing projections; own published history | Comparison intentionally local; history backend-connected. Separate from fictional preview. |
| Buyer Profile / Services | Server profile, city/contact edit, theme and shared role workspace | Connected; profile cannot edit login identity or roles. |
| Owner Home | Scoped summary, actual owned property cards, thumbnails, Add property | Connected; independent summary/records loading/error/empty/retry. |
| Owner Listings / create | POST property private draft, every selected native upload, owned media readback, automatic PATCH PUBLISHED | One final Publish listing action; 2–6 creation photos. Requires confirmed stored photos and returned published ID/status. Live storage/backend acceptance unknown. |
| Owner listing details | Edit, photo upload/gallery/cover/reorder/remove, media links, status, archive, delete and private documents | Connected. Already-published record hides redundant Publish. Self-archive restoration incomplete; retained private documents can block deletion. |
| Owner Enquiries | Scoped ownerEnquiries plus lead changes, notes, tasks and visits | Connected to property-owner permission checks. |
| Broker Home / Leads | Summary, CRM cursor list, manual lead create, stages, next action/follow-up, notes, tasks and visits | Connected; transaction/replay risk F6 and minor attribution/validation gaps F13. |
| Broker Listings / Follow-ups | Own listing create/edit/media/enquiries and existing calendar task actions | Connected. Broker creation remains DRAFT under existing policy; task view is not an external calendar integration. |
| Broker Team / Assignments | Contact create/edit; linked active-member assignment picker and assignment endpoint | Contact records connected; new contact-to-account invitation/linking incomplete F8. |
| Broker Commissions | Record/read commissions; amount computed server-side | Connected records, not actual payouts; multi-write integrity F6. |
| Builder Home / Projects | Scoped summary, project list, create/edit | Connected administration; new projects default DRAFT and mobile publication/media controls are missing F9. BuilderProject is not a Buyer Property listing. |
| Builder Inventory / Towers | Project summary, unit/tower list/add/edit | Connected; foreign tower scope gap F3. Reserved/sold unit edits safely rejected by backend. |
| Builder Team / Campaigns | Project-scoped contact and campaign create/edit/list | Connected records. No account invitation/access or external ad delivery is established. |
| Builder Bookings | Reserve available owned unit; confirm/release/sell | Transactional reservation source exists. Optional buyer/lead/sale-value linkage is not exposed by the compact native form. |
| Provider Home / Requests | Summary, safe native providerRequests, quotes, quote create/revise | Connected; verified nonsuspended business entity required. Legacy routes bypass that boundary F2. |
| Provider Bookings | Start/complete/cancel/reschedule and status readback | Connected allowed transitions; real quote-to-booking acceptance unverified. Mobile currency/review gaps F14. |
| Provider Profile | Existing business create/edit API | Connected compact form; creates verified=false. Business verification and some profile fields remain incomplete in native UI. |
| All public roles More | Services, Activity, Finance, Account groups | Existing shared actions mapped below. |
| Admin / Super Admin | Existing web administration handoff | Intentionally excluded from public selection/native business-workspace APIs. |

Entry/navigation evidence: lib/app/homezone_app.dart:61–116; lib/features/auth/profile_dashboard_gate.dart:24–68; lib/features/workspace/workspace_dashboard.dart:15–111,829–900; lib/features/workspace/workspace_screen.dart:227–286,680–809,1380–1985.

### Shared functions and explicit boundaries

| Menu / function | Actual source contract | Result |
| --- | --- | --- |
| My profile | GET /api/mobile/account?view=profile; PATCH city/contact phone; independent readback | Connected, actor/role/session generation guarded. Cannot change login identity or role. |
| Service requests / quotes | Workspace requests/requestQuotes, POST service request/quote, PATCH quote decision/revision | Connected; requester/provider permissions and transactional quote acceptance. Legacy read leak F2. |
| Service bookings | Workspace serviceBookings; PATCH state action | Connected status workflow; paid cancellation rejected. Existing checkout amounts unsafe F4. |
| Studio | Create, approve delivery, revision, eligible cancel | Connected; QUALITY_CHECK revision button always rejected F10. External delivery is not established by order creation. |
| Property visits | Pick own enquiry, POST /api/mobile/visits, cancel | Connected; published property and owned enquiry required. REQUESTED does not mean owner-confirmed. |
| Notifications | Recipient-scoped list/PATCH read | In-app records connected. Native push enrollment/delivery missing. |
| Recently viewed | Own published history and real property detail | Connected read surface, no fictional fallback. |
| Payment history | Own workspace payment rows with currency/amount labels | Connected history, not payment collection or payout execution. |
| Website payment handoff | Capability-gated same-origin HTTPS browser workflow | Source exists; does not transfer mobile cookies. Payment amount gap F4 blocks acceptance. |
| Refund / deletion review | POST /api/mobile/account-requests and own history | Genuine review request only; does not execute refund or account deletion. |
| Private documents | Scoped mobile document list/upload/bytes/export, native export bridge | Source connected; encrypted storage/scanner and actual native export unverified. |
| Account summary | GET /api/mobile/summary | Existing role-scoped metrics; no invented revenue figures. |
| Logout | Existing Auth.js CSRF/signout, registry revocation and secure credential clear | Source connected; uncertain revocation/removal explicitly reported. Native persistence requires device proof. |

### Authentication and demo assessment

- Five public roles are USER (Buyer), OWNER, BROKER, BUILDER and SERVICE_PROVIDER. Native role enum rejects ADMIN/SUPER_ADMIN.
- Native registration is POST /api/mobile/auth/email-register with name/email/password/role/termsAccepted. User, PasswordCredential and selected-role Profile are created atomically, with emailVerified:null and generic duplicate handling. No OTP/email delivery dependency is introduced.
- Existing Auth.js password provider performs login. CSRF/callback is followed by independent session/profile verification. Selected-role mismatch signs out; login does not change the stored role.
- Dashboard route is based on server-confirmed role. APIs independently scope resources. Session registry checks revocation, expiry, session version and suspension.
- Secure persistence is environment/origin scoped. Storage-write failure leaves memory-only login without a persistence warning; actual Keystore behavior was not tested here.
- Native Forgot/Reset Password explicitly reports unavailable and sends no reset request. Existing website recovery is not completed native recovery.
- Native Google/Apple buttons explicitly report unavailable/preview-only. They are not working native social login.
- Terms/Privacy displays placeholder disclosure; approved legal content and versioned consent persistence are missing. The API returns consentRecorded:false.
- /buyer-preview uses fictional BuyerShell data. Service Marketplace/Workspace do not substitute it on API failure. Many buyer_* tests deliberately test the preview, not a live business journey.
- Separate PIN infrastructure remains; it does not replace the current approved email/password journey.

Evidence: auth_form_screen.dart:114–127,155–260,267–357,373–379,566–590; src/lib/auth/web-registration.ts:17–21,97–112; session-registry.ts:25–37; marketplace_repository.dart:358–390.

### Ranked findings

| ID / priority | Finding and exact source | Required correction / boundary |
| --- | --- | --- |
| F1 HIGH | Enquiry form retains A's name/phone/message after verified switch to B, and stale Submit sends A's draft under B. marketplace_screen.dart:2516–2547. **Locally reproduced.** | Capture opening actor/role/generation; hide old draft; reject stale Submit/late responses, matching ProfileEditScreen safeguards. |
| F2 HIGH | Legacy GET /api/service-requests allows an unverified/suspended provider entity to receive category/city directed requests and competing quotes. backend/api/service-requests/route.ts:14–23. Similar projection in src/lib/services/marketplace.ts:136–155. **Actual GET handler locally reproduced with mocked DB.** | Consolidate provider role/entity/recipient/status checks and minimal projections with safer native workspace policy at src/app/api/mobile/workspace/route.ts:80–84. |
| F3 HIGH | Unit creation accepts foreign towerId under an otherwise authorized project. backend/api/builder/projects/[id]/units/route.ts:16–38; validation.ts:700–714; schema.prisma:1292–1297. **Actual handler/validator locally reproduced with mocked DB.** | Validate supplied tower belongs to the authorized project/builder before insertion. Separate foreign keys do not enforce this. |
| F4 HIGH | Service checkout charges fixed catalog deposit/final price rather than accepted booking amount/deposit/currency/paid balance. checkout/route.ts:121–155; payments/catalog.ts:142–153; quote acceptance route:44–53. | Derive authoritative payable balance and correct minor-unit conversion; reject invalid/repeated payments. No live payment was attempted; handoff is capability-gated. |
| F5 MEDIUM | Public enquiry/favorite/shortlist writes check existence, not PUBLISHED. backend/api/leads/route.ts:128–138; properties/[id]/save/route.ts:34–41; shortlists/[id]/properties/route.ts:53–63. | Published-state scope for public Buyer writes; preserve separate Owner CRM semantics. |
| F6 MEDIUM | Unit/project/campaign/commission creates can commit before counters/activity/timeline fail; generic forms can replay after500. Builder units route:23,41,48; projects route:58,84; campaigns route:20–34; pro/leads/[id]/commission/route.ts:25,39,50; workspace_screen.dart:2319–2326. | Transactions for related writes plus safe uncertain-create/idempotency handling. Do not suppress failures or invent success. |
| F7 POLICY / INCOMPLETE | Owner cannot restore self-archived listing: all ARCHIVED states are moderation-restricted. properties/publication.ts:37–44; workspace_screen.dart:1066–1075,1147. | Decide archive-versus-admin-takedown lifecycle. Preserve moderation protection. |
| F8 INCOMPLETE | Broker Add member creates contact-only records, while assignment needs active linked profile; no complete mobile invitation/linking flow. workspace_screen.dart:740–759,2061–2074; pro/team/route.ts:50; assignments route:25–39. | Authorized linkage/invitation workflow, never arbitrary client profile IDs. |
| F9 INCOMPLETE | Builder create/edit omits status/publication/project media; new projects stay DRAFT. workspace_screen.dart:152–168,695–696,1662–1668; validation.ts:674–692. | Reuse existing supported backend fields/actions; do not fabricate Buyer Property records. |
| F10 MEDIUM | Request revision visible for QUALITY_CHECK; API accepts DELIVERED only and returns409 otherwise. workspace_screen.dart:1925–1933; studio-requests/[id]/revisions/route.ts:26–31. | Match UI to server lifecycle; do not weaken server rule. |
| F11 MEDIUM | Native photo upload rechecks suspension/ownership after provider I/O but not role, allowing attachment under stale role admission. src/app/api/mobile/upload/route.ts:15,35,41–44. | Repeat current role checks inside final transaction. |
| F12 POLICY / INCOMPLETE | BUILDER_MONTHLY currently maps BASIC, YEARLY maps PRO. builder/queries.ts:51–55; payments/catalog.ts:55–69. | Confirm intended monthly tier and test plan limits before paid acceptance. |
| F13 LOW | Client/server field limits differ; manual Broker lead source defaults PROPERTY. workspace_screen.dart:61–76,780–785; validation.ts:198–206,674–714. | Match per-action minima/maxima/positive numbers, and intended DASHBOARD attribution, while keeping strict server validation. |
| F14 INCOMPLETE | Provider requests gate lacks actionable business-verification explanation; native completed-booking review form and richer profile fields missing; booking currency omitted. Provider create:59; mobile/workspace:80–86; booking UI:1877–1896. | Preserve verification, explain setup and connect supported existing actions/fields. |

Paths shortened in this table refer to mobile-app/lib/features/... for Flutter, backend/api/... for handlers, and src/lib/... or prisma/... for helpers/models. The detailed action maps and full base paths remain in the historical/source references below.

### Verification results and changed files

- Full current Flutter suite: **517 passed**, zero failures.
- Full backend npm test: **TypeScript +six smoke checks +236 Node tests passed**, zero failures/skips after one stale-test correction.
- Initial backend failure: tests/property-realtime-writes.test.mjs:239 expected three photos to be invalid under the older four-photo policy. Its fixture now uses one DISTINCT photo; existing HTTP400/no-event assertions are preserved. This is test maintenance, not an application/backend feature fix.
- Flutter analysis across lib and test: **zero errors/warnings; 78 informational lints**, using --no-pub --no-fatal-infos.
- Additional isolated diagnostics reproduced F1/F2/F3 using synthetic in-memory accounts/storage only: one Flutter and two Node checks. “Pass” for those diagnostic assertions means the unwanted behavior was reproduced, not that the feature passed acceptance.
- Diagnostic files: mobile-app/build/role-cross-check-20261104-bfcabf4/enquiry_account_repro_test.dart and api_scope_repro.test.mjs. These are ignored local build artifacts.
- Tracked changes: **this existing audit matrix and tests/property-realtime-writes.test.mjs only**. No application/backend feature source changed.
- No accounts, real API requests, database access/commands/writes/migrations, APK build/install/launch, Railway settings, deployment/restart, production access, commit or push.

### External prerequisites and next actions

Current local staging configuration explicitly enables API mode for https://homezone-staging.up.railway.app. Image hosts include images.pexels.com and res.cloudinary.com. HOMEZONE_MEDIA_HOSTS is empty, so video/tour links are deliberately blocked. Keep TLS, exact hosts, credential and redirect restrictions.

Current effective Railway variables, deployment SHA/schema and external providers were not queried. Photo storage requires existing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET; private documents require encrypted storage/scanner configuration; website payments have capability/provider gates. Presence/compliance is **UNKNOWN**, not verified.

Six photos is the initial creation-picker cap, not a total listing cap: later media additions/server galleries still allow40. Existing USER-to-OWNER conversion on property creation also remains a policy decision. Retained PrivateFile relations can block deletion; do not bypass retention.

**Implementation order:** F1/F2/F3 isolation fixes and regressions; F4 payment amount correctness; F5/F6/F11 write boundaries; F10 Studio state mismatch; then team linkage, Builder publication, Provider onboarding/reviews/currency, native recovery/legal content and remaining coverage.

After corrections, separately authorize controlled staging acceptance per role: private approved credentials, actual Android role dashboard, confirmed profile/session, owned records, permitted write plus readback, foreign-record denial, expired/revoked session, process restart, logout and network failures. Matching backend/schema/APK, working providers and approved records are prerequisites. No role is fully runtime verified by this review.

## Historical audit from 2026-10-30

The original report below is retained for traceability. Its PIN/authentication and Owner publication assumptions belong to the older baseline and do not override the current findings above.


Date: 2026-10-30; baseline 18ebcb401e95e178c1bc3f9f16faea735a044063. All five authenticated role journeys: **API CONNECTED — RUNTIME UNVERIFIED**, with staging authentication **BLOCKED BY ENVIRONMENT at latest observation**. No role dashboard is newly runtime verified by this source audit.

## Common gate and response contract

app/homezone_app.dart /buyer route selects dashboard from verified identity, then features/auth/profile_dashboard_gate.dart independently confirms GET /api/mobile/account?view=profile role/status. For USER child is MarketplaceScreen; all other roles use WorkspaceScreen. /workspace reuses the gate. WorkspaceScreen is an intentional shared role-aware dashboard, not five invented independent APIs.

MarketplaceRepository.workspacePage → GET /api/mobile/workspace?module=...&mode=cursor&parent=...&after=...; response source=database,module,role,mode,items,hasMore,nextCursor. Server query strictly validates module/parent/pagination, derives actor from Auth.js, rejects suspended profiles and checks role/resource ownership. Client requires response role matches verified session, bounded rows and nonrepeating cursor. Cursor proves pagination position, not authorization; each server query repeats actor scoping.

## Role comparison

| Public selection / stored role | Screen/route and profile source | Reads and DB models | Backend scope / actions / limits |
| --- | --- | --- | --- |
| Buyer / USER | MarketplaceScreen at /buyer; account() + profile gate; My role workspace opens WorkspaceScreen | Public Property catalogue/detail; SavedProperty,PropertyShortlist,ShortlistProperty,Lead through account collections; workspace history,notifications,requests,serviceBookings,studio,payments,accountRequests,visits,properties | Saved/shortlist/enquiry actor is authenticated profile; public catalogue PUBLISHED only. Save/shortlist/enquiry/profile forms have backend calls. Workspace properties is own inventory, not all Property rows. Existing create-property endpoint can change USER→OWNER; founder must review this existing policy. |
| Owner / OWNER | WorkspaceScreen at shared /buyer or /workspace; verified profile | workspace properties and ownerEnquiries; Property ownerId=profile.id, Lead.property.ownerId=profile.id; summary MY_LISTINGS; common modules | POST /api/properties, PATCH /api/properties/[id], media route/upload. Owner/admin resource checks; PUBLISHED requires VERIFIED listing for non-admin. Direct OWNER registration does not instantly publish a property. |
| Broker / BROKER | WorkspaceScreen same gated routes | properties/ownerEnquiries plus crm/calendar/team/commissions; Lead.assignedTo=profile.id, LeadTask lead assignment, BrokerTeamMember.brokerId, BrokerCommission.brokerId; common modules | /api/pro/leads, /api/leads/[id] and notes/tasks/visits, /api/pro/team, assignments, commission. Team rows are not arbitrary linked users; leadAccessWhere scopes nested operations. No public role choice grants another broker's team/leads. |
| Builder / BUILDER | WorkspaceScreen; Projects & inventory | projects; nested units,towers,builderTeam,campaigns,bookings with parent owned BuilderProject; BuilderProject/Unit/Tower/TeamMember/Campaign/Booking; summary DB metrics | /api/builder/projects; nested POST units/towers/team/campaigns; PATCH /api/mobile/workspace/[id] with module,parent; booking transitions. Server rejects non-BUILDER and foreign parent. Existing project/inventory records absent from evidence, not from schema. |
| Service Provider / SERVICE_PROVIDER | WorkspaceScreen; Provider profile, incoming requests | providerProfile,providerRequests,serviceBookings plus common modules; ServiceProvider.profileId,ServiceRequest,ServiceQuote,ServiceBooking | POST /api/service-providers requires SERVICE_PROVIDER, creates verified=false. PATCH /api/service-providers/me, quotes and bookings; incoming work requires verified nonsuspended provider and matching category/city/assignment. Public account role is immediate, but service-business verification is an existing separate restriction. |

Common modules: requests,serviceBookings,studio,notifications,payments,accountRequests,visits,history. Server scopes requester/customer/provider/recipient relationships separately; one shared UI does not imply identical write permissions for all roles. providerProfile response may be empty until a service entity is created. Submitting registration alone does not create project/team/provider relationships.

ADMIN/SUPER_ADMIN are never public role selections. WorkspaceScreen shows existing web-admin entry information rather than mobile administrative tools, and workspace list handler rejects admin roles with web-admin instruction. Do not call this missing backend admin support.

## Action-to-contract map

| UI/action | Route/method and request | Response / authorization |
| --- | --- | --- |
| Role list / record | GET /api/mobile/workspace module,parent,mode,after | items + scoped role/cursor envelope; actor from server session. |
| Metrics | GET /api/mobile/summary module/parent according to handler | metrics, DB-derived; builder parent ownership where needed. |
| New/edit listing | POST /api/properties; PATCH /api/properties/[id] with existing property schema | property response; property owner/admin and lifecycle checks; no local fake record. |
| Broker create lead | POST /api/pro/leads name,phone,message | server lead; BROKER/current profile rules. |
| Lead follow-up | PATCH /api/leads/[id]; POST notes {note}, tasks {title,dueAt}, visits {scheduledAt,...} | persisted lead/note/task/visit; existing scoped server validators. |
| Team creation/edit | POST /api/pro/team; PATCH /api/pro/team/[id]; builder nested team POST and mobile workspace PATCH | member fields incl name,email,phone,role; team role enums differ from public profile roles. Do not conflate them. |
| Builder project | POST /api/builder/projects name,city,description,constructionStatus; PATCH [id] | BuilderProject; actor-owned. |
| Builder child updates | POST nested project units/towers/team/campaigns; PATCH /api/mobile/workspace/[id] module,parent and allowed fields | unit/tower/member/campaign result; owned parent verified. Existing validators define complete fields; no wildcard write authority. |
| Provider profile | POST /api/service-providers; PATCH /api/service-providers/me businessName,category,city,description,priceLabel,availability | provider record; role/entity ownership; verified=false at creation. |
| Service request/quote | POST /api/service-requests category,city,budget,message; POST /api/service-quotes requestId,amount,currency,message; PATCH /api/service-quotes/[id] existing action | request/quote response; requester/provider scope and transition rules. |
| Booking change | PATCH /api/service-bookings/[id] or /api/builder/bookings/[id] | persisted booking transition; authorization repeated server-side, not UI-selected role. |
| Notification read | PATCH /api/notifications/[id] | recipient-scoped update; no push delivery established. |
| Profile edit | PATCH /api/mobile/account city,phone | profile, no public role update; contact phone not login identity. |
| Private documents/account requests | /api/mobile/documents and [id]; POST /api/mobile/account-requests | PrivateFile/AccountServiceRequest; storage/scanner and actual operational processing remain separate readiness gates. |

This map documents selected actual fields, not an assertion that every optional backend field has a mobile form. Exact validators in src/lib/api/validation.ts and route/service schemas remain authoritative. Detailed field-complete parity for all shared forms requires follow-up focused checks; no runtime inference.

## Demo versus real dashboards

features/buyer/buyer_shell.dart plus buyer/screens/* import demo_properties.dart and buyer_collections.dart: DEMO / MOCK ONLY. /buyer-preview always uses this fictional experience. When API mode is disabled, /buyer also represents preview, not an authenticated dashboard. In API mode /buyer uses real MarketplaceScreen/WorkspaceScreen and does not substitute demo rows on request failure. Comparison/recent UI state may remain local by design and is explicitly separate from persisted account collections.

## Gaps and review decisions

- No authenticated role/dashboard runtime proof; do not count list/route existence as completion.
- Existing USER→OWNER conversion on property creation must be reconciled with founder expectations for role changes. Login never changes roles. The form revalidates session after create-property response.
- Existing provider verification and listing publication rules are business gates, not signup approval. Decide whether to preserve/communicate them; do not remove under an audit.
- Empty datasets, unknown linked entities and empty media hosts prevent full business/media verification without authorized fixtures/configuration.
- Workspace generic mutation success checks returned data but do not establish external processing (payments, refund/deletion requests, media scans). Do not present recorded request as completed operation.
- Existing email-verification help wording is stale for mobile PIN; source-only text correction can be separately approved.

Required evidence for EACH role: controlled account approval, real login/session/profile match, actual Android dashboard, owned-record retrieval, permitted mutation acknowledgment and readback, foreign-record denial, restoration/logout. No records created and no verification run here.
