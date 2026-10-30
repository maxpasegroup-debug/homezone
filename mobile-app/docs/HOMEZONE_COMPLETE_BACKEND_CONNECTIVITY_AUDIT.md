# Complete backend connectivity audit

Date: 2026-10-30. Baseline: main, 18ebcb401e95e178c1bc3f9f16faea735a044063. Overall: **PARTIALLY CONNECTED; authentication BLOCKED BY ENVIRONMENT based on latest available evidence**.

## Scope, classification and limits

Fresh source inventory of Flutter feature directories, centralized transport/auth/session code, app routing, Next.js API route tree and relevant backend delegates/services, Prisma models, migration files, environment/build scripts and existing evidence. This is a source integration audit, not an exhaustive correctness/security certification of every application line or every API's business rules. Route existence and static contracts are not runtime verification. No live requests, tests, builds, devices, database access or infrastructure actions were performed.

Status vocabulary: IMPLEMENTED IN SOURCE; API CONNECTED — RUNTIME UNVERIFIED; RUNTIME VERIFIED (historical evidence only where specified); PARTIALLY CONNECTED; DEMO / MOCK ONLY; MISSING; BLOCKED BY ENVIRONMENT; UNKNOWN. A route inventory is appended for all discovered src/app/api route files; it records declared handlers/delegates, not successful execution.

Existing untracked HOMEZONE_PRODUCTION_READINESS_AUDIT.md preserved. Only the four requested audit documents added. Historical reports contain older commits and states; actual source and explicitly dated evidence take precedence.

## Repository structure and connectivity foundation

| Layer | Exact files/directories | Assessment |
| --- | --- | --- |
| Flutter startup/routes | mobile-app/lib/main.dart; app/homezone_app.dart; app/session_scope.dart | API flag defaults false → preview. Explicit service defines construct one ApiClient, IoApiTransport, CookieRequestCoordinator, SignInController, MarketplaceRepository; startup independently restores session before choosing entry/dashboard. IMPLEMENTED IN SOURCE. |
| Environment | core/api/api_configuration.dart; config/staging.local.json; scripts/service-config.mjs; scripts/build-android.mjs | Explicit origin-only staging HTTPS URL. No /api prefix in base. Separate production config not established in config directory. Environment label does not itself prove hostname isolation. |
| HTTP | core/api/api_client.dart; core/api/api_transport.dart | Centralized request/JSON/error handling, default 20s request and 10s connection timeout, transport restricts origin and header names, redirects not followed automatically, normal TLS validation. No second client needed. |
| Cookies/CSRF | core/api/cookie_request_coordinator.dart; auth_request_options.dart; password_auth_protocol.dart | Existing Auth.js cookie transport and CSRF/session workflow; public versus protected boundaries and generation-based ownership. API repository strips raw response metadata at feature boundary. |
| Secure persistence | core/api/session_vault.dart; android/app/src/main/kotlin/com/example/homezone_mobile/SessionVaultBridge.kt | Scoped session credentials, Android Keystore AES-GCM and ordered writes/deletes. No PIN persistence. Actual native restart behavior unverified by this audit. |
| Backend | src/app/api routes; backend/api delegates; backend/auth.ts; src/lib/* services | Next.js routing, Auth.js credentials/JWT plus DB revocation registry, Prisma queries. Many wrapper routes re-export backend implementations; do not treat wrappers as missing handlers. |
| Database | prisma/schema.prisma; prisma/migrations | 21 local migrations, including PIN. PostgreSQL DATABASE_URL, shared backend/db.ts/src/lib/db.ts. Required deployed schema/history remains environment evidence, not source fact. |
| Preview | features/buyer/*; features/auth/auth_form_screen.dart, recovery_screens.dart | Intentionally fictional/local experience; separate from service-backed app. |

## Actual business feature contracts

Paths below are HTTP endpoints. Route file is src/app plus endpoint path plus /route.ts, replacing [id] parameters as shown. Shared role-list retrieval uses /api/mobile/workspace; full role matrix is in HOMEZONE_ROLE_DASHBOARD_CONNECTIVITY_MATRIX.md. All business rows are **API CONNECTED — RUNTIME UNVERIFIED** unless otherwise stated. Source files are relative to mobile-app/lib for Flutter and repository root for backend.

| Feature / screen and controller | Method + endpoint; important request fields | Response contract / DB models / authorization | Gaps |
| --- | --- | --- | --- |
| Discovery/search; MarketplaceScreen → MarketplaceRepository.listings | GET /api/mobile/properties; keyword, city/country/state/locality, purpose, category, currency, minPrice/maxPrice, bedrooms/bathrooms, verifiedOnly, sort, page and pageSize=12 | properties,page,hasMore,source=database; Property, public; src/lib/properties/mobile-catalog.ts validates strict filters and only PUBLISHED | Historical Flutter empty-catalogue HTTP 200 verified; nonempty results/search not runtime verified. Budget requires currency AND purpose. |
| Filters/pagination; LiveFilterSheet | Same GET; page 1–1000, pageSize server max24 | Repository requires matching page, <=12 rows, bool hasMore; server fetches lookahead; loading/empty/error/load-more states | Not evidence of live sorting/currency correctness or stable snapshot during concurrent changes. |
| Property detail; AccountListingScreen/LivePropertyScreen → detail | GET /api/mobile/properties/[id] | property,source=database; Property public published projection; ID match and status checked by Listing.parse | Nonempty detail/unpublished denial unverified. |
| Gallery/video/tour; LiveGalleryScreen, ListingImage, listing_media.dart, public_listing_media_button.dart | HTTPS image fetch / confirmed public media handoff; not an invented media API | coverImageUrl,mediaUrls,videoUrl,virtualTourUrl; Property; exact image/media hosts, safe fallback | Empty staging allowlists intentionally block remote delivery; approved production hosts missing. Browser handoff is not playback proof. |
| Favorites; MarketplaceScreen/AccountListingScreen → savedStatus/save | GET /api/mobile/saved-status?propertyId; POST/DELETE /api/properties/[id]/save | propertyId,saved / saved bool; SavedProperty, Property, Profile; authenticated actor | No optimistic fake success; cross-account behavior and expired-session trial unverified. |
| Shortlists; MarketplaceScreen → accountCollection/shortlist/membership | GET /api/mobile/account/collections?collection=saved/shortlists/shortlistItems/enquiries&cursor&parent; POST /api/shortlists {name}; PATCH/DELETE /api/shortlists/[id]; POST/DELETE /api/shortlists/[id]/properties {propertyId} | collection,parent,items,nextCursor; shortlist.id,ok,added; PropertyShortlist,ShortlistProperty,SavedProperty,Lead; authenticated owning profile | Cursor/parent contracts validated; actual account records and concurrent edits unverified. |
| Enquiry; EnquiryForm → enquire | POST /api/leads {propertyId,name,phone,message,source:PROPERTY,contactAction:INQUIRY} | ok,lead.id; Lead, Property, Profile; existing auth/rate/ownership rules | No auto-retry on uncertain mutation; contact field policies need controlled account trial. |
| Profile/settings; ProfileEditScreen → account/updateProfile | GET /api/mobile/account?view=profile; PATCH same {city,phone} | profile(fullName,city,phone,role,verificationStatus); Profile/User; session actor, no role edit | Editable phone is contact data, not MobilePinCredential login identity. User with new PIN account can lack fullName. |
| Role dashboard lists; WorkspaceScreen → workspacePage | GET /api/mobile/workspace {module,mode:cursor,parent?,after?} | source,module,role,items,mode,hasMore,nextCursor; module-specific models and actor scoping | Repository checks response role equals session role. Lists are not proof all actions work. |
| Dashboard metrics; workspace summary widget | GET /api/mobile/summary {module?,parent? per handler} | DB-computed metrics; Property,Lead,LeadTask,BuilderProject/Unit/Campaign/Booking,Notification,ServiceBooking | Actual metrics unverified; admin/other roles not implicitly authorized by UI. |
| Property create; WorkspaceScreen dynamic form | POST /api/properties; title,description,city,locality,country,state,address,latitude,longitude,price,intent,category,propertyType,currency,bedrooms,bathrooms,areaValue,areaUnit,amenities | property; Property/Profile; delegate backend/api/properties/route.ts + existing validation | Backend has existing USER→OWNER conversion on listing creation; form revalidates session afterward. This policy needs explicit reconciliation, not silent removal. |
| Edit/lifecycle; workspace property record | PATCH /api/properties/[id] listing fields or status DRAFT/PENDING_REVIEW/ARCHIVED/PUBLISHED; DELETE route also exists | property / existing handler response; owner/admin checks; Property verification required for non-admin publication | Direct public account role does not remove property review/verification. UI only offers PUBLISHED for VERIFIED listing. |
| Listing photographs/upload; ListingPhotographsScreen, workspace_record_picker.dart | POST /api/mobile/upload; existing bounded upload contract; POST /api/properties/[id]/media; photograph management per existing media handler | upload/media records; Property, ownership and storage checks | Do not claim URL attachment equals durable media storage; provider/storage config and actual upload unverified. |
| Broker CRM/team; WorkspaceScreen | POST /api/pro/leads {name,phone,message}; PATCH /api/leads/[id]; notes/tasks/visits routes; /api/pro/team POST/PATCH; assignments POST; commission POST | lead/member/task/note/visit/commission results; Lead,LeadTask,LeadNote,LeadSiteVisit,BrokerTeamMember,BrokerLeadAssignment,BrokerCommission | Exact field schemas remain respective server validators; no linked team is created by public role selection. |
| Builder; WorkspaceScreen | POST /api/builder/projects {name,city,description,constructionStatus}; nested units/towers/team/campaigns POST; PATCH /api/mobile/workspace/[id] {module,parent,...fields}; booking routes | project/unit/tower/team/campaign/booking; BuilderProject/Unit/Tower/TeamMember/Campaign/Booking | Parent ownership enforced; payment/booking transitions are not merely local buttons. No live inventory verified. |
| Provider/service requests; WorkspaceScreen | POST /api/service-providers {businessName,category,city,description,priceLabel,availability}; PATCH /api/service-providers/me; POST /api/service-requests {category,city,budget,message}; POST /api/service-quotes {requestId,amount,currency,message,...}; PATCH quote/booking routes | provider/request/quote/booking; ServiceProvider/Request/Quote/Booking; requester/provider ownership | New ServiceProvider record has verified=false; incoming work requires verified nonsuspended provider. Existing business verification differs from forbidden registration approval. |
| Notifications; WorkspaceScreen | GET workspace module notifications; PATCH /api/notifications/[id] | scoped notification records/read result; Notification recipientId | No evidence of a mobile push-token/delivery enrollment integration; in-app notifications are not push delivery. |
| Supporting modules; WorkspaceScreen/PrivateDocumentsScreen | workspace studio/payments/accountRequests/visits/history; /api/studio-requests and revisions; /api/mobile/account-requests; /api/mobile/visits; /api/mobile/documents and [id] | StudioRequest/Revision,Payment,AccountServiceRequest,LeadSiteVisit,PropertyView,PrivateFile with scoped handlers | A payment history/refund request is not a functioning payment gateway/refund execution; document encryption/scanner/storage setup requires separate readiness evidence. |

Listing projection checked against Flutter: id,title,description,intent,category,propertyType,price,currency,city,locality,country,areaValue,areaUnit,bedrooms,bathrooms,latitude,longitude,amenities,coverImageUrl,mediaUrls,videoUrl,virtualTourUrl,status. Nullable optional values remain nullable; numeric strings accepted only if finite/valid. Server state is not projected as public output; do not infer all DB attributes display on detail.

## Demo and local-only inventory

| Files / path | Classification and behavior |
| --- | --- |
| features/buyer/data/demo_properties.dart; buyer_shell.dart; buyer_home_screen.dart; buyer_search_screen.dart; buyer_property_detail_screen.dart; buyer_gallery_screen.dart; buyer_filter_sheet.dart | DEMO / MOCK ONLY: fictional listings, local filters/navigation. Explicit preview labels. |
| buyer_collections.dart; buyer_saved_screen.dart; buyer_shortlists_screen.dart; buyer_enquiries_screen.dart; buyer_compare_screen.dart; buyer_profile_screen.dart | DEMO / MOCK ONLY: in-memory collections/profile/history/examples, no real owner contact. |
| features/auth/auth_form_screen.dart and recovery_screens.dart; retained auth_screens wrappers | Preview email/password/social/recovery/success paths remain; active service entry uses MobilePinAuthScreen. Do not treat retained components as current mobile authentication requirements. |
| MarketplaceScreen ComparisonScreen/recent local state | IMPLEMENTED IN SOURCE, local-only by design: comparing displayed real listings and session-local recent presentation are not persistent account records. |
| src/lib/auth/profile.ts getDemoProfile; backend/auth.ts demo/mobile-demo | Demo providers/synthetic profiles still exist behind existing gates. Effective environment gates UNKNOWN; ensure real deployment does not substitute these for real PIN users. |

Source gap: MarketplaceScreen help text still says email-verified registration is available when configured; inconsistent with active mobile PIN/no-verification policy. Audit only: no UI text changed. config/README.md and MASTER_IMPLEMENTATION.md contain historical origin statements; current source and founder-approved environment separation take precedence.

## Missing capability versus unverified integration

- MISSING by deliberate policy: Forgot PIN, PIN rotation/recovery and phone possession verification. Do not add OTP or email requirements.
- Production Flutter configuration not established; separate release signing/application identity and image/media host approvals needed.
- Mobile administrative tools are intentionally not duplicated: WorkspaceScreen directs ADMIN/SUPER_ADMIN to existing web admin. Not missing backend administration.
- No dedicated mobile push-token enrollment flow found in inspected mobile source/routes; in-app Notification API does exist. External payment/refund execution is not established by history/request screens.
- No new backend endpoint is justified for PIN login, role persistence, catalogue, favorites, enquiry or the listed workspace modules: existing source routes must first be deployed/configured/verified. Do not recreate them.
- Detailed full-schema parity of every generic workspace action and all 120 route handlers remains UNKNOWN until focused review/authorized checks. This audit does not invent field-complete contracts for endpoints it only inventories.

## Environment and available runtime evidence

Staging configured origin https://homezone-staging.up.railway.app; production approved https://speeko.online. Current production configuration, separate databases/secrets, deployed SHA and replica identity UNKNOWN. Auth.js source allowlists two fixed production origins but selects only one canonical origin through AUTH_URL/NEXTAUTH_URL; AUTH_STAGING_ORIGIN approves only separate HTTPS staging origin.

Latest previously collected staging provider GET at 2026-10-30 09:01:40.173 UTC: HTTP 200, only password provider, callback origin https://speeko.online. Therefore staging PIN activation and callback isolation were BLOCKED BY ENVIRONMENT at that observation. It does not establish present settings or identify missing flag versus old/wrong deployment. No requests repeated here.

Founder-supplied 08:52 UTC logs show Postgres-9ZqA, railway/public, 21 migration files, no pending and Next.js ready. This supports migration-runner/startup evidence for that supplied environment, not exact deployed SHA, specific migration filename/checksum, complete catalog/drift or production schema. PIN applied status remains UNKNOWN without artifact/history correlation.

Historical actual Flutter catalogue HTTP 200/empty and visible Android UI are RUNTIME VERIFIED only for that limited recorded journey/build. No authenticated role workflow, nonempty detail/media, business mutation or complete app integration is runtime verified. Old black-screen evidence must not be reported as currently fixed or currently reproduced by this audit.

Deployment commands: railway.json npm run build; pre-deploy npm run db:migrate; start npm start -- --hostname 0.0.0.0. Pre-deploy applies ALL pending migrations. Never redeploy casually to investigate identity.

## Priorities

1. Confirm current staging identity/deployed artifact, private canonical URLs and activation prerequisites. Do not enable flag blind.
2. Reconcile PIN migration/client and secure configuration, obtain separate activation/deployment approvals.
3. Verify controlled registration/PIN login/profile/role/restoration/logout using real Flutter and approved account writes.
4. Verify one role/module at a time with authorized records, then nonempty listings/media and remaining workflows.
5. Resolve existing USER→OWNER listing policy and provider verification expectations with founder before claiming stable role behavior or universal direct access.

See the dedicated auth audit, dashboard matrix and implementation roadmap created alongside this report. No implementation performed.

## Static backend route inventory

120 route.ts entry files found. Methods below are declarations/re-exports detected from source, not tested contracts. Dynamic segments and catch-all Auth.js routing remain framework-handled. Every row is IMPLEMENTED IN SOURCE with runtime state UNKNOWN except narrowly dated observations above. Backend delegates are included where explicitly exported. This index does not assert that every endpoint is intended for Flutter.

| Endpoint | Declared methods | Source / delegate |
| --- | --- | --- |
| /api/admin/account-requests/[id] | PATCH | src/app/api/admin/account-requests/[id]/route.ts |
| /api/admin/ai/analytics | GET | src/app/api/admin/ai/analytics/route.ts ? @backend/api/admin/ai/analytics/route |
| /api/admin/ai/prompts | GET, POST | src/app/api/admin/ai/prompts/route.ts ? @backend/api/admin/ai/prompts/route |
| /api/admin/ai/settings | GET, POST | src/app/api/admin/ai/settings/route.ts ? @backend/api/admin/ai/settings/route |
| /api/admin/profiles/[id]/verify | PATCH | src/app/api/admin/profiles/[id]/verify/route.ts ? @backend/api/admin/profiles/[id]/verify/route |
| /api/admin/properties/[id]/moderate | PATCH | src/app/api/admin/properties/[id]/moderate/route.ts ? @backend/api/admin/properties/[id]/moderate/route |
| /api/admin/properties/[id]/verify | PATCH | src/app/api/admin/properties/[id]/verify/route.ts ? @backend/api/admin/properties/[id]/verify/route |
| /api/admin/reels/[id]/moderate | PATCH | src/app/api/admin/reels/[id]/moderate/route.ts ? @backend/api/admin/reels/[id]/moderate/route |
| /api/admin/reports/[id] | PATCH | src/app/api/admin/reports/[id]/route.ts ? @backend/api/admin/reports/[id]/route |
| /api/admin/service-providers/[id] | PATCH | src/app/api/admin/service-providers/[id]/route.ts ? @backend/api/admin/service-providers/[id]/route |
| /api/admin/studio-requests/[id]/status | PATCH | src/app/api/admin/studio-requests/[id]/status/route.ts ? @backend/api/admin/studio-requests/[id]/status/route |
| /api/admin/users/[id]/password | PATCH | src/app/api/admin/users/[id]/password/route.ts ? @backend/api/admin/users/[id]/password/route |
| /api/admin/users/[id] | PATCH | src/app/api/admin/users/[id]/route.ts ? @backend/api/admin/users/[id]/route |
| /api/ai/analyzer | POST | src/app/api/ai/analyzer/route.ts ? @backend/api/ai/analyzer/route |
| /api/ai/areas | POST | src/app/api/ai/areas/route.ts ? @backend/api/ai/areas/route |
| /api/ai/assistant | POST | src/app/api/ai/assistant/route.ts ? @backend/api/ai/assistant/route |
| /api/ai/business | POST | src/app/api/ai/business/route.ts ? @backend/api/ai/business/route |
| /api/ai/compare | POST | src/app/api/ai/compare/route.ts ? @backend/api/ai/compare/route |
| /api/ai/history | GET | src/app/api/ai/history/route.ts ? @backend/api/ai/history/route |
| /api/ai/lead-assistant | POST | src/app/api/ai/lead-assistant/route.ts ? @backend/api/ai/lead-assistant/route |
| /api/ai/property-intelligence | POST | src/app/api/ai/property-intelligence/route.ts ? @backend/api/ai/property-intelligence/route |
| /api/ai/recommendations | POST | src/app/api/ai/recommendations/route.ts ? @backend/api/ai/recommendations/route |
| /api/ai/search | POST | src/app/api/ai/search/route.ts ? @backend/api/ai/search/route |
| /api/auth/[...nextauth] | GET, POST | src/app/api/auth/[...nextauth]/route.ts ? @backend/api/auth/[...nextauth]/route |
| /api/auth/otp/send | POST | src/app/api/auth/otp/send/route.ts ? @backend/api/auth/otp/send/route |
| /api/auth/otp/verify | POST | src/app/api/auth/otp/verify/route.ts ? @backend/api/auth/otp/verify/route |
| /api/auth/password/forgot | POST | src/app/api/auth/password/forgot/route.ts ? @backend/api/auth/password/forgot/route |
| /api/auth/password/reset | POST | src/app/api/auth/password/reset/route.ts ? @backend/api/auth/password/reset/route |
| /api/auth/password/signup/resend | POST | src/app/api/auth/password/signup/resend/route.ts |
| /api/auth/password/signup | POST | src/app/api/auth/password/signup/route.ts ? @backend/api/auth/password/signup/route |
| /api/auth/password/signup/verify | POST | src/app/api/auth/password/signup/verify/route.ts |
| /api/auth/password/web-signup | POST | src/app/api/auth/password/web-signup/route.ts |
| /api/builder/bookings/[id] | PATCH | src/app/api/builder/bookings/[id]/route.ts ? @backend/api/builder/bookings/[id]/route |
| /api/builder/projects/[id]/bookings | POST | src/app/api/builder/projects/[id]/bookings/route.ts ? @backend/api/builder/projects/[id]/bookings/route |
| /api/builder/projects/[id]/campaigns | POST | src/app/api/builder/projects/[id]/campaigns/route.ts ? @backend/api/builder/projects/[id]/campaigns/route |
| /api/builder/projects/[id] | PATCH | src/app/api/builder/projects/[id]/route.ts ? @backend/api/builder/projects/[id]/route |
| /api/builder/projects/[id]/team | POST | src/app/api/builder/projects/[id]/team/route.ts ? @backend/api/builder/projects/[id]/team/route |
| /api/builder/projects/[id]/towers | POST | src/app/api/builder/projects/[id]/towers/route.ts ? @backend/api/builder/projects/[id]/towers/route |
| /api/builder/projects/[id]/units | POST | src/app/api/builder/projects/[id]/units/route.ts ? @backend/api/builder/projects/[id]/units/route |
| /api/builder/projects | GET, POST | src/app/api/builder/projects/route.ts ? @backend/api/builder/projects/route |
| /api/builder/reports | GET | src/app/api/builder/reports/route.ts ? @backend/api/builder/reports/route |
| /api/investment/report | POST | src/app/api/investment/report/route.ts ? @backend/api/investment/report/route |
| /api/leads/[id]/notes/[noteId] | PATCH, DELETE | src/app/api/leads/[id]/notes/[noteId]/route.ts ? @backend/api/leads/[id]/notes/[noteId]/route |
| /api/leads/[id]/notes | POST | src/app/api/leads/[id]/notes/route.ts ? @backend/api/leads/[id]/notes/route |
| /api/leads/[id] | GET, PATCH | src/app/api/leads/[id]/route.ts ? @backend/api/leads/[id]/route |
| /api/leads/[id]/tasks/[taskId] | PATCH | src/app/api/leads/[id]/tasks/[taskId]/route.ts ? @backend/api/leads/[id]/tasks/[taskId]/route |
| /api/leads/[id]/tasks | POST | src/app/api/leads/[id]/tasks/route.ts ? @backend/api/leads/[id]/tasks/route |
| /api/leads/[id]/visits/[visitId] | PATCH | src/app/api/leads/[id]/visits/[visitId]/route.ts ? @backend/api/leads/[id]/visits/[visitId]/route |
| /api/leads/[id]/visits | POST | src/app/api/leads/[id]/visits/route.ts ? @backend/api/leads/[id]/visits/route |
| /api/leads/notifications/[id] | PATCH | src/app/api/leads/notifications/[id]/route.ts ? @backend/api/leads/notifications/[id]/route |
| /api/leads | GET, POST | src/app/api/leads/route.ts ? @backend/api/leads/route |
| /api/media/upload | POST | src/app/api/media/upload/route.ts ? @backend/api/media/upload/route |
| /api/mobile/account-requests | POST | src/app/api/mobile/account-requests/route.ts |
| /api/mobile/account/collections | GET | src/app/api/mobile/account/collections/route.ts |
| /api/mobile/account | GET, PATCH | src/app/api/mobile/account/route.ts |
| /api/mobile/auth/register | POST | src/app/api/mobile/auth/register/route.ts |
| /api/mobile/capabilities | GET | src/app/api/mobile/capabilities/route.ts |
| /api/mobile/documents/[id] | GET | src/app/api/mobile/documents/[id]/route.ts |
| /api/mobile/documents | GET, POST | src/app/api/mobile/documents/route.ts |
| /api/mobile/properties/[id] | GET | src/app/api/mobile/properties/[id]/route.ts |
| /api/mobile/properties | GET | src/app/api/mobile/properties/route.ts |
| /api/mobile/saved-status | GET | src/app/api/mobile/saved-status/route.ts |
| /api/mobile/summary | GET | src/app/api/mobile/summary/route.ts |
| /api/mobile/upload | POST | src/app/api/mobile/upload/route.ts |
| /api/mobile/visits/[id] | PATCH | src/app/api/mobile/visits/[id]/route.ts |
| /api/mobile/visits | POST | src/app/api/mobile/visits/route.ts |
| /api/mobile/workspace/[id] | PATCH | src/app/api/mobile/workspace/[id]/route.ts |
| /api/mobile/workspace | GET | src/app/api/mobile/workspace/route.ts |
| /api/notifications/[id] | PATCH | src/app/api/notifications/[id]/route.ts ? @backend/api/notifications/[id]/route |
| /api/notifications | GET | src/app/api/notifications/route.ts ? @backend/api/notifications/route |
| /api/owner/leads/[id]/notes | POST | src/app/api/owner/leads/[id]/notes/route.ts ? @backend/api/owner/leads/[id]/notes/route |
| /api/owner/leads/[id] | PATCH | src/app/api/owner/leads/[id]/route.ts ? @backend/api/owner/leads/[id]/route |
| /api/payments/checkout | POST | src/app/api/payments/checkout/route.ts ? @backend/api/payments/checkout/route |
| /api/payments/verify | POST | src/app/api/payments/verify/route.ts ? @backend/api/payments/verify/route |
| /api/payments/webhook | POST | src/app/api/payments/webhook/route.ts ? @backend/api/payments/webhook/route |
| /api/private-files/[id] | GET | src/app/api/private-files/[id]/route.ts |
| /api/pro/automation | GET, POST | src/app/api/pro/automation/route.ts ? @backend/api/pro/automation/route |
| /api/pro/calendar | GET | src/app/api/pro/calendar/route.ts ? @backend/api/pro/calendar/route |
| /api/pro/leads/[id]/assignments | POST | src/app/api/pro/leads/[id]/assignments/route.ts ? @backend/api/pro/leads/[id]/assignments/route |
| /api/pro/leads/[id]/commission | POST | src/app/api/pro/leads/[id]/commission/route.ts ? @backend/api/pro/leads/[id]/commission/route |
| /api/pro/leads/[id]/documents | POST | src/app/api/pro/leads/[id]/documents/route.ts ? @backend/api/pro/leads/[id]/documents/route |
| /api/pro/leads/[id]/notes | POST | src/app/api/pro/leads/[id]/notes/route.ts ? @backend/api/pro/leads/[id]/notes/route |
| /api/pro/leads/[id] | PATCH | src/app/api/pro/leads/[id]/route.ts ? @backend/api/pro/leads/[id]/route |
| /api/pro/leads/[id]/tasks | POST | src/app/api/pro/leads/[id]/tasks/route.ts ? @backend/api/pro/leads/[id]/tasks/route |
| /api/pro/leads | GET, POST | src/app/api/pro/leads/route.ts ? @backend/api/pro/leads/route |
| /api/pro/team/[id] | PATCH | src/app/api/pro/team/[id]/route.ts ? @backend/api/pro/team/[id]/route |
| /api/pro/team | GET, POST | src/app/api/pro/team/route.ts ? @backend/api/pro/team/route |
| /api/profile | GET, PATCH | src/app/api/profile/route.ts ? @backend/api/profile/route |
| /api/profiles/[id]/follow | POST | src/app/api/profiles/[id]/follow/route.ts ? @backend/api/profiles/[id]/follow/route |
| /api/properties/[id]/documents/[documentId] | PATCH, DELETE | src/app/api/properties/[id]/documents/[documentId]/route.ts ? @backend/api/properties/[id]/documents/[documentId]/route |
| /api/properties/[id]/documents | GET, POST | src/app/api/properties/[id]/documents/route.ts ? @backend/api/properties/[id]/documents/route |
| /api/properties/[id]/media | GET, PATCH | src/app/api/properties/[id]/media/route.ts ? @backend/api/properties/[id]/media/route |
| /api/properties/[id] | PATCH, DELETE | src/app/api/properties/[id]/route.ts ? @backend/api/properties/[id]/route |
| /api/properties/[id]/save | POST, DELETE | src/app/api/properties/[id]/save/route.ts ? @backend/api/properties/[id]/save/route |
| /api/properties/[id]/view | POST | src/app/api/properties/[id]/view/route.ts ? @backend/api/properties/[id]/view/route |
| /api/properties/compare | POST | src/app/api/properties/compare/route.ts ? @backend/api/properties/compare/route |
| /api/properties | GET, POST | src/app/api/properties/route.ts ? @backend/api/properties/route |
| /api/reels/[id]/lead | POST | src/app/api/reels/[id]/lead/route.ts ? @backend/api/reels/[id]/lead/route |
| /api/reels/[id]/like | POST | src/app/api/reels/[id]/like/route.ts ? @backend/api/reels/[id]/like/route |
| /api/reels/[id]/save | POST | src/app/api/reels/[id]/save/route.ts ? @backend/api/reels/[id]/save/route |
| /api/reels/[id]/share | POST | src/app/api/reels/[id]/share/route.ts ? @backend/api/reels/[id]/share/route |
| /api/reels/[id]/view | POST | src/app/api/reels/[id]/view/route.ts ? @backend/api/reels/[id]/view/route |
| /api/reels | GET, POST | src/app/api/reels/route.ts ? @backend/api/reels/route |
| /api/reports | POST | src/app/api/reports/route.ts ? @backend/api/reports/route |
| /api/service-bookings/[id]/reviews | POST | src/app/api/service-bookings/[id]/reviews/route.ts ? @backend/api/service-bookings/[id]/reviews/route |
| /api/service-bookings/[id] | PATCH | src/app/api/service-bookings/[id]/route.ts ? @backend/api/service-bookings/[id]/route |
| /api/service-providers/me | GET, PATCH | src/app/api/service-providers/me/route.ts ? @backend/api/service-providers/me/route |
| /api/service-providers | GET, POST | src/app/api/service-providers/route.ts ? @backend/api/service-providers/route |
| /api/service-quotes/[id] | PATCH | src/app/api/service-quotes/[id]/route.ts ? @backend/api/service-quotes/[id]/route |
| /api/service-quotes | POST | src/app/api/service-quotes/route.ts ? @backend/api/service-quotes/route |
| /api/service-requests | GET, POST | src/app/api/service-requests/route.ts ? @backend/api/service-requests/route |
| /api/shortlists/[id]/properties | POST, DELETE | src/app/api/shortlists/[id]/properties/route.ts ? @backend/api/shortlists/[id]/properties/route |
| /api/shortlists/[id] | PATCH, DELETE | src/app/api/shortlists/[id]/route.ts ? @backend/api/shortlists/[id]/route |
| /api/shortlists | GET, POST | src/app/api/shortlists/route.ts ? @backend/api/shortlists/route |
| /api/studio-notifications/[id] | PATCH | src/app/api/studio-notifications/[id]/route.ts ? @backend/api/studio-notifications/[id]/route |
| /api/studio-requests/[id]/assignments | POST | src/app/api/studio-requests/[id]/assignments/route.ts ? @backend/api/studio-requests/[id]/assignments/route |
| /api/studio-requests/[id]/files | POST | src/app/api/studio-requests/[id]/files/route.ts ? @backend/api/studio-requests/[id]/files/route |
| /api/studio-requests/[id]/revisions | POST | src/app/api/studio-requests/[id]/revisions/route.ts ? @backend/api/studio-requests/[id]/revisions/route |
| /api/studio-requests/[id] | GET, PATCH | src/app/api/studio-requests/[id]/route.ts ? @backend/api/studio-requests/[id]/route |
| /api/studio-requests | GET, POST | src/app/api/studio-requests/route.ts ? @backend/api/studio-requests/route |
