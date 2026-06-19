# Phase 6 Launch Readiness

## Summary

Phase 6 prepares HomeZone for Kerala and UAE launch readiness without redesigning the UI, adding CRM, mobile apps, vector search, external analytics, or major new marketplace features.

The work focuses on production intelligence, DB-grounded AI improvements, marketplace ranking, AI observability, launch health checks, Malayalam fallback cleanup, and dashboard performance summaries.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking. Use a non-OneDrive path such as `C:\Projects\homezone`.

## Prisma Changes

No Prisma migration was required.

Phase 6 reuses:

- `AuditLog`
- `AiReport`
- `Property` counters
- `PropertyReel` counters
- `SavedProperty`
- `Lead`
- payment and subscription data

## User Intelligence

Tracked with existing persistence:

- viewed properties via `PROPERTY_VIEWED`
- viewed reels via existing `REEL_VIEWED`
- search history via `SEARCH_PERFORMED`
- AI search history via `AiReport`
- favorite locations inferred from profile city, saved properties, inquiries, property views, and searches

## AI Improvements

AI recommendations are still database-grounded.

Signals now include:

- viewed properties
- saved properties
- inquiries
- search history
- AI search history
- profile location
- reel engagement

OpenAI remains limited to explanation and wording. Property results still come from real database queries.

## Search Ranking

Marketplace results are filtered by Prisma first, then ranked using:

- verified status
- active premium listing
- active featured listing
- property CTA engagement
- lead and reel counts
- freshness
- existing property score

No external search engine or vector database was added.

## AI Observability

Admin metrics now include:

- AI searches
- AI recommendations
- AI comparisons
- AI area queries
- AI lead assistant usage
- AI failures logged through `AI_USED`

## Launch Readiness Checks

Admin launch health summary checks:

- missing property images
- incomplete listings
- expired featured listings
- expired premium listings
- broken media references

## Dashboard Improvements

Admin:

- AI usage summary
- launch readiness summary

Broker:

- property views
- call clicks
- WhatsApp clicks
- inquiry submissions

Builder:

- property views
- call clicks
- WhatsApp clicks
- inquiry submissions
- existing project, lead, reel, and follower metrics

## Audit Events

Added or extended:

- `PROPERTY_VIEWED`
- `SEARCH_PERFORMED`
- `AI_USED`
- `RECOMMENDATION_VIEWED`

Existing events reused:

- `REEL_VIEWED`
- `AI_SEARCH`
- `AI_RECOMMENDATION`
- `AI_COMPARISON`
- `AI_AREA_QUERY`
- `AI_LEAD_ASSISTANT`

## Files Changed

- `src/app/api/properties/[id]/view/route.ts`
- `src/app/api/ai/search/route.ts`
- `src/app/api/ai/recommendations/route.ts`
- `src/app/api/ai/areas/route.ts`
- `src/app/api/ai/compare/route.ts`
- `src/app/api/ai/assistant/route.ts`
- `src/app/api/ai/lead-assistant/route.ts`
- `src/app/properties/[id]/page.tsx`
- `src/components/properties/property-view-tracker.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/dashboard/broker-dashboard.tsx`
- `src/components/dashboard/builder-dashboard.tsx`
- `src/lib/ai/companion.ts`
- `src/lib/ai/companion-utils.ts`
- `src/lib/dashboard/queries.ts`
- `src/lib/launch/readiness.ts`
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

Executed from `C:\Projects\homezone`:

- `npx prisma generate`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed in 46.2 seconds

## Known Limitations

- Favorite locations are inferred from existing activity rather than stored as a separate preference table.
- Broken media checks validate URL shape only; they do not fetch remote assets.
- AI observability is count-based, not a full tracing system.
- Malayalam polish covers touched AI fallback and parser surfaces, not full app localization.
- Ranking is in-app ranking over Prisma results, not full-text search or vector ranking.
