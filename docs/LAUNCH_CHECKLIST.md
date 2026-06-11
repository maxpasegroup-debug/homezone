# HomeZone Production Launch Checklist

## Required Credentials

- Supabase production URL and anon key
- Supabase service role key for admin-only server tasks
- WhatsApp OTP provider credentials
- OpenAI API key
- Cloudinary or Supabase Storage configuration
- Razorpay keys and webhook secret
- PostHog analytics key
- OneSignal notification credentials

## Supabase

- Apply `supabase/migrations/001_homezone_initial_schema.sql`
- Confirm Row Level Security is enabled
- Create first admin user and set `profiles.role = 'admin'`
- Create storage buckets and confirm upload policies
- Enable Google auth
- Enable phone OTP/SMS auth
- Add production redirect URLs

## Trust And Safety

- Test listing approval flow
- Test verified broker flow
- Test verified builder flow
- Test service provider approval
- Test fake listing report workflow
- Test document upload privacy

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
- Run `npm run build`
- Run manual mobile QA on landing, search, auth, dashboard, property detail, services, pro, builder, and admin
- Deploy to Vercel
- Add custom domain
- Configure monitoring
- Seed first verified properties and providers
