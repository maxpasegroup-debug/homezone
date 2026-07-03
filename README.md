# HomeZone

Your AI Property Companion.

HomeZone is a mobile-first real estate ecosystem for property discovery, listing, lead management, studio services, broker CRM, builder operations, and service-provider workflows. The platform uses a PostgreSQL-first architecture with Cloudinary media, Auth.js authentication, Prisma data access, and Razorpay-ready payments.

## Core Modules

- Public landing, marketplace, property details, reels, voice, and AI search surfaces
- Buyer dashboard with saved properties, recent views, shortlists, recommendations, and comparison
- Property owner dashboard with listings, media, documents, verification, leads, analytics, and upgrades
- Lead lifecycle CRM with notes, tasks, site visits, timeline, notifications, and pipeline stages
- Admin operations for users, listings, reports, moderation, analytics, and Studio oversight
- HomeZone Studio order workflow with payments, assignment, production, delivery, revisions, and approvals
- Broker Pro CRM with team, assignments, calendar, commissions, automations, plans, and analytics
- Builder Enterprise with projects, towers, units, bookings, campaigns, reports, team, and subscriptions
- Services Marketplace with providers, quotes, bookings, payments, reviews, and provider dashboard

## Platform Foundation

- Next.js App Router with TypeScript and Tailwind CSS
- Prisma schema for Railway PostgreSQL
- Auth.js with Prisma adapter
- Cloudinary signed upload workflow
- Razorpay order, verification, webhook, and entitlement foundations
- Shared Zod validation and API response helpers
- Unified audit log and platform-level infrastructure for reports, notifications, permissions, pagination, webhooks, and rate limiting

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` with PostgreSQL, Auth.js, Cloudinary, Razorpay, OpenAI, and provider credentials as needed.

## Validation

```bash
npx prisma generate
npx prisma validate
npm run typecheck
npm run lint
npm run build
```
