# Role dashboard and property journey release handover

Date: 2026-11-04. Local baseline: `main`,
`92e261730fd4a43c8e9429d6430619b301157749`, plus preserved uncommitted Owner
deletion changes. This work implements app/source improvements; it does not
activate services or establish staging acceptance.

Photo-policy update, 2026-11-04: the current minimum is **two distinct photos**,
with **six selected photos maximum** in mobile Create listing. This supersedes the
earlier four-photo candidate. Existing larger stored galleries remain intact.

## Source changes

| Area | Result |
| --- | --- |
| Authentication entry | Selected role opens existing email/password Sign In; Create a new account retains the role and the underlying sign-in draft. Name/email/password/Terms registration, independent session/profile verification and five public roles remain. Separate PIN and website/admin infrastructure are preserved. |
| Buyer | Existing Home/Search/Saved/Enquiries/Profile, real catalogue/detail/media, shortlists and enquiries are retained. Fictional buyer preview remains separate. |
| Owner | Home/Listings/Enquiries/More, server totals and up to three actual owned property cards with approved-image thumbnails. Add property opens guided creation. Existing edit/photos/publication/archive and preserved Delete action remain. |
| Broker | Home/Leads/Listings/Follow-ups/More, server totals, actual scoped leads, team/commission shortcuts and existing lead/listing workflows. Follow-ups is the existing task experience, not a new visual calendar. |
| Builder | Home/Projects/More, server project totals and actual project cards. Units, reservations, towers, team, campaigns and bookings remain inside the selected project. No invented global inventory endpoint. |
| Service Provider | Home/Requests/Bookings/Profile/More, actual scoped requests/jobs, business profile and existing quotes/bookings. Existing provider-entity verification requirements remain. |
| Shared services | More groups Services, Activity, Finance and Account. Notifications are reachable from the home header. Sign-out and account-deletion review sit under Account. Common My profile uses the existing profile API and city/contact-phone editor; it cannot change a role or login identity. |
| Reliability | Home overview and record previews have independent loading/error/empty/retry states, bounded reads and stale-session rejection. Contact edits require independent server readback before success and block uncertain write retries until refresh. An open contact editor hides the prior account's data after logout/account switch; stale Save callbacks cannot submit. |
| Photo backend | One 15-second provider deadline covers dispatch and acknowledgment; incoming native cancellation is forwarded. Fixed sanitized diagnostics, no automatic retries, no storage/provider/host-policy replacement. |

Overview counts are only existing server metrics: unread notifications; Owner/
Broker listing counts; Broker active leads and pending tasks; Builder project
count; Provider active jobs. No invented revenue, conversion or earnings figures.
Record previews display at most three rows from one existing cursor page and do
not claim an ordering stronger than the backend contract.

## Guided property creation

Actual property creation from Listings and Owner Home now uses:

1. Purpose: Sell/Rent/Lease/Investment, category, property type.
2. Details: title, description, rooms, area and amenities.
3. Location: city, locality/address and optional coordinates.
4. Price: existing price/currency contract.
5. Photos: existing in-memory picker, minimum two and maximum six different photos for Owner creation/publication.
6. Review: retained values and photo previews; editing returns to the relevant step.

Step navigation does not send writes. Client title/description/location/type
lengths mirror the existing server contract. Hidden values are revalidated before
submission. Back retains controllers/photos; losing a session permits a safe exit.
No wizard is forced onto unrelated forms or existing property edits.

Owner submission checks storage readiness, creates one private draft, serially
uploads all selected photos, independently reads its stored gallery and only then requests
publication. Success requires exact property ID/status acknowledgment. Unknown
create/upload/publication outcomes require refreshed Listings rather than another
creation request. Broker creation remains a draft under existing permissions.

## Local verification

The coordinated local checks and APK provenance are recorded in
`HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`. In-process fixtures use synthetic
accounts/images and mocked external boundaries. They are not live registration,
Cloudinary upload, Railway connectivity, Android Keystore or production evidence.

Prior candidate checks, before the two-photo policy update: full Flutter suite 511/511 passed; backend `npm test` passed
TypeScript, six smoke checks and 232 Node fixtures. Full Flutter analysis passed
with zero errors/warnings and 83 informational lints (`--no-fatal-infos`). Lint
rules were not weakened. `git diff --check` passed.

Latest two-photo policy checks: 94 focused Flutter tests passed, Owner backend
24/24 and admin backend 11/11 passed, TypeScript passed, and targeted analysis had
no errors/warnings (33 informational lints). A fresh staging debug APK was built
without installation/launch; see the latest status entry for its new hash.

The staging debug APK was built successfully with
`node scripts/build-android.mjs --mode service --config config/staging.local.json`.
Exact artifact, SHA-256 and build-record path are in the integration status.
It was not installed/launched; no actual device or live workflow acceptance was
performed for this candidate.

New coverage: role tabs, authoritative totals/records, thumbnail URL selection,
independent error states, account switches and late responses, common profile
readback, guided validation/photo/publication order, uncertain writes and stored
session restoration/logout. Existing authentication, Owner deletion, marketplace,
media, preview and backend authorization regressions are retained.

## Changed-file inventory

- `lib/features/workspace/workspace_screen.dart`: shared role shell/navigation,
  guarded routes/account controls, guided property creation and field validation.
- `lib/features/workspace/workspace_dashboard.dart` (new): role destinations,
  branded server-backed Home, bounded record previews and grouped More.
- `lib/features/workspace/workspace_profile_screen.dart` (new): authoritative
  account/profile display and contact edits with independent readback.
- `lib/features/marketplace/marketplace_screen.dart`: reusable contact editor
  bound to the opening account, role and session generation, including Save.
- `lib/features/auth/role_first_auth_screen.dart`, `auth_screens.dart`,
  `auth_form_screen.dart`: direct role-to-sign-in and retained signup navigation.
- `lib/shared/ui/auth_components.dart`: neutral accessibility loading label.
- `../backend/api/media/upload/route.ts`,
  `../src/app/api/mobile/upload/route.ts`: provider deadline and cancellation.
- New fixtures: `test/listing_wizard_test.dart`, `workspace_dashboard_test.dart`,
  `workspace_profile_test.dart`, `session_persistence_integration_test.dart`.
- Updated fixtures: `test/create_listing_photos_test.dart`,
  `email_auth_role_flow_test.dart`, `email_registration_navigation_test.dart`,
  `mobile_pin_auth_screen_test.dart`, `registration_test.dart`, `widget_test.dart`;
  `../tests/property-photo-storage.test.mjs`, `property-realtime-writes.test.mjs`.
- This document, `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`,
  `HOMEZONE_REMAINING_BLOCKERS.md` and
  `HOMEZONE_PHASE_1_AUTHENTICATION_IMPLEMENTATION_PLAN.md`.

The pre-existing uncommitted Owner Delete work in
`lib/features/marketplace/marketplace_repository.dart`, `workspace_screen.dart`,
`test/owner_delete_listing_test.dart` and status/blocker notes was preserved and
included in the candidate. Its live deletion acceptance remains separate.

## Required staging acceptance (not executed)

| Check | Prerequisite/approval | Evidence and pass criterion |
| --- | --- | --- |
| Artifact and display | Approve install/launch of the exact staging candidate; emulator/device available. | APK hash/config provenance; actual Android screenshot and visible window agree. Internal widget capture alone does not pass. |
| Environment | Read-only target identity/config evidence. | Explicit staging origin, matching backend service/deployed version; no production traffic or offline/demo fallback. |
| Five role authentication | Approved private test credentials or separately approved controlled accounts; session/quota writes authorized. | Actual role selection, sign-in/signup, independent session/profile response and correct Android dashboard. Wrong-role/suspended/foreign-account access is denied. No secrets in reports. |
| Session and account | Authorized session/profile mutations. | Real process restart restores only a server-valid session; logout removes local credentials and rejects protected access; contact edit readback matches without role/login changes. |
| Owner publication | Approved disposable listing, two to six approved local photos, configured provider, matching backend/client. | One draft, all selected photos confirmed stored, at least two distinct photos and exact published acknowledgment; Owner and Buyer show the same records/images for Sell and Rent. |
| Live refresh | Matching client/backend and read-only public catalogue; explicit approval for the triggering mutation. | Buyer already open receives server readback and updates after publication/edit/removal. Record actual transport: existing polling versus separately activated WebSocket. |
| Remaining business roles | Approved owned/assigned project/lead/provider fixtures and scoped write authorization. | Actual permitted action, server acknowledgment, readback and correct UI; other accounts' data unavailable. No fictitious fixtures inserted directly into a database. |
| Failures | Approved device/network manipulation; controlled session scenarios. | Empty differs from failed; interrupted uploads preserve details; duplicate taps produce one write; uncertainty does not claim success or automatically retry. |

## External release gates and scope limits

- Last read-only staging evidence found all three existing Cloudinary settings
  absent: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
  Reconfirm and provision privately only with approval. No Railway volume adapter
  is implemented by this work; the existing provider remains authoritative.
- Review approved exact image/media hosts and build settings against actual stored
  URLs. Do not weaken HTTPS or host restrictions to make a photo appear.
- Deploy the matching backend and APK together after the exact staging target and
  rollback artifact are approved. `railway.json` predeploy runs `db:migrate` and
  may apply all pending migrations; reconcile that pending set/recoverability
  separately. This source slice adds no schema/migration or required variable.
- WebSocket gateway/flag/template remains separately unactivated; polling evidence
  does not establish WSS acceptance. See `LISTING_WEBSOCKETS.md`.
- Approved legal policy content/versioned consent persistence, native recovery
  completion, payment/provider execution, push delivery and any other previously
  documented operational gaps remain release prerequisites where applicable.
  This UI work does not invent legal text, checkout, wallets or instant refunds.
- Listings with retained private documents can still reject deletion. Preserve
  retention/foreign-key rules; Archive remains available.

No Railway/environment changes, database operations, accounts, live HTTP requests,
OTP delivery, deployment, device installation/launch, commits or pushes were
performed by this source implementation. Local tests/builds are recorded separately.
