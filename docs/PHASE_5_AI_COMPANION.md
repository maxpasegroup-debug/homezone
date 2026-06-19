# Phase 5 AI Property Companion V1

## Summary

Phase 5 adds a DB-grounded AI companion layer for property search, recommendations, area suggestions, comparison, and lead message drafts. It reuses existing OpenAI infrastructure, marketplace queries, audit logs, and the `AiReport` model for history.

No autonomous agents, CRM automation, Studio upgrades, payment changes, or UI redesigns were added.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking. Use a non-OneDrive path such as `C:\Projects\homezone`.

## Prisma Changes

No Prisma migration was required.

AI history reuses `AiReport`:

- `userId`
- `propertyId`
- `reportType`
- `input`
- `output`
- `createdAt`

Report types used:

- `AI_SEARCH`
- `AI_RECOMMENDATION`
- `AI_COMPARISON`
- `AI_AREA_QUERY`
- `AI_LEAD_ASSISTANT`
- `AI_CHAT`

## AI Architecture

Core service:

- `src/lib/ai/companion.ts`

The architecture is database-grounded:

- property search results come from `getMarketplaceProperties()`
- property comparison uses real `Property` records
- recommendations use saved properties, inquiries, profile city, and marketplace listings
- area recommendations use grouped `Property` data only
- lead assistant creates draft text only

OpenAI is used only for explanation, summarization, comparison wording, and message drafts.

## APIs

Updated:

- `POST /api/ai/search`
- `POST /api/ai/assistant`

Added:

- `POST /api/ai/recommendations`
- `POST /api/ai/areas`
- `POST /api/ai/compare`
- `POST /api/ai/lead-assistant`
- `GET /api/ai/history`

## OpenAI Usage

Existing helper reused:

- `generateOpenAIText()` in `src/lib/ai/homezone-ai.ts`

If OpenAI is unavailable or `OPENAI_API_KEY` is missing, Phase 5 returns grounded fallback explanations or drafts. It does not invent property records, prices, trends, or area claims.

## Multilingual Foundation

Supported:

- English
- Malayalam

Language is detected using Malayalam Unicode ranges when set to `AUTO`. Users can also request Malayalam explicitly.

## Audit Events

Added:

- `AI_SEARCH`
- `AI_RECOMMENDATION`
- `AI_COMPARISON`
- `AI_AREA_QUERY`
- `AI_LEAD_ASSISTANT`

## Files Changed

- `src/lib/ai/companion.ts`
- `src/lib/ai/companion-utils.ts`
- `src/app/api/ai/search/route.ts`
- `src/app/api/ai/assistant/route.ts`
- `src/app/api/ai/recommendations/route.ts`
- `src/app/api/ai/areas/route.ts`
- `src/app/api/ai/compare/route.ts`
- `src/app/api/ai/lead-assistant/route.ts`
- `src/app/api/ai/history/route.ts`
- `src/lib/api/validation.ts`
- `src/components/ai-search-engine.tsx`
- `src/components/ai/floating-ai-companion.tsx`
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
- `npm run build`: passed in 48 seconds

## Known Limitations

- AI recommendations are simple rule-based matching plus AI explanation.
- Area recommendations are limited by available HomeZone listing data.
- Viewed-property history is only available where audit events exist.
- Malayalam support is foundational, not full localization.
- Lead assistant drafts messages only; there is no sending or automation.
