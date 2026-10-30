# Demo-to-production roadmap

Audit date: 2026-10-30. This is a plan, not authorization to implement, build,
access services or change infrastructure. No completion percentages are claimed.

## Founder summary

The app has a deliberately separate fictional buyer preview and a service-backed
UI. The founder's observation is valid for preview mode, but does not mean all
repository calls return demo data. Service screens really construct backend
requests; successful runtime authentication/role/data workflows are still largely
unproven. Default API flag false means a launch without explicit staging defines
selects preview. Source files or success icons alone establish nothing remotely.

40 screen/form/flow units inspected under the counting definition in
DEMO_UI_INVENTORY: 17 demo-only, 5 local implementations, 11 API-connected but
unverified, 7 partially integrated. Thus 18 have source API wiring (11+7), zero
whole screens qualify as runtime-verified, and one historical public-catalogue
request/empty-result workflow is verified. Counts are units, not distinct roles,
business processes or independently tested modules. See the mapping and exact
backend route inventory for scope; dynamic generic workspaces are not double-counted.

Evidence: STAGING_DEVICE_CONNECTION_EVIDENCE.md records a real Flutter-isolate
catalogue HTTP 200, database source, empty result; debugger-triggered screen load,
not normal visible onboarding-to-catalogue proof. Later Android launcher capture
was visible and HOMEZONE absent; this only establishes the emulator/capture
baseline. It does not fix or reproduce HOMEZONE display. Current universal APK
provenance previously differed from recorded build hash; review future artifacts.

## Ordered implementation and verification sequence

Complexity is qualitative engineering scope, not a promised duration. Provider,
policy and device blockers must be cleared before estimating calendar time.

| Order | Phase / complexity | Reuse and exact next work | Exit evidence / dependencies |
|---|---|---|---|
| 0 | Baseline/presentation — Medium, uncertain | Preserve checkout/provenance; explicit service config. Authorize controlled app presentation diagnostic; compare real emulator window, Android screenshot, process/layers/logs. Do not force renderer changes | Current staging-configured artifact demonstrably renders; actual request source attributable; no production request |
| 1 | Authentication — High | Keep email OTP/Auth.js. Correct recovery/reset owned-boundary admission narrowly; retain quotas/CSRF/scrypt/security. Review session storage/clear/logout races; then authorized recipient/account verification | Signup/delivery/resend/expiry/used-code/invalid-password, independent session, restoration/revocation/logout observed; no simulated success. Phone remains separate blocked project |
| 2 | Profiles/roles — Medium–High | Keep default USER and server authority. Verify profile gate, optional values, mismatch/suspension, role change after listing creation, account switch. Review generic web profile role behavior separately | Correct roles persist across sessions; no local elevation. Server-provisioned role fixtures and owner onboarding policy |
| 3 | Customer marketplace — Medium | Retain existing service catalogue rather than rebuild preview. Verify real pagination/filter/refresh, saves/shortlists/enquiries/history and local comparison. Keep preview explicitly separate | Real nonempty/empty/error results and ownership isolation; approved published fixtures |
| 4 | Details/media — Medium | Retain existing detail/gallery and recent loading fixes. Approve exact image/media hosts and review new staging build only if authorized | Matching IDs/all nullable fields, 404/unpublished, gallery/fallback, confirmed external handoff. Provider + hosts + device evidence |
| 5 | Owner submission — Medium–High | Reuse WorkspaceForm draft/create/edit/photos/amenities/public links. Verify USER-to-OWNER automatic backend transition, stale media edits, ownership and review/publish gates | Real owned draft, edit/review and admin-approved publication with explicit staging mutation approval; no seeds/direct inserts |
| 6 | Owner dashboard — Medium | Reuse workspace lists/summary/enquiries; strengthen response-specific validation where needed; inspect missing operations after fixtures | Accurate counts/paging, status/lead actions, error handling and denied foreign-owner access |
| 7 | Broker — High | Reuse CRM/calendar/tasks/notes/visits/assignments/commission records. Separate team records from delegated user authorization; decide invitation/delegation policy before expansion | Scoped real leads and concurrent actions; no unauthorized assignment/private document access; commission records not transfers |
| 8 | Builder — High | Reuse projects/towers/units/reservations/team/campaigns/reporting. Verify parent scopes, unit availability and concurrent booking transitions | Real inventory/booking states with approved fixtures; no oversell; payments/marketing claims remain separate |
| 9 | Service provider/Studio — High | Reuse provider profile, requests/quotes/bookings and requester Studio actions. Wire reviews/operator features only after confirming existing route contracts; retain approved website fallback | Approved provider states, quote acceptance/expiry/withdrawal, booking transitions/revisions/deliverables; owner approval/payment rules |
| 10 | Admin/operations/payments — High | Keep website admin. Reconcile production migrations/schema/backups separately. Verify provider/web payment handoff, signed webhooks/idempotency and review-only account requests; do not implement policy by inference | Explicit infra/database-owner evidence and deployment approval; refund/deletion/retention/commission rules approved; no Flutter admin app |
| 11 | Notifications/supporting modules — Medium–High | Verify existing inbox/read state; separately scope push registration/provider architecture if required. Reels/AI can reuse existing backend but need native UX/contracts/provider review | Real scoped inbox and later approved provider evidence. No fake transaction history/social/AI success |
| 12 | Release/security gate — High | After staging exits: authorized automated/security regression checks, platform accessibility/device review, signed release process with owner-approved identity/keys | All critical journeys evidenced, recovery and operational readiness, privacy/policy approval, release provenance. Production stays unchanged until explicit deployment approval |

## Capability gaps and policy gates

- Missing supported public phone OTP account registration and provider delivery;
  existing authenticated phone verification has concurrency/limiting concerns.
- Social sign-in UI is preview-only despite optional backend provider code.
- Automatic recovery app-link handling not configured; recovery admission gap is
  confirmed source work, not evidence the database/email provider is broken.
- No native payment execution path established; payment routes exist on web.
  Refund/deletion requests record review, not execution. Owner must define rules.
- No approved team invitation/delegated-account binding established by a team row.
- No demonstrated push registration/delivery architecture in current mobile flow.
- Private storage/scanning, media hosts, email sender/recipient rules, effective
  staging variables and production migration reconciliation remain owner/infra
  evidence gates, not guessed source values.

## Security/compatibility work before expansion

Retain single canonical origin and staging separation, secure-cookie CSRF,
generation/provenance guards, Keystore/Keychain and private-media authorization.
Do not use generic /profile PATCH to bypass mobile role restrictions; it accepts
nonadmin role values and requires that role in its request schema. Listing
create promotion USER->OWNER is deliberate existing behavior, not registration
role choice. Provider and legacy service handlers need targeted permission and
suspension review; mobile aggregation safeguards alone do not certify writes.

Future auth operations write sessions/challenges/quotas even when the UI action is
"login"; profile GET can create defaults and detail can record history. Obtain
explicit scoped staging mutation authorization and approved fixtures/recipients.
Never place credentials/OTP/cookies or raw sensitive traces in these documents.

## Immediate next owner action

Approve only the controlled staging Android presentation diagnostic, explicitly
stating whether it permits a fresh build/install/launch and startup session API
effects. Do not bundle account creation/OTP/property publication approval into it.
Subsequent stages require their own approved fixtures and permitted side effects.

## Audit actions

Only four requested Markdown reports were created. Existing source/demo data and
configuration were unchanged. Local source reads/searches, Git status and report
generation only; no tests, builds, app/device launches, live requests, accounts,
OTP, database connections/writes/migrations, Railway changes, commits, pushes or
deployments. Production was not contacted. See BACKEND_MOBILE_INTEGRATION_READINESS
for a controlled 13-step verification matrix; this roadmap does not execute it.
