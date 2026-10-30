# Five-role dashboard connectivity matrix

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
