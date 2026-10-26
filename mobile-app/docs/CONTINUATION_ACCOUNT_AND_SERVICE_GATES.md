# Account, team and payment continuation boundaries

## Real review requests, no destructive/financial execution

Authenticated users can record `DELETION_REVIEW` or `REFUND_REVIEW` requests via
`POST /api/mobile/account-requests`. Refund review requires the caller's PAID
payment. A unique account/kind/target key prevents duplicate review records.
The mobile workspace exposes own status/history. The existing web admin now has
`/admin/account-requests` with admin-authorized conditional review transitions
and audit records. Review notes are internal; customer history does not expose them.

OPEN -> REVIEWING -> REVIEWED or CLOSED records human review only. No transition
deletes accounts/data, transfers funds, calls a refund API, or sends communications.
Account sign-in remains available. Closure is not a deletion/refund receipt.
New `AccountServiceRequest` rows retain their referenced profile until a later
approved retention workflow handles them; migration approval is required first.

Required decisions: deletion authority and reauthentication, retention/legal holds
for listings/CRM/bookings/invoices/documents, anonymization versus erasure, key and
backup retention, support/privacy contacts, review SLAs and communication consent.
No automatic deletion was implemented without those decisions.

## Existing team rules and deliberate non-grants

Current source authorizes CRM by assigned profile/property ownership/admin and
builder projects by project ownership/admin. Team role/permission arrays are not
a complete delegated authorization policy. They do not grant global ADMIN access.

This pass blocks new arbitrary profile bindings and changes to an existing binding
through ordinary team routes. Assignment requires an active account-linked member
of the actor's brokerage. Lead authorization, membership recheck, assignment record
and assigned-profile update occur in one transaction. No invitations or acceptance
emails are sent; an unbound row is metadata, not an activated team account.

Owner decisions still required:

- How identity binding is invited, accepted and independently verified.
- Which operations LEADS/VISITS/COMMISSIONS/REPORTS/PROJECTS/INVENTORY allow, and
  whether scopes are per project, lead, customer or entire team.
- Whether deactivation revokes existing assignments or only future assignments.
- Whether the originating broker retains access after reassignment; existing
  assigned-profile rules are preserved rather than widened using old history.
- Who can delegate, edit permission sets, view money/documents, or accept bookings.

No broad delegated access was invented from a role label or historical assignment.

## Payment integration and owner prerequisites

Mobile payment history comes from own server payment records; amounts are labeled
with the stored currency in major units. PAID records can request human refund
review. No native Razorpay SDK or refund execution endpoint exists in the current
architecture. Neither a review request nor a browser launch indicates payment.

The implemented handoff opens only the configured same-origin HTTPS website's
existing `/dashboard/services` or `/dashboard/studio/[id]` controls, with explicit
consent. Browser sign-in to the same shared account may be required. No native
cookies/tokens are transferred. Refresh retrieves server-confirmed status.

Handoff is disabled unless the backend explicitly sets
`MOBILE_WEB_PAYMENTS_ENABLED=true`, all three existing Razorpay settings are
present (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`), and the
canonical HTTPS origin exactly matches the app's origin. This is a configuration
gate, not evidence that the provider works. No flag was enabled in this phase.

Before enabling: approve existing catalog fees versus quoted service amounts and
units, refund eligibility/amounts, reconciliation, provider mode/webhook endpoint,
idempotency/recovery, and applicable mobile-store billing policy. No pricing or
refund policy was guessed. Existing provider operations were not exercised.

## Live-service build values

Use the shared Next.js website/API origin, not a database or media-provider URL.
See `config/README.md` and `scripts/prepare-service-config.mjs`. Owner supplies:

- Approved HTTPS API/website origin; environment name; exact image CDN hostnames.
- Isolated `DATABASE_URL`, reviewed migrations and backup/recovery ownership.
- Canonical `AUTH_URL` / `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL`; for staging,
  `AUTH_STAGING_ORIGIN` must match the explicitly isolated origin.
- Server-only `AUTH_SECRET`, `OTP_PEPPER`, `PASSWORD_SIGNIN_HMAC_KEY`, existing
  password-limiter capacities/timeouts/ingress controls. Existing validation and
  G7 evidence requirements remain authoritative; G7 is still BLOCKED.
- `RESEND_API_KEY`, verified `RESEND_FROM_EMAIL` or `EMAIL_FROM`, and enforced
  `STAGING_EMAIL_RECIPIENTS` for approved tests; no real email was sent here.
- Public photography: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`; app `HOMEZONE_IMAGE_HOSTS` must allow the approved CDN.
- Private PDF settings above; payment settings/approval above, if enabled.
- Approved application ID, release signing, privacy/support/store disclosures and
  operational monitoring. No values/secrets or approvals are supplied by this code.

Config preparation is local only; it neither builds nor contacts a service.
Missing/invalid service configuration displays an error; it is not silently
replaced with fictional data. Existing APKs do not change when a config is written.

## Owner listing photograph and fact controls

Mobile owners can now open Manage listing photographs from an owned listing.
GET /api/properties/[id]/media returns only scoped photograph/title/version
metadata; it rejects suspended actors and other owners. The existing PATCH
contract is reused for choosing cover, moving gallery references and removing
references. Existing actions and web clients remain supported. No new media
provider, deletion endpoint or duplicate storage platform was introduced.

The mobile view uses the existing credential-free image host allowlist/fallback,
actor/generation guards, server-confirmed state and explicit removal disclosure.
Removing a reference does not erase a public provider object or revoke its URL.
A legacy cover outside the gallery is displayed separately. Private PDFs and
other sensitive files never belong in this public-photo workflow.

Mobile writes supply expectedUpdatedAt and expectedMediaState. The latter is a
SHA-256 of the current cover/gallery reference state, not a secret or credential;
it catches stale concurrent edits even if timestamps tie. PATCH serializes on
the actor/property rows, rechecks suspension/role/ownership, checks supplied
preconditions and computes changes from current data. Conflicts require refresh.
Legacy clients that omit preconditions retain the existing action contract,
with serialized state computation. This is source implementation, not proof of
PostgreSQL concurrency or provider behavior.

The existing 40-photo contract is enforced before mobile provider upload and
again during locked attachment after the provider returns. Uploads also require
canonical base64 and a supported image signature. An upload that completes at
the provider but cannot attach due to a changed listing/quota is reported as
such; no cleanup/deletion success is fabricated. Approved provider-side orphan
inventory and cleanup remain operational/retention work.

Owner forms now expose existing country/state/address/coordinate/area-unit
fields, with bounded signed coordinates and whole-number bedroom/bathroom facts.
No furnishing/media/amenity claims were fabricated. New listing creation and the
existing USER-to-OWNER transition now commit together under current-profile
admission; successful creation still revalidates the independently verified
mobile session. No new role promotion policy was added. Draft fallback copy no
longer claims that an unsubmitted draft is already awaiting review.
