# Deployment Readiness

## Required Steps

- Run `npm ci`
- Run `npx prisma generate`
- Run `npx prisma migrate deploy`
- Run `npm run ops:env`
- Run `npm run build`
- Create the first admin with `npm run ops:create-admin`

## Environment Setup

Required launch variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `OTP_PEPPER`
- `WHATSAPP_OTP_PROVIDER`
- `WHATSAPP_OTP_API_KEY`
- `SENTRY_DSN`

## Provider Setup

- Google OAuth callback must match production `NEXTAUTH_URL`.
- Cloudinary credentials must point to the production cloud.
- Razorpay webhook secret must match the configured webhook endpoint.
- OpenAI key must be scoped and monitored.
- OTP provider credentials must be production credentials, not sandbox values.

## OneDrive Warning

Do not run production builds from OneDrive. Use a non-OneDrive path such as `C:\Projects\homezone`.
