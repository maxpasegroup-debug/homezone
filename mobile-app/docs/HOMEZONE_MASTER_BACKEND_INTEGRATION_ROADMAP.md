# HOMEZONE master backend integration roadmap

2026-10-30. PLAN ONLY. Read alongside HOMEZONE_MASTER_BACKEND_INTEGRATION_AUDIT.md;
baseline commit 0a434a0f199cd8d45d1260d223b444d15876b1c4. No implementation authority
is implied by a plan row. No tests, builds, live requests or migrations executed.

## Target and reuse rules

Mobile target: Indian canonical mobile number + exactly six numeric PIN digits;
registration confirms PIN; no OTP, email/password or Forgot PIN in the new mobile
journey. Website/admin unchanged. Existing users never auto-link through contact
phone, no default PIN or fake email. Default USER and server-authorized role changes
remain authoritative. Existing session stack is reused, not replaced by tokens.

Keep fictional preview assets/routes clearly separate. Reuse current MR, ApiClient,
owned cookie coordinator, Auth.js CSRF/session callbacks, secure vault, profile
gate and business workspaces. Do not rebuild completed modules because they have
not yet been runtime verified. Resolve contract errors narrowly with reviewable diffs.

## Prior prerequisite gate (not an implementation milestone)

- Review/approve source PIN 1B policy and transaction/KDF risks; authorize generated
  client/typecheck/security/regression work separately when desired. Current task
  does not run it. Schema source and default-off feature do not establish readiness.
- Owner approves PIN registration contract/quotas, contact-phone versus immutable
  login-number display, first-claim-without-possession-proof risk and existing-account
  collision/enrollment policy. No public phone match can attach an old user's data.
- Staging operational work is separately approved: exact deployed commit/service,
  database/schema/pending migration identity, backup/restore evidence and distinct
  secrets. Keep provider off until source/schema/verification gates pass. Production
  remains entirely out of scope; do not bundle deployment into source approval.
- Android presentation remains an independent diagnostic track. Authorize only the
  selected build/install/launch and startup API side effects; don't assume an APK's
  filename proves staging. This need not block writing reviewed backend source.

## Smallest recommended first implementation milestone

**Milestone 2A — backend PIN registration only (Medium–High).**

After owner approves request/duplicate/quota/collision decisions, implement a
focused service and thin route (proposed /api/auth/mobile-pin/signup; does not exist
yet) using the existing canonicalizer/hash and independent registration admission.
Strict bounded input phone/pin/confirmPin only; atomic new User + default USER
Profile + MobilePinCredential; emailVerified null/whatsappVerified false; exact
canonical-phone uniqueness races handled without overwrite or account linking.
Generic acknowledgment is not creation/authentication proof. Keep PIN provider
and session flow separate; no manual cookie generation. No Flutter changes,
migration execution, config activation, real accounts or deployment in this milestone.

Review contract before coding: confirmation server validation; predictable generic
duplicate response; invalid/security/rate-limit/unavailable outcomes; no automatic
creation retry after uncertain transport failure. New registration quota numbers
need approval, not silent reuse of email OTP or PIN login limits. Existing global
login/failure budgets are not a registration limiter. Legacy Profile.phone collision
must fail safely or follow an explicitly approved non-linking policy.

## Dependency-ordered milestones

Each row has a narrow change set and exit evidence. Complexity is engineering
scope, not a calendar estimate or completion percentage. Runtime exits occur only
under later explicit authorization; a source milestone alone is not operational
completion.

| ID / scope | Flutter change | Backend change | DB/config dependencies | Review/exit evidence | Complexity |
|---|---|---|---|---|---|
| 2A PIN registration | None | New strict bounded signup service/route and isolated registration budget; atomic new account; no matching-phone links | Existing PIN schema source; approved signup quota/collision policy; no execution | Full contract and transaction/uniqueness/error review; future dedicated tests authorized separately | Medium–High |
| 2B PIN mobile protocol | Adapt existing PP/SC to callback/mobile-pin phone/pin with CSRF; preserve ownership/generation/vault; generic errors | Existing provider reused; only proven shared contract defect corrected | Provider/config schema still owner-gated | Review existing login/restoration/logout compatibility; no new HTTP client or token system | Medium |
| 2C PIN service registration UI | Replace email/challenge/resend state in RegistrationScreen with number/PIN/confirm, captured attempt data, submit lock/errors; follow acknowledgment with independently verified PIN sign-in | Reuse 2A, no new endpoint | 2A/2B; approved UX/privacy wording | No simulated success, no local role identity, no uncertain-request creation retries | Medium |
| 2D PIN service login/navigation | Adapt active service login fields/validators; remove email/social/forgot links from PIN journey; keep labelled preview and legacy web separate | None unless proven contract mismatch | 2B/2C; IN syntax policy; no secrets in app | Exact six-digit string/leading zero; no Forgot PIN; missing auth fails safely | Medium |
| 3A Profile/session roles | Review null name/email, login number vs contact field, gate/session refresh, restore/logout and actor races | Keep server roles/default USER; narrow profile projection only if required | Approved preprovisioned role fixtures later | Correct server role, suspension/mismatch safe; USER->OWNER after listing still revalidates | Medium |
| 3B Auth staging verification gate | Later authorized debug/device flow only | No new features | Approved applied schema/client, secrets, account creation/login and budget/session writes; display/provenance | Real signup/PIN login/restoration/logout/revocation/cross-account/role evidence; failure protection verified | High verification scope |
| 4A Buyer real catalogue | Preserve screens; correct confirmed filter/pagination/refresh/empty/error defects only | Existing /mobile/properties; no duplicate API | Published/read fixtures; safe staging-read permission | Real nonempty/empty/filter/pages and actual Flutter attribution; don't replace fake preview globally | Medium |
| 4B Details/media | Preserve detail/gallery and host restrictions; resolve demonstrated field/native errors | Existing detail/media endpoints | Exact media host approvals and provider readiness; fixtures | Real matching ID/nulls/404/loading/gallery/handoff; no private-document exposure | Medium |
| 4C Favorites/enquiries/collections | Review saved/shortlist/profile/enquiry callbacks and typed acknowledgments | Existing self-scoped endpoints; fix proven contract defects only | Approved self/foreign-account fixtures and mutation permission | Actual persistence, cursor paging, ownership denials and no fabricated success | Medium |
| 5A Owner draft/edit | Reuse FieldSpec forms/workspace/photos; strengthen specific result validation | Existing POST/PATCH properties; default role transition reviewed | Explicit authorized draft creation/edit, not publication; provider uploads separate | Draft values persist, stale edit/foreign-owner denial; role refresh correct | Medium |
| 5B Owner review/publication/dashboard | Existing status/enquiry/summary UI only | Existing verified-publish/admin moderation routes | Owner/admin-approved staging review/publication; not direct DB inserts | Published catalogue visibility, scoped counts/leads, failures reflected | Medium–High |
| 6A Broker records | Reuse CRM/notes/tasks/visits/calendar, per-action validators | Existing leads/pro endpoints | Approved broker lead fixtures | Real scoped writes/readback and status/cursor behavior | Medium–High |
| 6B Broker assignment/commission/documents | Reuse linked-member picker/commission/private document UI | Existing assignments/commission; only approved invitation binding as separate future capability | Team delegation and commission policy, private storage/scanning readiness | No arbitrary assignee/privilege exposure; commission record never payment claim | High |
| 7A Builder project/inventory | Reuse projects/towers/units/campaign/team forms and cursor lists | Existing builder/mobile workspace APIs | Approved owned project fixtures/writes; no provider advertising assumptions | Parent ownership, accurate status/counts, typed results | Medium–High |
| 7B Builder reservations | Existing booking forms/action states | Existing reservation state handlers; fix demonstrated concurrency defects | Explicit reservation writes and concurrent verification permission | No oversell/double reservation, safe release/confirm/sold transitions; no payment inference | High |
| 8A Service provider/requester | Reuse provider profile/requests/quotes/customer booking UI | Existing service APIs and approval checks | Authorized approved-provider fixtures and account state; owner approval rules | Quote ownership/expiry/accept/withdraw and booking management verified | High |
| 8B Studio/reviews | Reuse requester flow; wire native reviews/operator UX only if approved | Existing reviews/Studio assignment/files/revisions, keep website fallback | Approved operator scope/private storage/payment policy | Real transitions/deliverables; no fabricated operator/payment completion | High |
| 9A Website admin/operations | No Flutter admin app; retain web direction/capability handoff | Existing website admin/account-review routes | Owner policy for deletion/retention/refunds; infra evidence separately | Review requests described as requests, not execution; no unauthorized mobile admin access | High policy/operations |
| 9B Notifications | Review real inbox/read acknowledgments; push UI only if required | Existing notifications; push token/provider capability separately designed if approved | Approved delivery/provider scope, no invented endpoint | Real recipient isolation/read state; push not claimed by inbox existence | Medium–High |
| 10A Supporting APIs/payments | Retain website handoff; later approved AI/reels/native checkout wiring separately | Existing payment/reels/AI APIs, no duplicate models | Provider keys/billing/webhooks/privacy and business policy | Provider evidence and signed/idempotent outcomes, not generic success screens | High |
| 10B Release/production gate | Later signed-release identity, device/accessibility and release provenance | Deployment only after separate approval | All critical verification exits; prod migration/schema/backup reconciliation and operational signoff | No unresolved critical auth/role/data/presentation risks; explicit production approval | High |

## Central architecture refinements to apply within those milestones

- Keep origin-only base and endpoint paths; no /api duplication or production fallback.
  Add reviewed provenance/origin assertions around existing build selection rather
  than a competing API layer. Default preview without defines remains clearly labelled.
- Prefer typed per-action response parsing over generic nonempty JSON acknowledgment.
  Reuse common parsing/error categories and preserve stale account/generation checks.
- Validate authentication by /api/auth/session after callback. Server registration
  acknowledgment does not imply created identity; profile confirms role, not an
  invitation to trust local role state. Secure vault stores cookies/session only.
- Maintain public catalogue/detail without cookies; protected APIs remain session
  owned. Error, timeout, empty and unavailable media are distinct states.
- Keep image transport credential-free and exact-host restricted; never expose
  private documents as public image/video URLs. Native browser cannot guarantee
  provider page health or constrain every external redirect.
- Do not turn local real-data comparison into a new backend project unless product
  requires persistence. Preview local filters/favorites/success are separate UI,
  not implementations to delete or secretly relabel as real services.

## Preserved features and stop boundaries

Every milestone preserves website/admin authentication, canonical CSRF/session
security, role policy, public staging catalogue and independent fictional preview.
Do not introduce new roles or recovery/payment/refund/deletion/team policies by
inference. Source review authority never authorizes migrations, secrets/Railway,
accounts, live authentication, publishing, providers, builds/tests or device launch.
Each required action must have its own explicit scope and authorization.

Future evidence should record commit/build/defines, origin/device, UTC timestamp,
sanitized response/result and observed UI; never PIN/phone/OTP/password/cookies,
tokens or raw sensitive traces. Auth/session/quotas and sometimes profile/history
reads write server state; include those side effects in approved verification.

## Current completion statement

Historically verified: one real Flutter empty-catalogue response. Implemented but
unverified: most service request wiring and PIN backend foundation. Demo-only:
fictional BuyerShell/preview auth-success/media/social/contact paths. Missing first:
PIN registration/enrollment and Flutter PIN contract integration. Production and
current live readiness are not established. The next source milestone is 2A only,
after contract/quota/collision decisions; do not start all phases at once.

This task created only the two master Markdown documents; source/config/schema,
demo data and existing work untouched. No tests/builds/compilation, network/device/
database operations, migrations, OTP/accounts, production/Railway changes,
deployments, commits or pushes. Stop for owner approval.
