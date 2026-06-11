# Railway Variables

Use Railway PostgreSQL as the production database.

## Required To Boot

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

`DIRECT_URL` can be the same as `DATABASE_URL` for a simple Railway setup.

## Login

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## AI

```env
OPENAI_API_KEY=
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
