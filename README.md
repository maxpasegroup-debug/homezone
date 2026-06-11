# HomeZone

Your AI Property Companion.

HomeZone is a mobile-first, AI-powered real estate platform for buying, selling, renting, investing, and marketing property.

## Phase 1

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Shadcn-compatible UI setup
- Supabase client/server helpers
- Premium landing page
- AI property search UI
- Voice search CTA
- Buy / Sell / Rent / Invest cards
- Property reels preview
- HomeZone Studio preview
- AI Property Companion section

## Phase 2

- AI Search Engine page at `/search`
- Natural-language property parsing
- Voice search CTA
- English, Malayalam, and Hindi-ready examples
- AI match cards
- AI Matchmaker flow

## Phase 3

- HomeZone Studio page at `/studio`
- Service ordering UI
- Photography, drone, walkthrough, reels, brochure, and ads services
- AI creative generator preview
- YouTube/property spotlight request
- Studio package cards
- WhatsApp verification checkpoint for paid work

## Phase 4

- AI Property Analyzer page at `/analyzer`
- Document/image upload workflow placeholders
- Property Health Report UI
- Estimated value, risk, rental, and investment metrics
- HomeZone Property Score
- Score breakdown across location, pricing, amenities, growth, demand, and documents
- Legal notes and professional disclaimer

## Phase 5

- HomeZone Pro page at `/pro`
- Broker CRM dashboard
- Lead management and status filters
- Pipeline summary cards
- AI lead scoring
- AI Lead Assistant recommendations
- WhatsApp automation controls
- Follow-up reminders
- Subscription plan cards
- WhatsApp-verified Pro account checkpoint

## Phase 6

- Builder Hub page at `/builder`
- Project showcase dashboard
- Builder analytics cards
- Lead generation overview
- Campaign management request flow
- Landing page generator UI
- Media request workflow
- AI builder report highlights
- Builder tasks and verification checkpoint

## Phase 7

- Property Services Marketplace page at `/services`
- Service categories for interiors, architects, construction, solar, loans, legal, insurance, movers, cleaning, and home automation
- Verified provider cards
- AI service matching flow
- Service request form
- Property journey service moments
- Trust and verification signals
- WhatsApp-verified quote and booking checkpoint

## Phase 8

- Investment Engine page at `/invest`
- Investment score
- Future growth potential
- Rental yield signals
- Hotspot and area analysis
- Price trend visualization
- Infrastructure impact estimates
- Investor profile and budget controls
- Investment disclaimer

## Phase 9

- HomeZone Life Map page at `/life-map`
- Life-stage questions for family, work, priority, and timeline
- Life-oriented area recommendations
- Property type recommendations
- Family, kids, commute, retirement, investment, and lifestyle signals
- Recommendation paths for buyers, investors, retirees, and parents
- Life Map score and save checkpoint

## Phase 10

- Super App Ecosystem page at `/ecosystem`
- Unified module map for AI Companion, Marketplace, Reels, Studio, Pro, Builder Hub, Services, Investment Engine, Life Map, and Analyzer
- Ecosystem metrics
- Buyer, owner, broker, and builder journey flows
- Live-product implementation roadmap
- Simplicity principles for the super app experience

## Production Backbone

- Supabase schema and RLS migration at `supabase/migrations/001_homezone_initial_schema.sql`
- Auth page at `/auth`
- Dashboard shell at `/dashboard`
- Marketplace page at `/properties`
- Property detail pages at `/properties/[id]`
- Admin control center at `/admin`
- API contracts:
  - `/api/ai/search`
  - `/api/leads`
  - `/api/service-requests`
- Launch checklist at `docs/LAUNCH_CHECKLIST.md`

## Run Locally

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` when Supabase credentials are ready.
