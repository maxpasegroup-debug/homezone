# HomeZone subscriptions and property chat

Implementation date: 2026-11-05. Starting source baseline:
`49cb11af9d43a58b7f46c7029c27c694aa2d34af`.

Status: SOURCE IMPLEMENTED; local fixture checks and staging APK compilation
completed. These changes have not been deployed, migrated or verified against
live accounts, payment providers or Android presentation. Earlier catalogue and
property WebSocket verification does not verify private chat or subscriptions.

## Product implemented in this slice

| Experience | Price / allowance | Behavior |
| --- | --- | --- |
| Free | INR0, no subscription expiry | Existing browsing, saving and publishing remain unchanged. Buyers start property conversations; listing owners reply without paying. |
| HomeZone Plus | INR299, 30 days, 10 unique listing-owner contacts | Only a captured, correctly priced payment grants access. The owner must explicitly agree to share a separate contact number. |

Renewal is manual, not recurring. A new owner costs one credit, independently of
the number of that owner's listings. Reopening an already unlocked owner costs
no new credit, but still requires an active paid plan, a currently published
property, current ownership, current sharing permission and no participant block.
Contacts are not a guarantee of ownership, availability, response, visit or sale.
Phone syntax is normalized; this does not prove ownership of the number.

Pro and sponsored/Boost plans are not added in this slice. Existing listing and
service payment products retain their previous prices and workflows. No fake
subscription, automatic trial, sample message or free-credit grant is created.

## Flutter entry points

- Property details: **Chat with Owner** and **View Owner's Number**.
- Buyer account menu and workspace More: **Messages** and **Membership & contact credits**.
- Owner/Broker/Builder profile: **Manage contact sharing**.
- Membership shows Free and Plus, actual allowance/expiry where present, and an
  honestly disabled purchase button: **Purchases unavailable in this build**.
- Existing fictional buyer preview remains separate and receives no real account
  entitlement. Existing API client, Auth.js cookie/session coordinator, secure
  session storage, profile gate and role routing are reused.

Contact GET is an inspection only. If a new contact is eligible, the UI explicitly
asks for confirmation before POST consumes a credit. Contact numbers are not
included in public catalogue/detail projections. The sharing number is independent
of `Profile.phone`, email and the mobile PIN login identity. Sharing is off by
default. Enabling it requires an explicit checkbox; turning it off prevents future
disclosure, including previously unlocked contacts. It cannot retract a number
someone already saw or copied. Users can voluntarily share information in chat;
this implementation does not claim to prevent that.

## API contracts

All routes below use the existing Auth.js session and fresh database profile.
Responses are private/no-store. No request accepts a client-supplied price,
credit count, participant identity, owner identity or role assignment.

| Route | Request | Response / purpose |
| --- | --- | --- |
| GET `/api/mobile/membership` | None | `plan`, `eligible`, `active` allowance/expiry or null, `mobileCheckoutAvailable:false`, `checkoutNotice`. Does not create a profile/payment. |
| GET `/api/mobile/contact-preferences` | None | `phone`, `sharingEnabled`, `consentVersion`; private to the current account. |
| PATCH same | `phone`, `sharingEnabled`, `consentAccepted` | Validated saved preference. Only OWNER/BROKER/BUILDER can enable sharing. Consent marker is exactly `owner-contact-v1`. |
| GET `/api/mobile/properties/[id]/contact` | None | `status`: available, plan_required, limit_reached, unavailable or self; optional phone, alreadyUnlocked, remaining. No credit spent. |
| POST same | No body | Explicit unlock; same status union. Transactionally spends one credit and creates the unique buyer/owner ledger record. |
| GET `/api/mobile/conversations` | None | `conversations`: at most 100 participant-scoped property summaries. No phone or message text in inbox summaries. |
| POST same | `propertyId` | `conversation`; only USER buyers initiate to a published property's current OWNER/BROKER/BUILDER. |
| GET `/api/mobile/conversations/[id]/messages` | Optional `after` message ID | `messages`, `nextCursor`, `hasMore`, `blocked`, `blockedByMe`, `propertyTitle`. First read is latest 50 in chronological order; cursor reads page forward. |
| POST same | `body`, `clientMessageId` | Persisted `message`; body 1-2000 characters. Same sender/conversation/client ID + same body is idempotent; changed body with reused ID is rejected. |
| PATCH `/api/mobile/conversations/[id]` | `blocked` | Updates only the caller's pair-wide block; blocks also prevent paid contact disclosure across the pair's properties. |
| POST same | `reason`, 3-500 characters | Idempotent report marker and entry in existing protected `/admin/reports` queue. |

Only conversation participants can read/send/report/block. Fresh role,
suspension, property publication and ownership checks run before access.
Property transfer never transfers a private conversation to the new owner.
When a property is unavailable/unpublished, its conversation is unavailable;
the UI must not suggest its history is still readable. Persistent pair blocks
survive property/conversation deletion. Each person can undo only their own block.

Reports use existing `Report` records with a peer profile reference and bounded
reason, not automatic account sanctions. Admin review does not add a public
chat-reading endpoint. New-message notifications contain generic text and a
conversation reference, not message bodies or contact numbers.

## Private update transport and failure handling

Private chat uses authenticated HTTP, polling about every four seconds only
while the conversation/inbox is visible and the app is foreground. Existing
public property WebSocket traffic is unchanged and carries no chat/contact data.
There is no private WebSocket, background push, read receipt, attachment or older
history browser in this slice. Inbox is bounded to 100; first view shows latest
50 messages, forward paging catches new messages, and Flutter retains at most 500.

Reads are single-flight, honor Retry-After, preserve confirmed content during
background refresh and show loading shimmer, empty or explicit error states.
Private state is bound to identity, role and session-cookie generation, and cleared
on account/session changes, including report drafts and revealed numbers.
An uncertain send is never automatically resent; explicit retry uses the same
client ID and body. No local optimistic message is presented as server success.

## Database and concurrency

Migration file: `prisma/migrations/20261105120000_buyer_membership_chat/migration.sql`.
It is additive and has NOT been executed. It adds:

- `PaymentProduct.BUYER_PLUS` and Subscription contactLimit/contactsUsed (existing
  subscriptions default to zero; the migration grants no premium access).
- `OwnerContactPreference`: explicit disclosure permission/number/version.
- `OwnerContactUnlock`: unique buyer/owner pair, subscription reference.
- `PropertyConversation`: unique property/buyer conversation and fixed owner.
- `ChatMessage`: unique conversation/sender/clientMessageId.
- `ConversationReport`: unique conversation/reporter.
- `BuyerOwnerBlock`: durable pair-wide two-way independent flags.

Foreign keys, indexes and SQL CHECKs constrain allowances, consent, normalized
phone syntax, distinct participants and message/report lengths. The contact
ledger's subscription FK is RESTRICT: do not delete referenced financial history
as a cleanup shortcut. No phone snapshot is stored in that ledger.

Sorted Profile locks, then Property/Conversation or Subscription locks serialize
permission changes and writes. Unlock counter + ledger commit together; concurrent
retries cannot double-debit a pair. Valid overlapping plans use available credits
in expiry/ID order. Entitlement/payment changes commit together under a Payment
row lock. Synthetic tests exercise these code paths but do not establish real
PostgreSQL contention/performance; staging transaction verification remains a gate.

## Quotas and security

Reuse existing database-backed RegistrationBudget counters, atomic updates and
bounded cleanup (at most 50 expired rows/request), with isolated `engagement:v1:`
keys. Keys contain internal profile IDs, not phone/email/message text.

| Action | Per account |
| --- | --- |
| Inbox, messages, contact reads (separate buckets) | 60/minute each |
| Send message | 30/minute |
| Start conversation | 10/minute |
| Contact unlock | 20/minute |
| Update contact sharing | 10/minute |
| Block/unblock | 20/minute |
| Report | 10/hour |

Each action also has a global budget of max(1000, per-account-limit x100) in its
window. These are abuse controls, not unlimited-throughput commitments. Native
cookie requests remain supported; browser writes require the configured Origin
when present and reject cross-site fetches. Existing middleware, CSRF, HTTPS,
auth/revocation/suspension and public-role boundaries remain intact. JSON bodies
are bounded to 12KiB and strict schemas. Sanitized failure logs contain fixed
stage labels only, not exception objects, PINs, credentials, phones or messages.

## Billing and activation gates

New feature variables (names only; no values provisioned):

- `HOMEZONE_ENGAGEMENT_ENABLED`: literal true only after migration + deployment
  are approved and ready. Otherwise chat/contact routes return 503, not fake data.
- `HOMEZONE_BUYER_PLUS_CHECKOUT_ENABLED`: separate, default-off WEBSITE checkout
  gate; requires engagement enabled and all existing Razorpay keys.
- Existing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` must
  be correctly scoped/tested. Canonical `AUTH_URL`, `NEXTAUTH_URL`,
  `AUTH_STAGING_ORIGIN` must agree on the staging origin.

Server-priced website POST `/api/payments/checkout` accepts `product:BUYER_PLUS`
only for an active USER and exact canonical HTTPS browser Origin. It rejects
unrelated property/service fields, reserves durably per buyer, reuses one matching
pending order, and leaves ambiguous order outcomes for reconciliation instead of
creating another charge. Existing checkout process limits remain; the durable
reservation protects against distributed duplicate orders. No new payment SDK.

Client callback `/api/payments/verify` does NOT grant Plus. Only a valid signed
Razorpay captured webhook with matching stored order/payment/amount/currency
activates exactly one 30-day/10-contact subscription. Webhook input is bounded to
256KiB. Authenticated partial/full refund notifications revoke Plus fail closed;
late captures cannot restore a refunded plan. An unmapped concurrent refund gets
a retryable 503 so revocation is not acknowledged and lost. Chargeback/dispute
automation and unresolved-order reconciliation remain operational release gates.

**Native purchase is not implemented or activated.** Flutter always receives
`mobileCheckoutAvailable:false` and never calls a payment-creation endpoint for
this plan. Existing `MOBILE_WEB_PAYMENTS_ENABLED` is not authorization to sell this
digital feature through an external app checkout. Select distribution/payment
channel before implementing native purchase: private APK, Google Play and Apple
have different requirements. Store rules generally require their billing for
digital access, subject to specific exceptions/programs; confirm the applicable
path using [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
and [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/).
This source change claims no store approval or legal compliance.

Before paid activation also approve price/tax display, refund/support terms,
privacy/retention, invalid-contact review, dispute handling and provider test mode.
No automated contact replacement or refund execution is claimed. Owner sharing
permission is implemented; it is not a substitute for approved legal policy text.

## Controlled activation and verification

1. Founder approves the exact staging project/environment/backend/database IDs,
   additive migration and recoverability plan. Reconcile the FULL pending migration
   set: `railway.json` predeploy runs `npm run db:migrate`, not just this migration.
2. After approval, apply the approved staging pending set using the existing
   deployment procedure and regenerated compatible Prisma client. This task did
   neither; no production operation is permitted.
3. Approve/deploy this source artifact preserving existing realtime start/volume
   settings. Keep both new flags off initially. Confirm startup/schema/routes.
4. Approve engagement activation and controlled two-account writes using existing
   authorized Buyer + Owner accounts and an approved published property. Verify
   private chat, idempotent retry, logout clearing, foreign-account denial,
   pair-wide block/unblock/report and owner's explicit contact opt-in/out.
5. Choose/implement the native billing channel separately. Approve provider/store
   sandbox transactions and credit-ledger writes. Test captured/duplicate/failed/
   delayed/refunded events, expiry, simultaneous unlocks and ownership changes.
   Do not charge a real user or seed an ACTIVE plan to pretend payment works.
6. Verify actual Android presentation and HTTP responses, not only widget fixtures.
   Collect sanitized status/timing/account-role and UI outcomes, never phones,
   message bodies, cookies, payment secrets or credentials.

No account creation, provider request, charge, DB access, Railway variable change,
deploy/restart or production access occurred in this implementation task.

Rollback: disable the new checkout/engagement gates through separately approved
staging configuration change, then use the last compatible artifact. Preserve
new tables, messages, consent, credit/payment records and revocation history;
do not drop/reset them to roll back code. Reconcile pending/paid/refunded orders
before re-enabling. Plan how captured/refund webhooks remain processed during a
rollback; never remove the only revocation handler while paid plans remain active.
If a disclosure incident occurs, stop further disclosure; previously seen numbers
cannot be remotely erased. Production rollout is a separate approval.

## Local evidence

- Prisma schema-only diff and client generation succeeded against local files
  using a dummy unavailable loopback datasource; no schema introspection/migration.
- Full TypeScript check and Next.js production compilation passed, including
  lint/type validity, static page generation and the six new route paths. Build
  used a dummy unavailable database and disabled provider configuration; this is
  not live PostgreSQL/payment verification. An initial process-only build fixture
  used an invalid blank monitoring URL; correcting that synthetic URL allowed
  the build to finish. No environment file was changed for the build.
- Backend fixtures: 89/89 passed (engagement, Plus payments and existing payment,
  mobile API and session regressions); synthetic stores, not a live database.
- Flutter focused engagement: 12/12 passed; broader workspace/profile/catalogue/
  gallery/live-listing batch: 85/85 passed (includes an earlier 9 engagement cases).
  The two counts overlap and must not be added as distinct tests.
- Dart analysis for new engagement source/tests: no issues found.
- Explicit staging debug APK compiled, no install or launch. See current status
  document for hash/provenance and backend compilation result.

Reproduce new local fixtures: `npm run test:engagement` from repository root and
`flutter test --no-pub test/engagement_test.dart` from `mobile-app/`.
Build staging APK: `node scripts/build-android.mjs --mode service --config config/staging.local.json`.

## Changed source inventory

Backend: `src/lib/engagement/{http,blocks,contact,conversations,membership}.ts`,
`src/lib/payments/{buyer-plus-checkout,catalog,service}.ts`,
`src/lib/api/validation.ts`, `backend/api/payments/{checkout,verify,webhook}/route.ts`,
and mobile API routes for membership, contact-preferences, property `[id]/contact`,
conversations, conversation `[id]`, and `[id]/messages`.

Flutter: `lib/features/engagement/{engagement_repository,engagement_screens}.dart`,
`lib/features/marketplace/marketplace_screen.dart`, and
`lib/features/workspace/{workspace_screen,workspace_dashboard,workspace_profile_screen}.dart`.

Data/checks: `prisma/schema.prisma`, the migration above, `package.json`,
`tests/{engagement,buyer-plus-payments}.test.mjs`, `mobile-app/test/engagement_test.dart`.
Documentation: this file, `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md` and
`HOMEZONE_REMAINING_BLOCKERS.md`. No dependency was added.
