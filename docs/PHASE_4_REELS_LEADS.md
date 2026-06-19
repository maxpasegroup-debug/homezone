# Phase 4 Property Reels + Lead Generation Engine

## Summary

Phase 4 makes property reels a primary discovery and lead generation surface while staying inside the existing HomeZone architecture. It adds persisted reel interactions, broker/builder follows, lead source tracking, CTA counters, dashboard analytics, and audit logs.

This phase does not add advanced AI, CRM automation, payment changes, Studio upgrades, recommendation engines, or chat.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking. Use a non-OneDrive path such as `C:\Projects\homezone`.

## Schema Changes

Migration:

- `prisma/migrations/20260619_phase_4_reels_leads/migration.sql`

Added enums:

- `LeadSource`: `PROPERTY`, `REEL`, `SEARCH`, `DASHBOARD`
- `ContactAction`: `CALL`, `WHATSAPP`, `INQUIRY`

Extended `PropertyReel`:

- `viewsCount`
- `sharesCount`
- `leadsCount`

Extended `Property`:

- `callClicks`
- `whatsappClicks`
- `inquirySubmissions`

Extended `Lead`:

- `source` is now a controlled `LeadSource`
- `contactAction`
- `reelId`

## New Models

Only the approved minimal tables were added:

- `ReelLike`
- `SavedReel`
- `ProfileFollow`

No separate analytics tables were added. Analytics use counters, lead records, and audit logs.

## APIs Added

- `POST /api/reels/[id]/view`
- `POST /api/reels/[id]/like`
- `POST /api/reels/[id]/save`
- `POST /api/reels/[id]/share`
- `POST /api/reels/[id]/lead`
- `POST /api/profiles/[id]/follow`

Updated APIs:

- `GET /api/reels` now supports cursor pagination with `cursor` and `take`.
- `POST /api/leads` now validates `LeadSource` and `ContactAction`, and increments property CTA counters.

## Analytics Architecture

Phase 4 analytics are database-driven:

- Reel counters store views, likes, saves, shares, and leads generated.
- Property counters store call clicks, WhatsApp clicks, and inquiry submissions.
- Lead records store source and contact action.
- Audit logs store critical events for operational traceability.

This keeps Phase 4 simple and avoids premature analytics tables.

## Lead Architecture

Reel leads are created from `/api/reels/[id]/lead` with:

- `source = REEL`
- `contactAction = CALL`, `WHATSAPP`, or `INQUIRY`
- optional property connection when the reel is linked to a property
- assignment to the reel owner when available

Property leads continue through `/api/leads` with:

- `source = PROPERTY`
- CTA-specific property counter increments

## Dashboard Updates

User dashboard:

- Saved reels now use real `SavedReel` data.

Broker dashboard:

- follower count
- reel leads
- property leads
- leads by source
- reel performance summary

Builder dashboard:

- follower count
- leads by source
- leads by property
- leads by reel
- reel performance summary

Admin dashboard:

- lead source mix
- top performing reels
- top performing properties by CTA activity

## Audit Events

Phase 4 writes:

- `REEL_VIEWED`
- `REEL_LIKED`
- `REEL_SAVED`
- `REEL_SHARED`
- `LEAD_CREATED`
- `WHATSAPP_CLICKED`
- `CALL_CLICKED`
- `FOLLOWED_BROKER`
- `FOLLOWED_BUILDER`

## Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/20260619_phase_4_reels_leads/migration.sql`
- `src/app/api/leads/route.ts`
- `src/app/api/reels/route.ts`
- `src/app/api/reels/[id]/view/route.ts`
- `src/app/api/reels/[id]/like/route.ts`
- `src/app/api/reels/[id]/save/route.ts`
- `src/app/api/reels/[id]/share/route.ts`
- `src/app/api/reels/[id]/lead/route.ts`
- `src/app/api/profiles/[id]/follow/route.ts`
- `src/app/reels/page.tsx`
- `src/app/dashboard/reels/page.tsx`
- `src/app/dashboard/inquiries/page.tsx`
- `src/components/reels/reels-feed.tsx`
- `src/components/properties/contact-property-form.tsx`
- `src/components/dashboard/homezone-dashboard.tsx`
- `src/components/dashboard/broker-dashboard.tsx`
- `src/components/dashboard/builder-dashboard.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/lib/api/validation.ts`
- `src/lib/dashboard/queries.ts`
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
- `npm run build`: passed in 52.4 seconds

The test command still emits the existing Node ESM warning for `tests/phase1.test.ts`, but all tests pass.

## Known Limitations

- View/share tracking is counter-based and does not deduplicate anonymous users.
- Like/save are idempotent per authenticated profile, but unlike/unsave are not implemented.
- Follow is one-way only; unfollow is not implemented.
- No recommendation engine or personalized reel ranking is included.
- No CRM automation, lead scoring upgrade, or WhatsApp automation is included.
- Analytics are basic counters and groupings, not a dedicated warehouse/reporting system.
