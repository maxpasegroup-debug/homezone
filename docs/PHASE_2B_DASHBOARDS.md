# Phase 2B Dashboard Foundation

## Summary

Phase 2B adds production-ready dashboard foundations for USER, BROKER, BUILDER, and ADMIN roles without rebuilding existing modules or starting CRM automation, WhatsApp automation, campaign systems, payments, AI upgrades, Studio upgrades, or redesign work.

Dashboards are server-rendered, role-protected, mobile-first, and database-driven using existing models only.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking. Use a non-OneDrive path such as `C:\Projects\homezone`.

## Dashboard Architecture

- `/dashboard` is the USER dashboard entry point.
- `/broker` is the BROKER dashboard entry point.
- `/builder` is the BUILDER dashboard entry point.
- `/admin` remains the ADMIN dashboard entry point.
- Dashboard pages use server-side Prisma queries through `src/lib/dashboard/queries.ts`.
- Role checks use `src/lib/auth/dashboard.ts`.
- ADMIN and SUPER_ADMIN may view broker and builder dashboards for support/testing.
- Normal users are redirected away from broker, builder, and admin dashboards.
- Loading states are provided with route-level `loading.tsx` files.

## Files Changed

- `src/app/admin/page.tsx`
- `src/app/admin/loading.tsx`
- `src/app/broker/page.tsx`
- `src/app/broker/loading.tsx`
- `src/app/builder/page.tsx`
- `src/app/builder/loading.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/loading.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/dashboard/broker-dashboard.tsx`
- `src/components/dashboard/builder-dashboard.tsx`
- `src/components/dashboard/dashboard-loading.tsx`
- `src/components/dashboard/dashboard-primitives.tsx`
- `src/components/dashboard/homezone-dashboard.tsx`
- `src/lib/auth/dashboard.ts`
- `src/lib/dashboard/queries.ts`
- `docs/PHASE_2B_DASHBOARDS.md`

## APIs Used

No new dashboard APIs were added. Phase 2B uses server-side Prisma queries and existing app routes.

Existing related APIs remain in place:

- `/api/properties`
- `/api/leads`
- `/api/reels`
- `/api/properties/[id]/save`
- `/api/admin/properties/[id]/moderate`
- `/api/admin/reels/[id]/moderate`

## New APIs Added

None.

## Role Permissions

- USER: can access `/dashboard` and existing dashboard subpages.
- BROKER: can access `/broker` and general dashboard pages.
- BUILDER: can access `/builder` and general dashboard pages.
- ADMIN: can access `/admin`, `/broker`, and `/builder`.
- SUPER_ADMIN: can access `/admin`, `/broker`, and `/builder`.
- Normal USER accounts cannot access `/broker`, `/builder`, or `/admin`.

## Database Models Used

- `Profile`
- `Property`
- `SavedProperty`
- `Lead`
- `PropertyReel`
- `BuilderProject`
- `AuditLog`

No Prisma migration was required for Phase 2B.

## Dashboard Coverage

### USER

- Profile
- Saved Properties
- Saved Reels empty state
- My Inquiries
- My Listings
- Verification Status
- Recent Activity

### BROKER

- Listings
- Leads
- Saved Leads empty state
- Analytics Summary
- Verification Status
- Profile

### BUILDER

- Projects
- Inventory
- Leads
- Media
- Analytics Summary
- Verification Status
- Profile

### ADMIN

- Users
- Brokers
- Builders
- Properties
- Verification Queue
- Reports
- Analytics
- Existing moderation actions remain available.

## Known Limitations

- Saved Reels are shown as a real empty state because no `SavedReel` persistence model exists yet.
- Saved Leads are shown as a real empty state because no `SavedLead` persistence model exists yet.
- Broker lead assignment depends on either `Lead.assignedTo` or leads attached to broker-owned properties.
- Builder media summary uses existing property media/reel data only.
- Builder projects use the existing `BuilderProject` model and do not add campaign workflows.
- Dashboard analytics are basic counts; advanced reporting belongs in a later phase.

## Verification

Run from `C:\Projects\homezone`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Executed from `C:\Projects\homezone`:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed in 71.1 seconds

Note: the test script still emits the existing Node ESM warning, but all tests pass.

## Phase 2C Recommendation

- Add deeper dashboard detail pages and pagination.
- Add persisted SavedReel and SavedLead models if product scope confirms them.
- Add dashboard E2E tests for role redirects and empty states.
- Add admin user management actions with audit logs.
- Add advanced analytics after core marketplace data volume exists.
