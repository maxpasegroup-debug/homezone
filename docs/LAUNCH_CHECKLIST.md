# HomeZone Production Launch Checklist

## Required Credentials

- Railway PostgreSQL `DATABASE_URL`
- Auth.js `AUTH_SECRET`
- `NEXTAUTH_URL`
- Google OAuth client ID and secret
- WhatsApp OTP provider credentials
- OpenAI API key
- Cloudinary credentials
- Razorpay keys and webhook secret
- PostHog analytics key
- OneSignal notification credentials

## Railway PostgreSQL

- Add `DATABASE_URL`
- Run `npx prisma generate`
- Run `npm run db:push` for first launch
- Use `npm run db:migrate` for future production migrations
- Create the first admin profile and set `Profile.role = ADMIN`

## Auth.js

- Set `AUTH_SECRET`
- Set `NEXTAUTH_URL`
- Configure Google OAuth redirect URL:
  `/api/auth/callback/google`
- Connect WhatsApp OTP provider for phone verification
- Confirm protected actions redirect to `/auth`

## Trust And Safety

- Test listing approval flow
- Test verified broker flow
- Test verified builder flow
- Test service provider approval
- Test fake listing report workflow
- Test document upload privacy in Cloudinary or selected storage provider

## Payments

- Create Razorpay plans for Pro, Studio, Builder, and services
- Configure webhook endpoint
- Test successful payment
- Test failed payment
- Test subscription renewal
- Test refund/admin reconciliation

## AI

- Enable AI search parsing
- Enable property summary generation
- Enable analyzer reports
- Enable studio creative generation
- Enable lead scoring
- Add rate limits and abuse protection

## Go-Live

- Run `npm install`
- Run `npx prisma generate`
- Run `npm run db:push`
- Run `npm run build`
- Run mobile QA on landing, search, auth, dashboard, property detail, services, pro, builder, and admin
- Deploy to Railway
- Add custom domain
- Configure monitoring
- Seed first verified properties and providers
