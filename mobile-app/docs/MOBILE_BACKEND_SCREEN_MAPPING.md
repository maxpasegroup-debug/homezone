# Mobile screen-to-backend mapping

Audit: 2026-10-30. See DEMO_UI_INVENTORY for 40 screen units and A–F status.
Paths below include /api. Repository abbreviations: MR = MarketplaceRepository
(features/marketplace/marketplace_repository.dart), PP = PasswordAuthProtocol,
SC = SignInController. Generic workspace records use JsonObject, not invented
typed domain models. Existing wrapper AccountListingScreen calls LivePropertyScreen.

## Shared read contracts

| Caller/screens | Actual method/path and inputs | Output displayed / Flutter model | Auth / backend models | Class / missing work |
|---|---|---|---|---|
| AuthForm login, Registration postverify | PP GET /api/auth/csrf; POST /api/auth/callback/password form {csrfToken,email,password,callbackUrl:'/'}; GET /api/auth/session | Callback is not identity; independent user{id,role,whatsappVerified}/expires -> SC VerifiedIdentity | Public credentials/CSRF; User/PasswordCredential/Profile/AuthSession/RegistrationBudget | C login path; social icons remain A; verify runtime |
| RegistrationScreen | MR POST /api/auth/password/signup {name,email,password}; /resend {challengeId}; /verify {challengeId,code} | 202 challengeId/expiresAt/expiresIn/resendAt/resendAfter; 200 verified:true; then PP | Public mobile email OTP; EmailRegistration, RegistrationBudget, account transaction | C; delivery/account creation unverified, no phone field |
| AccountAccess forgot/reset | MR POST /api/auth/password/forgot {email}; /reset {token,password} | message; no inferred delivery | Public; User/PasswordResetToken/PasswordCredential/AuthSession | D; locally-invalidated-boundary correction and reset links outstanding |
| Startup, resume, dashboard gate | SC verifies GET /api/auth/session; MR GET /api/mobile/account?view=profile | Authoritative identity; {profile:{fullName,city,phone,role,verificationStatus}} | Session; Profile, AuthSession | C; profile role match/error; verify stale roles/restart |
| Marketplace catalogue/search/filters/cards | MR.listings GET /api/mobile/properties?page=1&pageSize=12 plus filters keyword/city/country/state/locality/purpose/category/currency/minPrice/maxPrice/bedrooms/bathrooms/verifiedOnly/sort | {properties,page,hasMore,source:'database'} -> ListingPage/List<Listing> | Public; Property | D screen; only one historical empty request E workflow |
| Detail, AccountListingScreen, related cards | MR.detail GET /api/mobile/properties/[id]; listings for related city/category | {property,source:'database'} -> Listing; ID equality required | Public; Property status PUBLISHED | C; nonempty/404/runtime mapping unverified |
| Gallery/ListingImage | ListingMedia.load approved absolute image URL, no auth client | Bounded image bytes -> Image.memory/fallback | Public host policy; URL strings in Property | C; empty allowlists block loading; no new backend needed |
| Video/tour/maps confirmation | PublicListingMediaButton/ListingLocation native bridge; no authenticated API | External-app result/availability feedback | Public links/coordinates; no credential transfer | D action; provider/browser availability and platform behavior unverified |
| Marketplace saved/shortlists/enquiries/profile | MR.account -> GET /api/mobile/account?view=profile and GET /api/mobile/account/collections?collection=saved/shortlists/enquiries, cursor,parent where relevant | {collection,parent,items,nextCursor}; saved Listing, shortlist JSON, Lead projections | Authenticated self; Profile/SavedProperty/PropertyShortlist/ShortlistProperty/Lead | C actions; validate pagination/cross-account behavior |
| Save hearts/status | MR.savedStatus GET /api/mobile/saved-status?propertyId; MR.save POST/DELETE /api/properties/[id]/save | propertyId/saved; saved bool acknowledgment | Authenticated; SavedProperty | C; server errors remain errors |
| Shortlist name/delete/member dialogs | MR.shortlist POST /api/shortlists or PATCH /api/shortlists/[id] {name}; DELETE /[id]; POST/DELETE /[id]/properties {propertyId} | shortlist.id, ok, added matched to intent | Authenticated owner; PropertyShortlist/ShortlistProperty | C; concurrency/duplicate names/runtime unverified |
| EnquiryForm | MR.enquire POST /api/leads {propertyId,name,phone,message,source:'PROPERTY',contactAction:'INQUIRY'} | ok:true, lead.id; generic mutation feedback | Authenticated; Lead/Property/Profile | C; no owner delivery/follow-up proof |
| ProfileEditScreen | Returns (city,phone); parent MR.updateProfile PATCH /api/mobile/account | profile acknowledgment; then account reload | Self only; Profile; changed phone loses phone verification | C; no direct role assignment |
| ComparisonScreen | Local real Listing objects, max four; no API | Facts table; no durable history/AI claims | Session-gated UI | B; /api/properties/compare exists separately but unused here |
| LiveFilterSheet | Local map returned to parent catalogue load | Query controls only | Public, no model write | B; not missing backend integration |
| WorkspaceRecords/Picker | MR.workspacePage GET /api/mobile/workspace?module=...&mode=cursor&parent=...&after=... | {source,module,mode,items,hasMore,nextCursor}; <=20, JSON rows | Session plus module ownership/role; models below | C; verify every module with fixtures |
| WorkspaceSummary | MR.call GET /api/mobile/summary[?project=id] | {source:'database',metrics:{...}}; actual counts | Nonsuspended nonadmin, owned builder project | C; no fake stats; unverified |
| Logout menus | SC.signOut -> PP CSRF/signout; local/vault clear | Acknowledged vs local-only feedback | Authenticated; AuthSession revoked | C; remote failure/restart/clear failure unverified |

All B/demo screens (inventory #1–3,5–20,24,29,31) have no direct repository unless
explicitly noted above. Their local controls should remain labelled preview or
local; do not silently redirect their success screens into authenticated routes.

## Workspace module/action contracts

All module lists below use the shared workspace GET contract above and MR.call.
WorkspaceForm encodes its FieldSpec inputs into JSON; WorkspaceDetail dispatches
module-specific handlers. Responses are generic JsonObject checks/acknowledgments,
not typed full contract validation. Current source is C unless a partial boundary
is identified. Actor/generation/busy checks exist but need runtime race coverage.

| Module / role | Main write endpoint and request fields | Read/display fields / model | Missing integration or limitation |
|---|---|---|---|
| properties; USER/OWNER/BROKER | POST /api/properties {title,description,city,intent,category,propertyType,...,_propertyFields,status:DRAFT}; PATCH /[id] editable fields/status | title,status,verificationStatus,updatedAt; Property | OWNER promotion on USER creation; session revalidated; verified listing/admin required to publish; no listing was published |
| ownerEnquiries; OWNER/BROKER | PATCH /api/leads/[id] stage/status fields; notes/tasks/visits child POST | lead contact/stage plus nested records; Lead/LeadNote/LeadTask/LeadSiteVisit | Ownership/assignment access enforced backend; verify against owned fixtures |
| crm; BROKER | POST /api/pro/leads {name,phone,message}; notes/tasks; POST /api/pro/leads/[id]/assignments {assigneeId}; POST /commission {dealValue,commissionPercent,status,notes} | pipeline/contact/assignment/commission JSON; Lead/BrokerTeamMember/BrokerCommission | Picker requires active linked member; team record alone is not delegated identity; commission record not money transfer |
| leadNotes/leadTasks/leadVisits/calendar | POST/PATCH /api/leads/[id]/notes[/noteId] {note}, /tasks[/taskId] {title,dueAt,completedAt}, /visits[/visitId] {scheduledAt,status,notes}; author/access checks | note,canEdit; task/completedAt/dueAt; visit/status/time | All server transitions/races need verification |
| team; BROKER | POST /api/pro/team {name,email,phone,role}; PATCH /[id] fields/active | BrokerTeamMember records | No approved invitation/delegated login policy; do not represent as secure member provisioning |
| commissions; BROKER | Commission write from crm above | BrokerCommission amounts/status/lead | No payment/settlement guarantee; owner policy unresolved |
| projects; BUILDER | POST /api/builder/projects _projectFields name/city/description/constructionStatus/etc; PATCH /[id] | BuilderProject plus summary | Generic form/read coverage, no runtime evidence |
| units/towers/builderTeam/campaigns; owned project | POST /api/builder/projects/[parent]/units {unitNumber,unitType,price,areaValue,floor,bedrooms,bathrooms}; /towers {name,floors}; /team {name,email,phone,role}; /campaigns {name,channel,budget}; PATCH /api/mobile/workspace/[id] with module,parent and allowed fields | BuilderUnit/Tower/TeamMember/Campaign | Per-parent ownership required, no advertising provider execution inferred |
| bookings; owned builder project | POST /api/builder/projects/[parent]/bookings {unitId,bookingAmount,notes}; PATCH /api/builder/bookings/[id] {action:CONFIRM/RELEASE/SOLD} as permitted | BuilderBooking status, unit/customer data | Reservation != processed payment; concurrency/stale-unit cases unverified |
| providerProfile; SERVICE_PROVIDER | POST /api/service-providers _providerFields; PATCH /api/service-providers/me partial provider fields | ServiceProvider businessName/category/city/verified/suspended | Admin approval independent; no auto-approval added |
| requests; requester | POST /api/service-requests {category,city,budget,message} | ServiceRequest id/category/city/status; child quotes | No real provider fulfillment proof |
| providerRequests; verified nonsuspended SERVICE_PROVIDER | POST /api/service-quotes {requestId,amount,currency,message,validUntil}; provider quote withdrawal through /api/service-quotes/[id] | ServiceRequest scoped to provider/category/city, ServiceQuote | Provider approval/configuration prerequisites |
| requestQuotes; requester/provider | PATCH /api/service-quotes/[id] action ACCEPT/REJECT/WITHDRAW as permitted | amount,currency,status,validUntil,provider,canDecide | Accept creates/changes booking per backend; not payment proof |
| serviceBookings; customer/provider | PATCH /api/service-bookings/[id] {action,notes,scheduledAt}; website continuation where supported | ServiceBooking amount,status,scheduledAt,canManage | Native review UI not wired despite backend review route; refund rules not implemented by screen |
| studio; requester | POST /api/studio-requests {serviceType,city,budget,notes,status:SUBMITTED}; PATCH /[id] existing approval/update fields; POST /[id]/revisions {notes} | StudioRequest serviceType,status,paymentStatus,notes,schedule; files/revisions via existing endpoints | Operator assignment/deliverables/payment advanced actions use website; no equivalent complete mobile operator console |
| notifications | PATCH /api/notifications/[id] read action | Notification title/message/readAt | Inbox only; push/device-token delivery not found in mobile |
| visits | POST /api/mobile/visits {propertyId,scheduledAt,notes}; PATCH /[id] cancellation | LeadSiteVisit schedule/status/property title | Request is not confirmed appointment; owner approval required |
| history | Detail optionally POST /api/properties/[id]/view; MR.history GET workspace module history | PropertyView viewedAt + public Listing | Authenticated opening can write history; future read verification must authorize side effect |
| payments | Capability GET /api/mobile/capabilities; confirmed native browser /dashboard/... continuation | Payment status/product/amountLabel/paidAt | D: provider/web checkout separate; no native settlement/refund claimed |
| accountRequests | POST /api/mobile/account-requests {kind:DELETION_REVIEW or REFUND_REVIEW,paymentId where applicable} | AccountServiceRequest kind/status/createdAt; executionPerformed:false | Review only; no deletion/refund engine or policy invented |

Exact FieldSpec definitions and backend validators remain the contract authority
for optional fields and bounds. They are retained unchanged by this audit; the
backend API appendix lists actual handler validators/methods and model accesses.

## Media/documents and nested actions

| Screen/action | Method/path + input | Output/backend/permission | Class |
|---|---|---|---|
| ListingPhotographs load/change | GET /api/properties/[id]/media; POST same with action-specific mediaUrl/mediaUrls/mediaType plus expectedUpdatedAt/expectedMediaState as required by existing action schema | property media snapshot/version; ownership/admin restrictions, stale state conflict | C |
| Native photo upload | MR POST /api/mobile/upload {propertyId,base64}; native media-picker selection | {url}; owned nonsuspended OWNER/BROKER, byte MIME validation, Cloudinary; attaches public URL | C, provider/host setup blocked |
| PrivateDocuments list/upload | GET /api/mobile/documents?scope=property/lead/studio&parent=id; POST {scope,parent,fileName,base64,documentType:'OTHER'} | {files,canUpload,maximumBytes} / file; PrivateFile and scoped parent relations, private storage/scanner required | D |
| PrivateDocuments download | MR GET /api/mobile/documents/[id], then confirmed native export of returned base64/fileName | Private bytes only for authorized actor; no public gallery URL; exported copy outside app cannot be revoked by logout | D, platform/provider runtime unverified |
| Record picker | Workspace/account cursor query for eligible records | Selected JsonObject only; parent performs real write | C source; selection is not write acknowledgment |
| Public media link dialog | Local bounded URL validation; property media mutation only after submission | External URL is not app-owned/private document | B dialog inside C photos workflow |

## Missing backend versus missing mobile wiring

F: public phone registration/provider delivery; real backend support must be
designed/approved first. Push-token registration/delivery was not found in the
inspected mobile API surface. Do not invent endpoints.

Existing backend, missing dedicated native wiring: reels/social interactions, AI
assistant/analyzer, service booking reviews, rich Studio operator execution and
web-admin operations. Payment APIs exist but native checkout is not implemented;
maintain website handoff until a separate approved integration. Local comparison
and preview collections need not become new APIs to be truthful.

Confirmed corrective follow-up: owned anonymous recovery/reset admission;
profile/session change and cross-account race verification; stronger per-module
typed response checks where mutations currently accept any nonempty JSON.
No endpoint mismatch is inferred solely from absence of a dedicated mobile screen.
