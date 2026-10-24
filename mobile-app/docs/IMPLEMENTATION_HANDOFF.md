# Continuous implementation handoff

This is the historical implementation snapshot. Subsequent local fixes and actual
validation outcomes are recorded in [STABILIZATION_REPORT.md](STABILIZATION_REPORT.md).

Status: source implementation only. No compilation, formatting, analysis, lint,
tests, device run or live verification was performed in this pass. Existing test
totals are historical. This document is not a release approval or privacy policy.

## Modes and ownership

The default `main.dart` entry remains offline and constructs `HomezoneApp` without
an API client. The original BuyerShell, fictional properties, bundled photographs,
filters, collections, history, onboarding and preview disclosures remain intact.

Service mode must be explicitly selected with `HOMEZONE_ENABLE_API=true` and both
`HOMEZONE_API_ENV` and `HOMEZONE_API_BASE_URL`. Supported environment names are
development, staging and production. There is no default origin. Development HTTP
is restricted by ApiConfiguration to its existing loopback/emulator hosts; staging
and production require HTTPS. Android release/profile cleartext is disabled;
debug permits explicitly configured development HTTP. No host has been approved
or supplied by this change. Configuration is not authorization to access a host.

Sign-in retains CSRF bootstrap, password callback, independently verified session
provenance and exclusive controller/protocol/client ownership. The marketplace
repository borrows that owned client; it never closes it or makes another cookie
store. API cookies, including error-response updates, flow through active
coordinator tickets. Feature errors omit raw response metadata. Account reads and
mutations require a verified, unexpired identity and capture the current
generation. A 401 clears only the current controller's authorized local session.

The service buyer route is `/buyer`. The separately labelled offline entry uses
`/buyer-preview`. Demo properties are never mapped into service DTOs. Service
listing parsing requires PUBLISHED status and the catalog's database source marker.
App replacement supplies a new marketplace widget identity. Session invalidation
drops cached account data, comparison and viewing history. State derived from a
superseded request cannot be committed to a newer generation by the repository.

Session credentials remain memory-only. Resume revalidates the current session
through GET /api/auth/session and replaces expiry only after independent parsing.
Failure clears local access conservatively. Restart requires sign-in. No disk
session restoration or custom credential encryption was introduced. Session
expiry never proves continuing server validity; the server remains authoritative.

Sign-out obtains CSRF, validates the applicable cookie and posts Auth.js signout.
The current owner clears local authority even if revocation cannot be confirmed.
UI distinguishes server acknowledgment from uncertain revocation. This does not
undo requests already processed by the server. A lost logout response can leave
server state uncertain; use approved account/operational controls to resolve it.

## Implemented service contracts

| Contract | Purpose |
| --- | --- |
| GET /api/mobile/properties | New paginated, strict public catalog, no fictional fallback |
| GET /api/mobile/properties/[id] | New PUBLISHED-only public detail projection |
| GET /api/mobile/account | New authenticated account snapshot, scoped by profile |
| PATCH /api/mobile/account | New city/phone edit; never accepts or changes a role |
| POST/DELETE /api/properties/[id]/save | Existing account saves, acknowledgment required |
| POST /api/shortlists | Existing named shortlist creation |
| PATCH/DELETE /api/shortlists/[id] | Existing ownership-protected rename/delete |
| POST/DELETE /api/shortlists/[id]/properties | Existing ownership-protected membership |
| POST /api/leads | Existing enquiry creation; server lead ID required for success |
| GET /api/auth/csrf; POST /api/auth/callback/password; GET /api/auth/session | Existing sign-in protocol |
| POST /api/auth/signout | Existing registry-backed logout mechanism |
| POST /api/auth/password/forgot; POST /api/auth/password/reset | Existing recovery/reset endpoints |

Models reused: Property, Profile, SavedProperty, PropertyShortlist,
ShortlistProperty, Lead, User, PasswordResetToken and AuthSession. No schema changes
or migrations were added or executed. Existing website routes are retained.

Catalog filters use the backend's purpose/category enums, keyword, city, country,
state, locality, bedroom/bathroom counts, prices and supported sorts. Invalid mobile
filter inputs fail rather than silently broadening to all listings. Budgets require
currency and purpose so rent amounts are not compared silently with sale totals or
another currency. Mobile filters have Apply/Cancel/draft Reset. Changing purpose
or currency clears incompatible budget values. There is no furnishing column in
the backend Property model: live furnishing filtering is explicitly unavailable;
the offline preview retains its exact-value furnishing filter.

Pagination uses page/pageSize, a maximum 24-item page and stable sort tie-breaking.
The app loads 12 at a time, deduplicates IDs and caps displayed browsing at 120
before requesting refinement. Offset pages may shift under concurrent inventory
updates; refresh restarts at page one. The account snapshot is bounded at 200 saves
and 100 shortlists/enquiries; full account-history pagination is not implemented.

Server shortlists are independent collections: unsaving does not delete server
shortlist membership. The existing offline preview's pruning rule is unchanged.
Compare (up to four) and Recently Viewed (ten unique IDs, newest first) remain
memory-only. There is no persistent cache or silent offline mutation queue. The
existing Flutter image cache is volatile; refresh performs a new API read. No
mutation, especially an enquiry, is automatically retried. After a timeout the UI
warns that a mutation may already have been processed; refresh before retrying.
The existing leads endpoint is not idempotent. A post-commit backend notification
failure can also make the response uncertain; operational review is still needed.

## Media and locations

Remote photography is HTTPS-only and displayed only for hosts explicitly listed
in the non-secret comma-separated `HOMEZONE_IMAGE_HOSTS` build setting. Empty or
unapproved media hosts show a fallback. Use only reviewed property-media hosts;
never put credentials or signing secrets in build defines. Missing photos,
unavailable media and image failures have visible fallbacks. Gallery uses the
actual unique supplied URLs; no videos or floor plans are fabricated.

Android can hand valid listed latitude/longitude to an installed maps application
after explicit user confirmation. No GPS permission, SDK, tracking or map service
key was added. Non-Android platforms and devices without a handler fall back to
copyable coordinates. External map providers can use their own network services;
their privacy implications must be reviewed before release. No map app was opened
or network request made during implementation.

## Production build preparation (not executed)

Android display name is HOMEZONE. The source namespace remains unchanged to avoid
inventing a package identity. Release tasks require externally supplied:

- HOMEZONE_APPLICATION_ID and HOMEZONE_PACKAGE_ID_APPROVED=true after ownership review.
- HOMEZONE_SIGNING_STORE_FILE pointing to an external protected keystore.
- HOMEZONE_SIGNING_STORE_PASSWORD, HOMEZONE_SIGNING_KEY_ALIAS and HOMEZONE_SIGNING_KEY_PASSWORD.

No release signing credentials or approved ID were supplied. Debug retains its
existing development identity. Release signing no longer falls back to debug keys.
Use the existing pubspec version and Flutter build-name/build-number mechanism
after choosing the next version and unique Play version code. Keystores, signing
properties and local configuration are ignored. Do not pass signing passwords as
Flutter defines: those values become application data. iOS display name is HOMEZONE;
bundle identity, distribution signing and iOS native QA remain owner responsibilities.

## Deployment, privacy and external blockers

- Approved staging and production origins, authorization and isolation evidence are
  not available. No remote environment was queried.
- Railway still invokes `npm run db:migrate` (Prisma migrate deploy) before startup.
  Prisma selects DATABASE_URL. Do not deploy until the isolated target, migration
  history, drift/replay review, recovery plan and owner are confirmed.
- Authentication origin/secret, cookie attributes, registry failure behavior,
  CSRF/proxy compatibility and repeated Set-Cookie preservation need isolated QA.
- Password sign-in limits remain process-local. Shared atomic enforcement,
  ingress identity/trust, failure policy, monitoring and capacity are deployment
  decisions. This pass does not solve targeted denial or multi-instance quotas.
- Existing backend logging can include original exception messages/stacks and
  development SQL; it needs a dedicated redaction review. New mobile routes report
  fixed-category replacement errors rather than original database exceptions.
- Registration is intentionally disabled in service mode. The existing web signup
  route exists, but no approved account-deletion/retention workflow, external
  deletion page, legal consent, support destination or privacy policy was found.
  Deleting User blindly is unsafe across the schema's business/payment relations.
  No mobile account-deletion success or remote legal guarantee is fabricated.
- Recovery depends on approved sandbox/production email configuration. Generic
  recovery acknowledgment does not confirm delivery. Reset links target the web;
  automatic verified app links are not configured. The app offers manual token entry.
- Secure persistent session restoration requires an approved platform secure-storage
  approach and its validation. No plaintext cookie storage or custom crypto was added.
- Profile edits cover actual city/phone fields only. No unsupported avatar upload,
  remote appearance preferences, payments, bookings, chat or location tracking.
- Play preparation requires owner-approved identity, upload key custody, current
  platform/API requirements, final privacy and deletion URLs, Data safety disclosure,
  retention policy, content rating, screenshots, feature graphics and review access.
  These are requirements, not claims that a Play submission is complete.

## Separate validation stage required

Deliberately not run: Dart formatting or verification, Flutter analyzer, lint,
TypeScript checking, unit/widget/integration/full tests, Gradle/Flutter builds,
Android installation/launch/QA, startup profiling, network/database tests,
migrations, deployment and store submission. No historical count validates these changes.

Next stage must cover compilation first, then mocked catalog pagination/schema
failures, invalid and missing config, media allowlists, filter Apply/Cancel/Reset,
cross-currency/purpose budgets, save/shortlist acknowledgments and uncertain writes,
account isolation and late responses, CSRF signout failures, resume/expiry races,
route disposal, preview reset, accessibility and all existing auth/buyer regressions.
Backend tests must prove unpublished listings and private fields never escape,
mobile account reads/writes cannot cross profiles or change roles, malformed query
inputs fail, and errors redact originals. Native builds must verify release gates,
activity identity after package override, HTTPS/media behavior and map fallback.
Then use separately authorized isolated staging and physical devices. Do not use
production credentials or data during this work.

Registration and the font dependency were subsequently changed; see
[REGISTRATION_IMPLEMENTATION.md](REGISTRATION_IMPLEMENTATION.md). The disabled
registration and Google-font build failure described here are historical, not
current implementation claims. Refer to the current phase validation report for
actual command outcomes.
