# Backend API inventory

Source audit: 2026-10-30. Public routes are only src/app/api/**/route.ts;
backend/api handlers are implementations frequently re-exported via @backend.
These are not two independent APIs. Methods below are extracted from actual
exports and implementation references. Auth.js catch-all additionally dispatches
its built-in csrf/callback/session/signout paths. Runtime availability is unknown.

## Contracts and capabilities

| Family | Existing contract / purpose | Authentication and model boundary |
|---|---|---|
| Mobile email registration | POST /auth/password/signup {name,email,password}; /signup/resend {challengeId}; /signup/verify {challengeId,code}; start/resend challenge metadata, verify {verified:true} | Public native flow; origin when supplied/cross-site checks, bounded JSON, database quotas; EmailRegistration, RegistrationBudget, User, PasswordCredential, Profile |
| Web registration | POST /auth/password/web-signup; direct name/email/password account creation; generic acknowledgment | Canonical browser origin, separate quota keys; no mobile replacement; emailVerified null |
| Auth.js | GET /auth/csrf, GET /auth/session; POST /auth/callback/password and /auth/signout form encoded | CSRF cookie/token, scrypt password, JWT cookie + AuthSession revocation/sessionVersion; database-backed password admission |
| Recovery | POST /auth/password/forgot {email}; /reset {token,password} | Generic acknowledgment/token rules, expiry/consumption/revocation; provider prerequisites |
| Phone verification | POST /auth/otp/send {phone}; /verify {phone,code} | Authenticated existing profile; delivery stub, not public registration/login |
| Profile | GET/PATCH /profile; mobile GET/PATCH /mobile/account | Profile; generic web PATCH permits only enumerated nonadmin role selection, mobile PATCH only city/phone; do not substitute generic route without policy review |
| Public catalogue/detail | GET /mobile/properties with filters/page/pageSize; GET /mobile/properties/[id] | PUBLISHED only, no auth needed; Property public projection; source database |
| General property | GET/POST /properties; PATCH /properties/[id]; media and documents children | Generic GET differs from strict mobile projection; owned update/admin authorization; USER creation promotes OWNER; published transitions require verified listing or admin |
| Saved/history/shortlists | /properties/[id]/save,/view; /shortlists and children; /mobile/saved-status,/account/collections | Authenticated profile ownership; SavedProperty, PropertyView, PropertyShortlist, ShortlistProperty |
| Enquiries/leads | /leads and children; /owner/leads children; /pro/leads children | Lead/property ownership/assignment checks per handler; notes/tasks/visits/commissions/team scope |
| Builder | /builder/projects and project children, /builder/bookings/[id], /builder/reports | Builder project ownership and reservation state; BuilderProject/Tower/Unit/Booking/Campaign/TeamMember |
| Services | /service-providers,/me; /service-requests; /service-quotes and children; /service-bookings children | Requester/provider-specific authority, verified/suspended provider conditions differ by handler; ServiceProvider/Request/Quote/Booking/Review |
| Studio | /studio-requests and children; /studio-notifications/[id]; admin Studio status | Requester/assigned operator/admin-specific checks; StudioRequest/Assignment/File/Revision/Notification/Timeline |
| Mobile aggregation | /mobile/workspace and /[id], /summary | Scoped real database projections; cursor paging; no mobile admin app |
| Payments/account review | /payments/checkout,/verify,/webhook; /mobile/account-requests; admin review | Provider signatures/configuration; payer-scoped history; AccountServiceRequest is review only, not refund or deletion execution |
| Documents/media | /mobile/upload, /media/upload; /mobile/documents and /[id], /private-files/[id] | Public Cloudinary photos separate from protected private storage/scanning; authorization and native platform prerequisites |
| Notifications/reels/AI/reports | Existing exact routes in appendix | Not uniformly mapped into mobile; AI/payment/email/storage require configured providers; route existence is not provider readiness |

Paths in this section are relative to /api. Request validators live in
src/lib/api/validation.ts or the handler-local zod schema. Appendix records the
actual imported validator names and model accesses for independent review; a
dash is an extraction limitation or delegated helper, not proof of no validation.

## Important confirmed limitations and risks

- Public phone signup/login delivery is NOT IMPLEMENTED. Authenticated phone OTP
  consumption concurrency/process-local limiting needs separate security review.
- No generic mobile-native payment execution/refund/account-deletion engine was
  established; existing website/provider routes and human-review requests must not
  be presented as completed transactions. Rules/approvals remain owner decisions.
- Team-member records do not prove delegated login/invitation/member ownership.
- Many legacy handlers use checkRateLimit (process local); email/password admission
  uses database budgets. Do not describe all backend limits as distributed.
- Middleware/session/role checks require independent security review and runtime
  validation; listing the exported handler does not certify every authority check.
- Profile GET may create missing defaults. Listing POST writes the account role
  from USER to OWNER; mobile WorkspaceForm explicitly revalidates session afterward.
- Generic /profile PATCH requires an enumerated nonadmin role and uses
  toPrismaRole(parsed.role). Mobile's narrower /mobile/account does not accept a
  role. These are intentionally different contracts; do not add this web role
  selection to mobile registration without an approved policy decision.
- Production database schema/pending migrations/configuration remain unverified.
  No backend route was contacted, no schema introspection performed.

## Exact route appendix

The following table is populated from the current source. Refer to handler source
for per-method response bodies, conditional includes and authorization; no method
or table existence is inferred from a client string alone.

| Public path | Methods | Handler source | Direct database delegates | Validator/schema symbols |
|---|---|---|---|---|
| /api/admin/account-requests/[id] | PATCH | [src/app/api/admin/account-requests/[id]/route.ts](../../src/app/api/admin/account-requests/[id]/route.ts) | accountServiceRequest, auditLog | — (see handler/helpers) |
| /api/admin/ai/analytics | GET | [backend/api/admin/ai/analytics/route.ts](../../backend/api/admin/ai/analytics/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/admin/ai/prompts | GET, POST | [backend/api/admin/ai/prompts/route.ts](../../backend/api/admin/ai/prompts/route.ts) | aIPrompt | aiPromptSchema |
| /api/admin/ai/settings | GET, POST | [backend/api/admin/ai/settings/route.ts](../../backend/api/admin/ai/settings/route.ts) | aISetting | aiSettingSchema |
| /api/admin/profiles/[id]/verify | PATCH | [backend/api/admin/profiles/[id]/verify/route.ts](../../backend/api/admin/profiles/[id]/verify/route.ts) | profile | profileVerificationSchema |
| /api/admin/properties/[id]/moderate | PATCH | [backend/api/admin/properties/[id]/moderate/route.ts](../../backend/api/admin/properties/[id]/moderate/route.ts) | auditLog, property | moderationSchema |
| /api/admin/properties/[id]/verify | PATCH | [backend/api/admin/properties/[id]/verify/route.ts](../../backend/api/admin/properties/[id]/verify/route.ts) | property | propertyVerificationSchema |
| /api/admin/reels/[id]/moderate | PATCH | [backend/api/admin/reels/[id]/moderate/route.ts](../../backend/api/admin/reels/[id]/moderate/route.ts) | auditLog, propertyReel | moderationSchema |
| /api/admin/reports/[id] | PATCH | [backend/api/admin/reports/[id]/route.ts](../../backend/api/admin/reports/[id]/route.ts) | report | adminReportActionSchema |
| /api/admin/service-providers/[id] | PATCH | [backend/api/admin/service-providers/[id]/route.ts](../../backend/api/admin/service-providers/[id]/route.ts) | auditLog, serviceProvider | moderationSchema |
| /api/admin/studio-requests/[id]/status | PATCH | [backend/api/admin/studio-requests/[id]/status/route.ts](../../backend/api/admin/studio-requests/[id]/status/route.ts) | auditLog, studioRequest | studioStatusSchema |
| /api/admin/users/[id]/password | PATCH | [backend/api/admin/users/[id]/password/route.ts](../../backend/api/admin/users/[id]/password/route.ts) | profile | adminPasswordResetSchema |
| /api/admin/users/[id] | PATCH | [backend/api/admin/users/[id]/route.ts](../../backend/api/admin/users/[id]/route.ts) | profile | adminProfileUpdateSchema |
| /api/ai/analyzer | POST | [backend/api/ai/analyzer/route.ts](../../backend/api/ai/analyzer/route.ts) | aiReport | analyzerReportSchema |
| /api/ai/areas | POST | [backend/api/ai/areas/route.ts](../../backend/api/ai/areas/route.ts) | — (helper/delegation or none) | aiAreaSchema |
| /api/ai/assistant | POST | [backend/api/ai/assistant/route.ts](../../backend/api/ai/assistant/route.ts) | aiReport | assistantSchema |
| /api/ai/business | POST | [backend/api/ai/business/route.ts](../../backend/api/ai/business/route.ts) | — (helper/delegation or none) | businessAISchema |
| /api/ai/compare | POST | [backend/api/ai/compare/route.ts](../../backend/api/ai/compare/route.ts) | — (helper/delegation or none) | aiCompareSchema |
| /api/ai/history | GET | [backend/api/ai/history/route.ts](../../backend/api/ai/history/route.ts) | aiReport | — (see handler/helpers) |
| /api/ai/lead-assistant | POST | [backend/api/ai/lead-assistant/route.ts](../../backend/api/ai/lead-assistant/route.ts) | — (helper/delegation or none) | aiLeadAssistantSchema |
| /api/ai/property-intelligence | POST | [backend/api/ai/property-intelligence/route.ts](../../backend/api/ai/property-intelligence/route.ts) | — (helper/delegation or none) | aiPropertyIntelligenceSchema |
| /api/ai/recommendations | POST | [backend/api/ai/recommendations/route.ts](../../backend/api/ai/recommendations/route.ts) | — (helper/delegation or none) | aiRecommendationSchema |
| /api/ai/search | POST | [backend/api/ai/search/route.ts](../../backend/api/ai/search/route.ts) | — (helper/delegation or none) | aiSearchSchema |
| /api/auth/[...nextauth] | GET, POST | [backend/api/auth/[...nextauth]/route.ts](../../backend/api/auth/[...nextauth]/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/auth/otp/send | POST | [backend/api/auth/otp/send/route.ts](../../backend/api/auth/otp/send/route.ts) | otpChallenge | otpSendSchema |
| /api/auth/otp/verify | POST | [backend/api/auth/otp/verify/route.ts](../../backend/api/auth/otp/verify/route.ts) | otpChallenge, profile | otpVerifySchema |
| /api/auth/password/forgot | POST | [backend/api/auth/password/forgot/route.ts](../../backend/api/auth/password/forgot/route.ts) | passwordResetToken, user | forgotPasswordSchema |
| /api/auth/password/reset | POST | [backend/api/auth/password/reset/route.ts](../../backend/api/auth/password/reset/route.ts) | passwordResetToken | resetPasswordSchema |
| /api/auth/password/signup/resend | POST | [src/app/api/auth/password/signup/resend/route.ts](../../src/app/api/auth/password/signup/resend/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/auth/password/signup | POST | [backend/api/auth/password/signup/route.ts](../../backend/api/auth/password/signup/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/auth/password/signup/verify | POST | [src/app/api/auth/password/signup/verify/route.ts](../../src/app/api/auth/password/signup/verify/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/auth/password/web-signup | POST | [src/app/api/auth/password/web-signup/route.ts](../../src/app/api/auth/password/web-signup/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/builder/bookings/[id] | PATCH | [backend/api/builder/bookings/[id]/route.ts](../../backend/api/builder/bookings/[id]/route.ts) | builderBooking, builderProject, builderUnit | builderBookingActionSchema |
| /api/builder/projects/[id]/bookings | POST | [backend/api/builder/projects/[id]/bookings/route.ts](../../backend/api/builder/projects/[id]/bookings/route.ts) | builderBooking, builderProject, builderUnit, lead | builderBookingSchema |
| /api/builder/projects/[id]/campaigns | POST | [backend/api/builder/projects/[id]/campaigns/route.ts](../../backend/api/builder/projects/[id]/campaigns/route.ts) | builderCampaign | builderCampaignSchema |
| /api/builder/projects/[id] | PATCH | [backend/api/builder/projects/[id]/route.ts](../../backend/api/builder/projects/[id]/route.ts) | builderProject | builderProjectSchema |
| /api/builder/projects/[id]/team | POST | [backend/api/builder/projects/[id]/team/route.ts](../../backend/api/builder/projects/[id]/team/route.ts) | builderTeamMember | builderTeamMemberSchema |
| /api/builder/projects/[id]/towers | POST | [backend/api/builder/projects/[id]/towers/route.ts](../../backend/api/builder/projects/[id]/towers/route.ts) | builderTower | builderTowerSchema |
| /api/builder/projects/[id]/units | POST | [backend/api/builder/projects/[id]/units/route.ts](../../backend/api/builder/projects/[id]/units/route.ts) | builderProject, builderUnit | builderUnitSchema |
| /api/builder/projects | GET, POST | [backend/api/builder/projects/route.ts](../../backend/api/builder/projects/route.ts) | builderProject | builderProjectSchema |
| /api/builder/reports | GET | [backend/api/builder/reports/route.ts](../../backend/api/builder/reports/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/investment/report | POST | [backend/api/investment/report/route.ts](../../backend/api/investment/report/route.ts) | aiReport | investmentReportSchema |
| /api/leads/[id]/notes/[noteId] | DELETE, PATCH | [backend/api/leads/[id]/notes/[noteId]/route.ts](../../backend/api/leads/[id]/notes/[noteId]/route.ts) | leadNote | leadNoteUpdateSchema |
| /api/leads/[id]/notes | POST | [backend/api/leads/[id]/notes/route.ts](../../backend/api/leads/[id]/notes/route.ts) | leadNote | leadNoteSchema |
| /api/leads/[id] | GET, PATCH | [backend/api/leads/[id]/route.ts](../../backend/api/leads/[id]/route.ts) | lead | leadUpdateSchema |
| /api/leads/[id]/tasks/[taskId] | PATCH | [backend/api/leads/[id]/tasks/[taskId]/route.ts](../../backend/api/leads/[id]/tasks/[taskId]/route.ts) | leadTask | leadTaskUpdateSchema |
| /api/leads/[id]/tasks | POST | [backend/api/leads/[id]/tasks/route.ts](../../backend/api/leads/[id]/tasks/route.ts) | leadTask | leadTaskSchema |
| /api/leads/[id]/visits/[visitId] | PATCH | [backend/api/leads/[id]/visits/[visitId]/route.ts](../../backend/api/leads/[id]/visits/[visitId]/route.ts) | leadSiteVisit | leadVisitUpdateSchema |
| /api/leads/[id]/visits | POST | [backend/api/leads/[id]/visits/route.ts](../../backend/api/leads/[id]/visits/route.ts) | lead, leadSiteVisit | leadVisitSchema |
| /api/leads/notifications/[id] | PATCH | [backend/api/leads/notifications/[id]/route.ts](../../backend/api/leads/notifications/[id]/route.ts) | leadNotification | — (see handler/helpers) |
| /api/leads | GET, POST | [backend/api/leads/route.ts](../../backend/api/leads/route.ts) | lead, leadTimelineEvent, property | leadInboxFilterSchema, leadSchema |
| /api/media/upload | POST | [backend/api/media/upload/route.ts](../../backend/api/media/upload/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/mobile/account/collections | GET | [src/app/api/mobile/account/collections/route.ts](../../src/app/api/mobile/account/collections/route.ts) | lead, propertyShortlist, savedProperty, shortlistProperty | — (see handler/helpers) |
| /api/mobile/account | GET, PATCH | [src/app/api/mobile/account/route.ts](../../src/app/api/mobile/account/route.ts) | lead, profile, propertyShortlist, savedProperty | editSchema |
| /api/mobile/account-requests | POST | [src/app/api/mobile/account-requests/route.ts](../../src/app/api/mobile/account-requests/route.ts) | accountServiceRequest, payment | — (see handler/helpers) |
| /api/mobile/capabilities | GET | [src/app/api/mobile/capabilities/route.ts](../../src/app/api/mobile/capabilities/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/mobile/documents/[id] | GET | [src/app/api/mobile/documents/[id]/route.ts](../../src/app/api/mobile/documents/[id]/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/mobile/documents | GET, POST | [src/app/api/mobile/documents/route.ts](../../src/app/api/mobile/documents/route.ts) | privateFile | — (see handler/helpers) |
| /api/mobile/properties/[id] | GET | [src/app/api/mobile/properties/[id]/route.ts](../../src/app/api/mobile/properties/[id]/route.ts) | property | — (see handler/helpers) |
| /api/mobile/properties | GET | [src/app/api/mobile/properties/route.ts](../../src/app/api/mobile/properties/route.ts) | — (helper/delegation or none) | mobileCatalogSchema |
| /api/mobile/saved-status | GET | [src/app/api/mobile/saved-status/route.ts](../../src/app/api/mobile/saved-status/route.ts) | savedProperty | — (see handler/helpers) |
| /api/mobile/summary | GET | [src/app/api/mobile/summary/route.ts](../../src/app/api/mobile/summary/route.ts) | builderBooking, builderCampaign, builderProject, builderUnit, lead, leadTask, notification, property, serviceBooking | — (see handler/helpers) |
| /api/mobile/upload | POST | [src/app/api/mobile/upload/route.ts](../../src/app/api/mobile/upload/route.ts) | profile, property | — (see handler/helpers) |
| /api/mobile/visits/[id] | PATCH | [src/app/api/mobile/visits/[id]/route.ts](../../src/app/api/mobile/visits/[id]/route.ts) | leadSiteVisit | — (see handler/helpers) |
| /api/mobile/visits | POST | [src/app/api/mobile/visits/route.ts](../../src/app/api/mobile/visits/route.ts) | lead, leadSiteVisit | — (see handler/helpers) |
| /api/mobile/workspace/[id] | PATCH | [src/app/api/mobile/workspace/[id]/route.ts](../../src/app/api/mobile/workspace/[id]/route.ts) | builderCampaign, builderProject, builderTeamMember, builderTower, builderUnit | builderCampaignSchema, builderTeamMemberSchema, builderTowerSchema, builderUnitSchema |
| /api/mobile/workspace | GET | [src/app/api/mobile/workspace/route.ts](../../src/app/api/mobile/workspace/route.ts) | accountServiceRequest, brokerCommission, brokerTeamMember, builderBooking, builderCampaign, builderProject, builderTeamMember, builderTower, builderUnit, lead, leadNote, leadSiteVisit, leadTask, notification, payment, property, propertyView, serviceBooking, serviceProvider, serviceQuote, serviceRequest, studioRequest | — (see handler/helpers) |
| /api/notifications/[id] | PATCH | [backend/api/notifications/[id]/route.ts](../../backend/api/notifications/[id]/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/notifications | GET | [backend/api/notifications/route.ts](../../backend/api/notifications/route.ts) | notification | — (see handler/helpers) |
| /api/owner/leads/[id]/notes | POST | [backend/api/owner/leads/[id]/notes/route.ts](../../backend/api/owner/leads/[id]/notes/route.ts) | lead, leadNote | leadNoteSchema |
| /api/owner/leads/[id] | PATCH | [backend/api/owner/leads/[id]/route.ts](../../backend/api/owner/leads/[id]/route.ts) | lead | leadUpdateSchema |
| /api/payments/checkout | POST | [backend/api/payments/checkout/route.ts](../../backend/api/payments/checkout/route.ts) | payment, property, serviceBooking, studioRequest | paymentCheckoutSchema |
| /api/payments/verify | POST | [backend/api/payments/verify/route.ts](../../backend/api/payments/verify/route.ts) | payment | paymentVerifySchema |
| /api/payments/webhook | POST | [backend/api/payments/webhook/route.ts](../../backend/api/payments/webhook/route.ts) | payment | — (see handler/helpers) |
| /api/private-files/[id] | GET | [src/app/api/private-files/[id]/route.ts](../../src/app/api/private-files/[id]/route.ts) | — (helper/delegation or none) | — (see handler/helpers) |
| /api/pro/automation | GET, POST | [backend/api/pro/automation/route.ts](../../backend/api/pro/automation/route.ts) | brokerAutomationRule | brokerAutomationRuleSchema |
| /api/pro/calendar | GET | [backend/api/pro/calendar/route.ts](../../backend/api/pro/calendar/route.ts) | leadSiteVisit, leadTask | — (see handler/helpers) |
| /api/pro/leads/[id]/assignments | POST | [backend/api/pro/leads/[id]/assignments/route.ts](../../backend/api/pro/leads/[id]/assignments/route.ts) | brokerLeadAssignment, brokerTeamMember, lead | brokerLeadAssignmentSchema |
| /api/pro/leads/[id]/commission | POST | [backend/api/pro/leads/[id]/commission/route.ts](../../backend/api/pro/leads/[id]/commission/route.ts) | brokerCommission, lead | brokerCommissionSchema |
| /api/pro/leads/[id]/documents | POST | [backend/api/pro/leads/[id]/documents/route.ts](../../backend/api/pro/leads/[id]/documents/route.ts) | brokerClientDocument | brokerClientDocumentSchema |
| /api/pro/leads/[id]/notes | POST | [backend/api/pro/leads/[id]/notes/route.ts](../../backend/api/pro/leads/[id]/notes/route.ts) | lead, leadNote | leadNoteSchema |
| /api/pro/leads/[id] | PATCH | [backend/api/pro/leads/[id]/route.ts](../../backend/api/pro/leads/[id]/route.ts) | lead | leadUpdateSchema |
| /api/pro/leads/[id]/tasks | POST | [backend/api/pro/leads/[id]/tasks/route.ts](../../backend/api/pro/leads/[id]/tasks/route.ts) | lead, leadTask | leadTaskSchema |
| /api/pro/leads | GET, POST | [backend/api/pro/leads/route.ts](../../backend/api/pro/leads/route.ts) | lead | leadSchema |
| /api/pro/team/[id] | PATCH | [backend/api/pro/team/[id]/route.ts](../../backend/api/pro/team/[id]/route.ts) | brokerTeamMember | brokerTeamMemberUpdateSchema |
| /api/pro/team | GET, POST | [backend/api/pro/team/route.ts](../../backend/api/pro/team/route.ts) | brokerTeamMember | brokerTeamMemberSchema |
| /api/profile | GET, PATCH | [backend/api/profile/route.ts](../../backend/api/profile/route.ts) | profile | profileUpdateSchema |
| /api/profiles/[id]/follow | POST | [backend/api/profiles/[id]/follow/route.ts](../../backend/api/profiles/[id]/follow/route.ts) | profile, profileFollow | — (see handler/helpers) |
| /api/properties/[id]/documents/[documentId] | DELETE, PATCH | [backend/api/properties/[id]/documents/[documentId]/route.ts](../../backend/api/properties/[id]/documents/[documentId]/route.ts) | propertyDocument | propertyDocumentUpdateSchema |
| /api/properties/[id]/documents | GET, POST | [backend/api/properties/[id]/documents/route.ts](../../backend/api/properties/[id]/documents/route.ts) | property, propertyDocument | propertyDocumentSchema |
| /api/properties/[id]/media | GET, PATCH | [backend/api/properties/[id]/media/route.ts](../../backend/api/properties/[id]/media/route.ts) | profile, property | propertyMediaSchema |
| /api/properties/[id] | DELETE, PATCH | [backend/api/properties/[id]/route.ts](../../backend/api/properties/[id]/route.ts) | property | propertyUpdateSchema |
| /api/properties/[id]/save | DELETE, POST | [backend/api/properties/[id]/save/route.ts](../../backend/api/properties/[id]/save/route.ts) | property, savedProperty | — (see handler/helpers) |
| /api/properties/[id]/view | POST | [backend/api/properties/[id]/view/route.ts](../../backend/api/properties/[id]/view/route.ts) | property, propertyView | — (see handler/helpers) |
| /api/properties/compare | POST | [backend/api/properties/compare/route.ts](../../backend/api/properties/compare/route.ts) | property | propertyCompareSchema |
| /api/properties | GET, POST | [backend/api/properties/route.ts](../../backend/api/properties/route.ts) | profile, property | propertyCreateSchema |
| /api/reels/[id]/lead | POST | [backend/api/reels/[id]/lead/route.ts](../../backend/api/reels/[id]/lead/route.ts) | lead, property, propertyReel | reelLeadSchema |
| /api/reels/[id]/like | POST | [backend/api/reels/[id]/like/route.ts](../../backend/api/reels/[id]/like/route.ts) | propertyReel, reelLike | — (see handler/helpers) |
| /api/reels/[id]/save | POST | [backend/api/reels/[id]/save/route.ts](../../backend/api/reels/[id]/save/route.ts) | propertyReel, savedReel | — (see handler/helpers) |
| /api/reels/[id]/share | POST | [backend/api/reels/[id]/share/route.ts](../../backend/api/reels/[id]/share/route.ts) | propertyReel | — (see handler/helpers) |
| /api/reels/[id]/view | POST | [backend/api/reels/[id]/view/route.ts](../../backend/api/reels/[id]/view/route.ts) | propertyReel | — (see handler/helpers) |
| /api/reels | GET, POST | [backend/api/reels/route.ts](../../backend/api/reels/route.ts) | property, propertyReel | reelCreateSchema, reelFeedSchema |
| /api/reports | POST | [backend/api/reports/route.ts](../../backend/api/reports/route.ts) | report | reportSchema |
| /api/service-bookings/[id]/reviews | POST | [backend/api/service-bookings/[id]/reviews/route.ts](../../backend/api/service-bookings/[id]/reviews/route.ts) | serviceReview | serviceReviewSchema |
| /api/service-bookings/[id] | PATCH | [backend/api/service-bookings/[id]/route.ts](../../backend/api/service-bookings/[id]/route.ts) | serviceBooking | serviceBookingActionSchema |
| /api/service-providers/me | GET, PATCH | [backend/api/service-providers/me/route.ts](../../backend/api/service-providers/me/route.ts) | serviceProvider | serviceProviderSchema |
| /api/service-providers | GET, POST | [backend/api/service-providers/route.ts](../../backend/api/service-providers/route.ts) | serviceProvider | serviceProviderSchema |
| /api/service-quotes/[id] | PATCH | [backend/api/service-quotes/[id]/route.ts](../../backend/api/service-quotes/[id]/route.ts) | serviceBooking, serviceQuote, serviceRequest | serviceQuoteActionSchema |
| /api/service-quotes | POST | [backend/api/service-quotes/route.ts](../../backend/api/service-quotes/route.ts) | serviceProvider, serviceQuote, serviceRequest | serviceQuoteSchema |
| /api/service-requests | GET, POST | [backend/api/service-requests/route.ts](../../backend/api/service-requests/route.ts) | serviceProvider, serviceRequest | serviceRequestSchema |
| /api/shortlists/[id]/properties | DELETE, POST | [backend/api/shortlists/[id]/properties/route.ts](../../backend/api/shortlists/[id]/properties/route.ts) | property, propertyShortlist, shortlistProperty | shortlistPropertySchema |
| /api/shortlists/[id] | DELETE, PATCH | [backend/api/shortlists/[id]/route.ts](../../backend/api/shortlists/[id]/route.ts) | propertyShortlist | shortlistSchema |
| /api/shortlists | GET, POST | [backend/api/shortlists/route.ts](../../backend/api/shortlists/route.ts) | propertyShortlist | shortlistSchema |
| /api/studio-notifications/[id] | PATCH | [backend/api/studio-notifications/[id]/route.ts](../../backend/api/studio-notifications/[id]/route.ts) | studioNotification | — (see handler/helpers) |
| /api/studio-requests/[id]/assignments | POST | [backend/api/studio-requests/[id]/assignments/route.ts](../../backend/api/studio-requests/[id]/assignments/route.ts) | studioAssignment, studioRequest | studioAssignmentSchema |
| /api/studio-requests/[id]/files | POST | [backend/api/studio-requests/[id]/files/route.ts](../../backend/api/studio-requests/[id]/files/route.ts) | studioDeliveryFile, studioRequest | studioFileSchema |
| /api/studio-requests/[id]/revisions | POST | [backend/api/studio-requests/[id]/revisions/route.ts](../../backend/api/studio-requests/[id]/revisions/route.ts) | studioRequest, studioRevision | studioRevisionSchema |
| /api/studio-requests/[id] | GET, PATCH | [backend/api/studio-requests/[id]/route.ts](../../backend/api/studio-requests/[id]/route.ts) | studioRequest | studioApprovalSchema, studioStatusSchema |
| /api/studio-requests | GET, POST | [backend/api/studio-requests/route.ts](../../backend/api/studio-requests/route.ts) | property, studioRequest | studioRequestSchema |

Inventory total: 119 distinct public route files. Dynamic paths denote route patterns, not requests executed. Auth.js built-in subpaths share one catch-all route and are not additional route files.

## Shared validation field index

Exact source schemas supply bounds, optionality, unions and refinements. This index lists immediate two-space object keys found in exported schema blocks; it is not a replacement for those rules. Inherited/inline schemas remain in their cited handlers.

| Schema / declaration line | Declared field names |
|---|---|
| aiSearchSchema (66) | query, country, language |
| assistantSchema (72) | language, message |
| aiRecommendationSchema (79) | language, locationPreference |
| aiAreaSchema (84) | language, query |
| aiCompareSchema (89) | language, propertyIds |
| aiLeadAssistantSchema (94) | context, language, mode, propertyId |
| aiPropertyIntelligenceSchema (101) | action, documentType, loan, propertyId, propertyIds, query |
| businessAISchema (146) | action, context, leadId |
| aiPromptSchema (167) | active, description, maxTokens, metadata, model, module, name, promptId, promptText, provider, temperature, version |
| aiSettingSchema (182) | dailyCostLimit, enabled, featureFlags, maxTokens, model, module, provider, rateLimitPerMinute, temperature |
| leadSchema (198) | name, phone, message, propertyId, reelId, source, contactAction |
| serviceRequestSchema (208) | category, city, budget, message, providerId |
| serviceProviderSchema (216) | businessName, category, city, description, portfolioUrls, photoUrls, certifications, experienceYears, serviceAreas, availability, businessHours, priceLabel |
| serviceQuoteSchema (231) | requestId, amount, currency, message, revision, validUntil |
| serviceQuoteActionSchema (240) | action, amount, message, scheduledAt |
| serviceBookingActionSchema (247) | action, notes, scheduledAt |
| serviceReviewSchema (253) | comment, photoUrls, rating |
| propertyCreateSchema (263) | title, description, intent, category, propertyType, coverImageUrl, country, state, city, locality, address, latitude, longitude, timezone, price, currency, areaValue, areaUnit, bedrooms, bathrooms, amenities, mediaUrls, videoUrl, virtualTourUrl, status |
| propertyDocumentSchema (323) | documentType, fileName, fileUrl, fileSize, mimeType, notes |
| propertyDocumentUpdateSchema (340) | documentType, notes |
| reelCreateSchema (355) | propertyId, title, videoUrl, thumbnailUrl |
| reelFeedSchema (362) | cursor, take |
| reelLeadSchema (367) | contactAction, message, name, phone |
| followProfileSchema (374) | targetId |
| moderationSchema (378) | status, note |
| propertyVerificationSchema (383) | status, note |
| profileVerificationSchema (388) | status, note |
| adminProfileUpdateSchema (393) | city, country, role, verificationStatus, note |
| adminPasswordResetSchema (401) | password, reason |
| adminReportActionSchema (406) | action, note |
| paymentCheckoutSchema (433) | city, notes, product, propertyId, serviceBookingId, studioRequestId |
| reportSchema (448) | entityType, entityId, reason |
| profileUpdateSchema (456) | city, phone, role |
| otpSendSchema (462) | phone |
| otpVerifySchema (466) | code, phone |
| passwordSignUpSchema (471) | email, name, password |
| forgotPasswordSchema (477) | email |
| resetPasswordSchema (481) | password, token |
| marketplaceFilterSchema (486) | bathrooms, bedrooms, category, city, country, keyword, locality, maxPrice, minPrice, purpose, sort, state, verifiedOnly |
| propertyCompareSchema (505) | propertyIds |
| shortlistSchema (509) | name |
| shortlistPropertySchema (513) | propertyId |
| studioRequestSchema (517) | propertyId, serviceType, city, budget, notes, orderValue, scheduledAt, status |
| studioStatusSchema (543) | message, scheduledAt, status |
| studioAssignmentSchema (562) | assigneeId, notes, role |
| studioFileSchema (568) | fileName, fileType, fileUrl, notes, version |
| studioRevisionSchema (576) | comments |
| studioApprovalSchema (580) | customerFeedback, customerRating |
| leadUpdateSchema (585) | stage, priority, nextAction, followUpAt, dealValue |
| leadNoteSchema (595) | note |
| leadNoteUpdateSchema (599) | note |
| leadTaskSchema (603) | taskType, title, dueAt |
| leadTaskUpdateSchema (609) | completed, dueAt, taskType, title |
| leadVisitSchema (616) | notes, scheduledAt, status |
| leadVisitUpdateSchema (622) | notes, scheduledAt, status |
| leadInboxFilterSchema (628) | q, stage |
| brokerTeamMemberSchema (635) | active, email, name, permissions, phone, profileId, role |
| brokerLeadAssignmentSchema (647) | assigneeId, notes |
| brokerCommissionSchema (652) | agentId, commissionPercent, dealValue, notes, status |
| brokerAutomationRuleSchema (660) | channel, enabled, provider, template, trigger |
| brokerClientDocumentSchema (668) | documentType, fileUrl, title |
| builderProjectSchema (674) | name, city, locality, address, description, amenities, floorPlanUrls, masterPlanUrl, mediaUrls, brochureUrl, qrCodeUrl, constructionStatus, completionDate, status, unitsCount, availableUnits, campaignStatus |
| builderTowerSchema (694) | floors, name, status |
| builderUnitSchema (700) | areaUnit, areaValue, bathrooms, bedrooms, facing, floor, floorPlanUrl, imageUrls, price, status, towerId, unitNumber, unitType |
| builderTeamMemberSchema (716) | active, email, name, permissions, phone, profileId, projectId, role |
| builderBookingSchema (727) | bookingAmount, buyerId, leadId, notes, saleValue, unitId |
| builderBookingActionSchema (736) | action, notes, saleValue |
| builderCampaignSchema (742) | brochureDownloads, budget, channel, landingPageUrl, leadsCount, name, qrCodeUrl, status |
| analyzerReportSchema (753) | propertyId, propertyName, analysisMode, location, notes |
| investmentReportSchema (761) | area, city, profile, budget |
