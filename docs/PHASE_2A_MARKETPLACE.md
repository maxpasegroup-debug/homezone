# Phase 2A Marketplace Foundation

## Summary

Phase 2A adds the global marketplace foundation without rebuilding the product or starting dashboards, payments, CRM, AI upgrades, Studio upgrades, UAE landing pages, or internationalization.

The marketplace now supports the final property purposes `BUY`, `RENT`, `LEASE`, and `INVEST`; global location fields; validated currencies; property categories; and database-driven marketplace filters.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking. Use a non-OneDrive path such as `C:\Projects\homezone`.

## Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/20260618_phase_2a_marketplace_foundation/migration.sql`
- `src/app/api/properties/route.ts`
- `src/app/properties/page.tsx`
- `src/components/properties/property-form.tsx`
- `src/components/ai-search-engine.tsx`
- `src/lib/ai-search.ts`
- `src/lib/ai/homezone-ai.ts`
- `src/lib/api/validation.ts`
- `src/lib/properties/queries.ts`
- `src/lib/property-data.ts`
- `tests/phase1.test.ts`

## Prisma Changes

- Added `PropertyCategory` enum:
  - `RESIDENTIAL`
  - `COMMERCIAL`
  - `LAND`
  - `INDUSTRIAL`
  - `AGRICULTURAL`
  - `HOSPITALITY`
  - `LUXURY`
- Added `Property.category` with default `RESIDENTIAL`.
- Added `Property.timezone`.
- Kept `Property.currency` as a string for future expansion.
- App validation currently allows only:
  - `INR`
  - `AED`
  - `USD`
  - `GBP`
  - `EUR`
- Added indexes for global marketplace filtering:
  - country/state/city
  - intent
  - category
  - currency
  - price
  - bedrooms
  - bathrooms
  - verified
  - latitude/longitude

## Marketplace Filters

Database-driven filters now support:

- keyword
- country
- state
- city
- locality
- purpose
- category
- min price
- max price
- bedrooms
- bathrooms
- verified only

The public marketplace page reads query-string filters and passes them into the Prisma query layer.

## Kerala-UAE-Global Foundation

Phase 2A avoids hardcoding Kerala-only or UAE-only behavior. Country, state, city, locality, timezone, coordinates, currency, purpose, and category are stored as global fields so Kerala and UAE can be supported as data, not as separate code paths.

## Verification Commands

Run from `C:\Projects\homezone`:

```bash
npx prisma generate
npm run typecheck
npm run lint
npm run test
npm run build
```

## Check Results

Executed from `C:\Projects\homezone`:

- `npx prisma generate`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed in 48.7 seconds

## Remaining Risks

- Currency is validation-limited in the app but not database-constrained yet.
- Keyword search uses Prisma `contains`; full-text search can be added later.
- Price filtering does not convert between currencies.
- Coordinates are stored but no map/geospatial search is implemented yet.
- Search UI now receives DB-backed matches from the existing search endpoint, but advanced search ranking is not part of Phase 2A.
