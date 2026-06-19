# Phase 3 Monetization & Payments

## Summary

Phase 3 adds the HomeZone monetization foundation with Razorpay checkout, server-side payment verification, webhook verification, listing upgrades, subscriptions, Studio payments, payment history, and invoice-ready payment records.

This phase does not add AI upgrades, CRM, referral systems, coupons, wallets, a tax engine, full subscription renewals, or UI redesigns.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking. Use a non-OneDrive path such as `C:\Projects\homezone`.

## Prisma Changes

Migration:

- `prisma/migrations/20260618_phase_3_monetization/migration.sql`

Added enums:

- `PaymentStatus`
- `PaymentProduct`
- `PaymentProvider`
- `SubscriptionStatus`

Extended `Property`:

- `featured`
- `featuredUntil`
- `premium`
- `premiumUntil`

Extended `StudioRequest`:

- `paymentStatus`

Added models:

- `Payment`
- `Subscription`

Payment records include:

- product
- provider
- status
- amount
- currency
- Razorpay order/payment ids
- invoice number
- invoice metadata
- paid timestamp
- optional property, studio request, and subscription links

## Server-Controlled Products

The product catalog lives in `src/lib/payments/catalog.ts`.

Supported products:

- `FEATURED_LISTING`
- `PREMIUM_LISTING`
- `BROKER_MONTHLY`
- `BROKER_YEARLY`
- `BUILDER_MONTHLY`
- `BUILDER_YEARLY`
- `STUDIO_PHOTOGRAPHY`
- `STUDIO_VIDEOGRAPHY`
- `STUDIO_DRONE`
- `STUDIO_REELS`

Amounts and role rules are server controlled. Client input cannot define price or entitlement behavior.

## Razorpay Architecture

Razorpay helpers live in `src/lib/payments/razorpay.ts`.

Environment variables:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

APIs:

- `POST /api/payments/checkout`
- `POST /api/payments/verify`
- `POST /api/payments/webhook`

Checkout:

- Authenticated user requests a checkout order.
- Server validates product, role, and ownership.
- Server creates a `Payment` record with invoice number.
- Server creates a Razorpay order.
- Client receives only checkout-safe order data.

Verification:

- Client success handler sends Razorpay payment data to `/api/payments/verify`.
- Server verifies Razorpay signature.
- Payment is marked paid only after signature verification succeeds.

Webhook:

- Razorpay sends events to `/api/payments/webhook`.
- Server verifies `x-razorpay-signature` against raw request body.
- Captured payments are marked paid idempotently.
- Failed payments are marked failed.

No fake success path exists.

## Payment Flow

Successful payment applies entitlements through `src/lib/payments/service.ts`.

Listing upgrades:

- Featured listing:
  - `Property.featured = true`
  - `Property.featuredUntil` is extended by product duration
- Premium listing:
  - `Property.premium = true`
  - `Property.premiumUntil` is extended by product duration

Subscriptions:

- Broker and builder plans create `Subscription` records.
- Phase 3 creates subscription records only; automated renewal is not included.

Studio payments:

- Studio checkout reuses `StudioRequest`.
- Paid Studio requests are marked with `paymentStatus = PAID` and `status = paid`.

Invoices:

- Invoice numbers are generated automatically using `HZ-YYYYMMDD-XXXXXX`.
- `Payment.invoiceMetadata` stores download-ready invoice details.
- Actual PDF/download generation is reserved for a later phase.

## RBAC

- Listing upgrades require listing ownership unless the actor is ADMIN/SUPER_ADMIN.
- Broker plans require BROKER, ADMIN, or SUPER_ADMIN.
- Builder plans require BUILDER, ADMIN, or SUPER_ADMIN.
- Studio products are available to authenticated marketplace roles.
- Checkout, verify, and history-related dashboard data require authentication.
- Razorpay webhook is public but signature-verified.

## Audit Events

Phase 3 writes audit logs for:

- `PAYMENT_ORDER_CREATED`
- `PAYMENT_VERIFIED`
- `PAYMENT_FAILED`
- `RAZORPAY_WEBHOOK_RECEIVED`
- `LISTING_FEATURED_ACTIVATED`
- `LISTING_PREMIUM_ACTIVATED`
- `SUBSCRIPTION_ACTIVATED`
- `STUDIO_PAYMENT_COMPLETED`

## UI Updates

Minimal UI only:

- Featured/Premium badges on marketplace cards and property detail pages.
- Upgrade buttons on owned listing cards.
- Broker and builder plan buttons.
- Studio payment buttons.
- Payment history sections in user, broker, and builder dashboards.

## Files Changed

- `.env.example`
- `middleware.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260618_phase_3_monetization/migration.sql`
- `src/app/api/payments/checkout/route.ts`
- `src/app/api/payments/verify/route.ts`
- `src/app/api/payments/webhook/route.ts`
- `src/app/dashboard/listings/page.tsx`
- `src/app/properties/page.tsx`
- `src/app/properties/[id]/page.tsx`
- `src/components/dashboard/homezone-dashboard.tsx`
- `src/components/dashboard/broker-dashboard.tsx`
- `src/components/dashboard/builder-dashboard.tsx`
- `src/components/payments/listing-badges.tsx`
- `src/components/payments/payment-button.tsx`
- `src/components/payments/payment-history.tsx`
- `src/components/studio-dashboard.tsx`
- `src/lib/api/validation.ts`
- `src/lib/dashboard/queries.ts`
- `src/lib/env.ts`
- `src/lib/payments/catalog.ts`
- `src/lib/payments/razorpay.ts`
- `src/lib/payments/service.ts`
- `src/lib/properties/queries.ts`
- `tests/phase1.test.ts`

## Verification

Run from `C:\Projects\homezone`:

```bash
npx prisma generate
npm run typecheck
npm run lint
npm run test
npm run build
```

Latest verification results from `C:\Projects\homezone`:

- `npx prisma generate`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed in 44.5 seconds

The test command still emits the existing Node ESM warning for `tests/phase1.test.ts`, but all tests pass.

## Remaining Risks

- Real Razorpay keys and webhook secret must be configured before production.
- Webhook endpoint must be configured in Razorpay dashboard.
- Subscription renewals are not automated in Phase 3.
- Invoice PDF/download generation is not implemented yet.
- Payment history is dashboard-level; no dedicated invoice download page yet.
- Tax/GST calculations are intentionally not included.
