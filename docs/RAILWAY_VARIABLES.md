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
npm run db:push
npm run build
npm start
```
