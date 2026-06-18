# Phase 1 Handover

## Current Project Status

HomeZone Phase 1 production hardening is implemented and verified outside OneDrive at `C:\Projects\homezone`.

Builds should not be run from OneDrive because `.next/cache` may hang due to file locking.

## What Is Completed

- Protected dashboard/admin/role route middleware.
- Security headers in middleware.
- Admin access for `ADMIN` and `SUPER_ADMIN`.
- Demo login disabled in production.
- `BUYER` to `USER` migration strategy.
- `LEASE` included in property intent enum.
- OTP send/verify foundation at:
  - `/api/auth/otp/send`
  - `/api/auth/otp/verify`
- Phone verification fixed so profile phone entry does not auto-verify.
- Sensitive API rate limits.
- Upload MIME, size, and folder validation.
- Centralized API response/error helpers.
- Zod validation for mutation APIs.
- Critical action audit logging.
- Environment validation helper.
- Production demo marketplace fallback disabled.
- Rupee encoding fixed.
- Basic Phase 1 tests.
- CI workflow.
- Prisma migration file.

## What Is Pending

- Real WhatsApp/SMS OTP provider implementation.
- Redis-backed distributed rate limiting.
- Full Sentry SDK integration.
- Dependency vulnerability review from `npm audit`.
- More E2E coverage for real browser flows.

## Manual Setup Required

Set these before production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OTP_PEPPER`
- `WHATSAPP_OTP_PROVIDER`
- `WHATSAPP_OTP_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `UPLOAD_MAX_BYTES`
- `SENTRY_DSN` if Sentry is enabled

Recommended production values:

- `DEMO_LOGIN_ENABLED=false`
- `OTP_DEV_LOG_CODES=false`
- `HOMEZONE_ENFORCE_ENV=true`

## Commands Required After Git Pull

Run from a non-OneDrive project path:

```bash
npm install
npx prisma generate
npm run db:migrate
npm run typecheck
npm run lint
npm run test
npm run build
```

For first-time local development without migrations:

```bash
npm run db:push
```

## Verification Snapshot

Executed from `C:\Projects\homezone`:

- `npm install`: passed
- `npx prisma generate`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed
