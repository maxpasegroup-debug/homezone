# Phase 2C Verification & Trust Foundation

## Summary

Phase 2C adds HomeZone's verification and trust foundation. It extends existing models only, keeps the backward-compatible `Property.verified` boolean, and adds formal verification workflows for properties, brokers, and builders.

No payments, CRM automation, AI upgrades, Studio upgrades, saved reels, saved leads, or full KYC document upload were added.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking. Use a non-OneDrive path such as `C:\Projects\homezone`.

## Schema Changes

Migration:

- `prisma/migrations/20260618_phase_2c_verification_trust/migration.sql`

Added enums:

- `PropertyVerificationStatus`
  - `PENDING`
  - `VERIFIED`
  - `REJECTED`
  - `EXPIRED`
- `ProfileVerificationStatus`
  - `PENDING`
  - `VERIFIED`
  - `REJECTED`
  - `SUSPENDED`

Extended `Property`:

- `verificationStatus`
- `verifiedAt`
- `verifiedBy`
- `verificationNotes`

Extended `Profile`:

- `verificationStatus`
- `verifiedAt`
- `verifiedBy`
- `verificationNotes`

The existing `Property.verified` boolean remains for marketplace filtering and backward compatibility.

## Verification Workflow

### Property

- Approve:
  - `verificationStatus = VERIFIED`
  - `verified = true`
  - `verifiedAt = now`
  - `verifiedBy = admin profile id`
  - `status = PUBLISHED`
- Reject:
  - `verificationStatus = REJECTED`
  - `verified = false`
  - `status = REJECTED`
  - `verificationNotes` saved
- Expire:
  - `verificationStatus = EXPIRED`
  - `verified = false`
  - `status = ARCHIVED`
  - `verificationNotes` saved

### Broker and Builder

Broker and builder verification uses `Profile.verificationStatus` and metadata:

- Approve: `VERIFIED`
- Reject: `REJECTED`
- Suspend: `SUSPENDED`
- `verifiedAt`, `verifiedBy`, and `verificationNotes` are saved for every action.

## Admin Actions

Admin-only verification APIs:

- `PATCH /api/admin/properties/[id]/verify`
- `PATCH /api/admin/profiles/[id]/verify`

Only `ADMIN` and `SUPER_ADMIN` can use these actions. Normal users, brokers, and builders are blocked by RBAC.

The admin dashboard now shows:

- Pending property verifications
- Pending broker verifications
- Pending builder verifications
- Pending Verifications metric
- Verified Properties metric
- Verified Brokers metric
- Verified Builders metric

## Audit Events

Every verification action writes an audit log through `auditLog()`:

- `PROPERTY_APPROVED`
- `PROPERTY_REJECTED`
- `PROPERTY_EXPIRED`
- `BROKER_VERIFIED`
- `BROKER_REJECTED`
- `BROKER_SUSPENDED`
- `BUILDER_VERIFIED`
- `BUILDER_REJECTED`
- `BUILDER_SUSPENDED`

## Verification Badges

Reusable badge component:

- `src/components/trust/verification-badge.tsx`

Badges were added to:

- Public marketplace property cards
- Property detail page
- User dashboard property surfaces
- Broker dashboard listings and profile verification status
- Builder dashboard inventory and profile verification status

## Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/20260618_phase_2c_verification_trust/migration.sql`
- `src/app/admin/page.tsx`
- `src/app/api/admin/properties/[id]/verify/route.ts`
- `src/app/api/admin/profiles/[id]/verify/route.ts`
- `src/app/dashboard/listings/page.tsx`
- `src/app/dashboard/saved/page.tsx`
- `src/app/properties/page.tsx`
- `src/app/properties/[id]/page.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/verification-actions.tsx`
- `src/components/dashboard/broker-dashboard.tsx`
- `src/components/dashboard/builder-dashboard.tsx`
- `src/components/dashboard/homezone-dashboard.tsx`
- `src/components/trust/verification-badge.tsx`
- `src/lib/api/validation.ts`
- `src/lib/dashboard/queries.ts`
- `src/lib/properties/queries.ts`
- `src/lib/trust/verification.ts`
- `tests/phase1.test.ts`
- `docs/PHASE_2C_VERIFICATION.md`

## Known Limitations

- No full KYC document upload is included in Phase 2C.
- No automated expiry scheduler is included; expiry is an admin action.
- Existing listing moderation remains separate from formal trust verification.
- Broker and builder verification is stored on `Profile`, so future organization/team verification may require a dedicated business entity model.
- `verifiedBy` stores the admin profile id as text without a Prisma relation to avoid unnecessary schema coupling in this phase.

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
- `npm run build`: passed in 87.9 seconds

Note: the test script still emits the existing Node ESM warning, but all tests pass.

## Phase 3 Recommendation

- Add KYC/document upload and review.
- Add admin filtering/search for verification queues.
- Add verification history timeline per entity.
- Add automated expiry reminders and scheduled expiry jobs.
- Add E2E tests for admin verification actions and RBAC redirects.
