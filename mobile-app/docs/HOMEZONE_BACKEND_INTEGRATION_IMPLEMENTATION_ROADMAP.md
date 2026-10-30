# Backend integration implementation roadmap

Date: 2026-10-30. Baseline: main/18ebcb401e95e178c1bc3f9f16faea735a044063. Planning only; no implementation or runtime verification authorized by this audit.

## Governing approach

Reuse ApiClient/IoApiTransport, existing Auth.js PIN credentials provider, session coordinator/vault, MarketplaceRepository, MarketplaceScreen and WorkspaceScreen. Do not add duplicate auth APIs, invent business fields or redesign the UI. Keep preview separate. Existing source coverage is substantial; first establish deployed identity/configuration instead of rewriting finished source.

Each milestone closes only with evidence of the actual Flutter action, staging request/response, correct backend scoping and resulting UI. Compiled/source connected is not RUNTIME VERIFIED. All live mutation/account/quota/session operations require founder approval. Database migrations, variables, deploy/restart, tests/builds/device access and production operations need their respective explicit authorization.

## Ordered milestones

| Order | Scope and existing implementation | Dependencies / smallest remaining work | Evidence and approval gate | Complexity |
| --- | --- | --- | --- | --- |
| 1 | Authentication infrastructure and staging activation | Confirm Railway staging service/domain/deployed SHA, effective canonical staging origin, PIN activation/pepper/quota key and migrated client/schema. Latest recorded provider lacks mobile-pin and returns production callback origins. | Sanitized deployment identity + private variable compliance, history/catalog/recoverability. Approve exact changes only after evidence. No code rewrite justified yet. | Low code; medium operational risk |
| 2 | Real registration | Existing /api/mobile/auth/register and MobilePinAuthScreen public-role payload; preserve atomic create/generic duplicates | Milestone1; approved unused +91 identity and role; no recovery/phone proof | Approve account/quota writes; actual signup→ack→separate login, duplicate/concurrency scope separately. Resolve genuine defects only. | Medium verification |
| 3 | Existing-account PIN sign-in | Existing CSRF/callback/session protocol, normalized identity, failure budgets | Provider active/schema ready; private credentials entered on device | Actual valid/bad PIN, suspension and temporary lock behavior without exposing secrets; approve budget/session writes. | Medium |
| 4 | Profile and actual role | Existing account view=profile, mismatch signout, ProfileDashboardGate | Verified session; five approved role fixtures over time | Match session/profile and selected role; reject mismatch and foreign data. No client-side elevation. | Medium |
| 5 | Dashboard routing | Existing USER marketplace / other WorkspaceScreen routes | Milestone4; role-specific supporting entities | Actual Android navigation, no local-only protected access; preserve compact role→sign-in/create-account UX. | Low–medium |
| 6 | Secure restore/logout | Existing SessionVault/controller/native storage/registry | Confirmed successful login; approved restart and revocation writes | True process restart, scoped restore, expiry/revocation and failed-logout messaging. Review transient-network clear UX before changing policy. | Medium–high |
| 7 | Buyer real-data dashboard | Catalogue, filter/pagination/detail, favorites/collections/enquiries already call APIs | Auth verified plus approved published Property and account data | Read-only public fixture approval; separate save/enquiry writes; verify empty/error/nonempty and cursor behavior; don't create fake listings. | Medium |
| 8 | Owner real dashboard | Existing properties/ownerEnquiries, create/edit/lifecycle/media forms | OWNER account; authorized listing; storage/verification prerequisites | Verify owner scoping, draft→review→verified publication under existing policy, edit/media/readback. Review existing USER→OWNER create-listing conversion separately. | High |
| 9 | Broker dashboard | Existing CRM/calendar/team/assignments/notes/tasks/visits/commissions | BROKER, owned/assigned leads, approved team linking/data | Mutations/readback/foreign lead denial; don't infer team membership from role. | High |
| 10 | Builder dashboard | Existing projects/units/towers/team/campaigns/bookings and summary | BUILDER, owned project, approved inventory/data | Parent scoping, cursor lists, edit/reservation lifecycle and actual metrics | High |
| 11 | Service Provider dashboard | Existing provider registration/edit, requests/quotes/bookings | SERVICE_PROVIDER role plus provider entity; verification rules remain | Distinguish direct role assignment from provider verified=false; authorize verification/records separately; check ownership/status transitions | High |
| 12 | Remaining property/supporting workflows | Notifications, private files, visits, studio, payments history, account/refund requests | Required storage/scanner/providers, operational policies and approval | Don't treat payment history as payment processing or request submission as refund/deletion execution. Identify genuinely absent provider capabilities before adding APIs. | High / external dependencies |
| 13 | Production preparation | Separate origin/config/artifact/signing and migration readiness | Successful staging acceptance and founder release approval | Dedicated production config, exact approved hosts/application ID/signing, production DB/secret isolation and restore evidence; approve full pending set/predeploy/rollback | High release risk |

## Exact first task

Obtain the current Railway staging active-deployment evidence package: project/environment/backend IDs, domain mapping, SHA/deployment ID/status/time and private canonical/provider compliance. Compare against current source and identify whether absent PIN is old artifact, inactive flag or wrong service. No speculative source change. Then present exact staging-only configuration/deployment/migration actions for separate founder approval. A request to audit does not authorize those writes.

## Source correction candidates after activation evidence

1. Correct active MarketplaceScreen help wording that references email verification so it reflects PIN/no-recovery policy. Scope is text only; not implemented here.
2. Reconcile backend/api/properties/route.ts USER→OWNER conversion with founder's desired role-lifecycle policy. Preserve existing behavior until explicit policy approval; Flutter already revalidates session after property creation.
3. Communicate provider/listing verification business gates without reintroducing registration approval. Do not grant provider jobs to unverified business entities just to populate UI.
4. Review per-action form/schema parity and generic mutation response validators during each module milestone. Fix demonstrated mismatches, not hypothetical missing APIs.

## Missing versus intentionally deferred

- Forgot PIN/credential recovery/pepper rotation deliberately deferred; no OTP addition.
- Mobile push enrollment/delivery not found; in-app notifications already exist. Determine actual push requirement before proposing new backend capability.
- External payment/refund/deletion execution and private-file service readiness require evidence beyond UI request/history endpoints. Document missing operational provider integration separately from mobile repository wiring.
- Native mobile admin UI intentionally omitted; existing web administration remains protected. No need for duplicate mobile admin endpoints.

## Release gates and rollback

railway.json pre-deploy npm run db:migrate applies all pending migrations. No approved deployment until exact target/history/pending set/backup recovery are reconciled. Preserve website/admin auth, session secrets and production. Flag changes may deploy/restart automatically, so include effects in approval.

Before rollout identify compatible rollback artifact and secret custody. Retain additive credential tables/hashes/accounts, pepper v1 and revocation registry on rollback; no reset/resolve/drop or demo fallback. Disabling provider does not revoke sessions. Controlled account cleanup or revocation is a separate approved write.

## Founder decisions needed

Approve staging identity/configuration evidence access, then scoped activation actions; one controlled account/role trial before expanding to five. Confirm USER→OWNER listing behavior, provider verification expectations, absence of phone ownership proof and deferred PIN recovery, exact media hosts, approved real records and operational payment/file policies. UI redesign and auth architecture replacement are not required to start.

No code, config, database, environment, build, test, device, deployment, commit or push action was taken by this roadmap task.
