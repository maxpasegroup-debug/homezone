# Smoke Tests

Run these after deployment and after any restore.

## Login

- Open production URL.
- Sign in with Google.
- Confirm `/dashboard` loads.
- Confirm demo login is unavailable in production.

## Property Creation

- Create a listing from `/dashboard/listings/new`.
- Confirm it enters review state.
- Upload valid media.
- Confirm invalid MIME/oversized uploads fail.

## Property Verification

- Sign in as ADMIN or SUPER_ADMIN.
- Open `/admin`.
- Approve a pending property.
- Confirm verified badge appears publicly.

## Reels

- Create a property reel.
- Confirm reel appears after moderation.
- Confirm view, like, save, share actions work.

## Leads

- Submit inquiry from a property.
- Submit inquiry from a reel.
- Confirm broker or builder dashboard lead counts update.

## Payments

- Start Razorpay checkout for featured or premium listing.
- Confirm success only after signature verification.
- Confirm webhook events do not duplicate payment success.

## AI Search

- Search: `Show villas in Kochi under ₹1 Cr`.
- Search: `Dubai apartments under AED 1M`.
- Confirm results are database-backed and do not invent listings.
