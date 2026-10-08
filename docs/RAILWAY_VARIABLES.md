# Railway Variables

Use Railway PostgreSQL as the production database.

## Required To Boot

```env
DATABASE_URL=
AUTH_SECRET=
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Railway PostgreSQL only needs `DATABASE_URL` for this Prisma setup.

## Login

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Optional demo mobile login:

```env
DEMO_MOBILE_LOGIN_ENABLED=true
DEMO_MOBILE_PHONE=8089239823
DEMO_MOBILE_OTP=2255
```

Use only for local testing or a controlled demo environment. With the values above, the demo mobile credentials are:

```text
Phone: 8089239823
OTP: 2255
```

## Email Magic Links

Set these if you want passwordless email sign-in.

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=no-reply@your-domain.com
```

Use port `465` for secure SMTP, or `587` for STARTTLS providers.

## AI

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

## WhatsApp OTP

```env
WHATSAPP_OTP_PROVIDER=
WHATSAPP_OTP_API_KEY=
```

## Media

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Payments

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

## Analytics And Notifications

```env
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
ONESIGNAL_APP_ID=
```

## Railway Deploy Commands

```bash
npm install
npm run db:migrate
npm run build
npm start
```

## Deploy this repository

The frontend and API routes are one Next.js service. Deploy the directory that
contains `package.json`, `prisma`, and `railway.json`; do not deploy `src/app/api`
on its own. When the repository root contains the inner `homezone` directory,
set the Railway service Root Directory to `/homezone` and its configuration
file path to `/homezone/railway.json`.

Add a PostgreSQL service in the same Railway project. In the application service,
set `DATABASE_URL` to a reference to that database service's `DATABASE_URL`, for
example `${{Postgres.DATABASE_URL}}` (use the actual database service name).
Generate a unique `AUTH_SECRET`, generate a public domain for the application,
and set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to that HTTPS URL. Set
`AUTH_TRUST_HOST=true` for authentication behind Railway's proxy, and disable
demo logins with `DEMO_LOGIN_ENABLED=false` and `DEMO_MOBILE_LOGIN_ENABLED=false`.

The committed `railway.json` builds the app, applies committed Prisma migrations
before deployment, and starts Next.js on all network interfaces. Next.js uses
Railway's `PORT` environment variable. For a database with existing tables,
inspect migration history before deploying; do not reset it or force schema
changes to resolve migration errors.

For local access to the Railway database, use its `DATABASE_PUBLIC_URL` as the
local `.env.local` value of `DATABASE_URL`. Never commit connection credentials.
