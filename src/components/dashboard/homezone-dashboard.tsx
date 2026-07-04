import Link from "next/link";
import {
  Bookmark,
  Eye,
  Heart,
  Home,
  MapPin,
  MessageSquare,
  PlaySquare,
  Search,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardHeader,
  DashboardSection,
  EmptyState,
  MetricCard
} from "@/components/dashboard/dashboard-primitives";
import { PropertyCard } from "@/components/properties/property-card";
import { VerificationBadge } from "@/components/trust/verification-badge";
import type { getUserDashboardData } from "@/lib/dashboard/queries";

type UserDashboardData = Awaited<ReturnType<typeof getUserDashboardData>>;

const continueLinks = [
  ["AI advisor", "/dashboard/ai"],
  ["Business AI", "/dashboard/business-ai"],
  ["Buy homes", "/properties?purpose=BUY"],
  ["Rent homes", "/properties?purpose=RENT"],
  ["Investment options", "/properties?purpose=INVEST"]
] as const;

export function HomeZoneDashboard({
  data
}: {
  data: UserDashboardData;
  email?: string | null;
}) {
  const profile = data.profile;
  const firstName = profile?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Buyer Dashboard"
        subtitle="Search, save, compare, shortlist, and continue your property discovery from one calm workspace."
        title={`Welcome, ${firstName}`}
      />

      <DashboardSection eyebrow="AI Property Search" title="Tell HomeZone what you need">
        <form action="/properties" className="grid gap-3 lg:grid-cols-[1fr_0.35fr_auto]">
          <div className="flex h-14 items-center gap-3 rounded-2xl bg-muted px-4">
            <Search className="h-5 w-5 text-violet-700" />
            <input
              className="w-full bg-transparent font-semibold outline-none"
              name="keyword"
              placeholder="Villa under 80 lakh in Kochi"
            />
          </div>
          <input
            className="h-14 rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            defaultValue={profile?.city ?? ""}
            name="city"
            placeholder="City"
          />
          <Button className="h-14" type="submit">
            Search properties
          </Button>
        </form>
      </DashboardSection>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Heart}
          label="Saved properties"
          value={data.counts.savedProperties}
        />
        <MetricCard
          icon={Eye}
          label="Recently viewed"
          value={data.counts.recentViews}
        />
        <MetricCard
          icon={Bookmark}
          label="Shortlists"
          value={data.counts.shortlists}
        />
        <MetricCard
          icon={MessageSquare}
          label="Owner contacts"
          value={data.counts.inquiries}
        />
        <MetricCard
          icon={PlaySquare}
          label="Saved reels"
          value={data.counts.savedReels}
        />
      </section>

      <DashboardSection eyebrow="Recommended Properties" title="Good matches to start with">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {data.recommendedProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
          {!data.recommendedProperties.length ? (
            <EmptyState
              text="Browse the marketplace to help HomeZone tune your recommendations."
              title="No recommendations yet"
            />
          ) : null}
        </div>
      </DashboardSection>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Recently Viewed" title="Continue from where you stopped">
          <div className="grid gap-4">
            {data.recentViews.map((property) => (
              <Link className="rounded-2xl bg-muted p-4 transition hover:bg-violet-50" href={`/properties/${property.id}`} key={property.id}>
                <h3 className="font-bold">{property.title}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-violet-700">
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {property.priceLabel} / {property.area}
                </p>
              </Link>
            ))}
            {!data.recentViews.length ? (
              <EmptyState
                text="Open a property detail page and it will appear here automatically."
                title="No viewed properties yet"
              />
            ) : null}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Saved Properties" title="Your current shortlist">
          <div className="space-y-3">
            {data.savedProperties.map((item) => (
              <div className="rounded-2xl bg-muted p-4" key={item.propertyId}>
                <h3 className="font-bold">{item.property.title}</h3>
                <div className="mt-2">
                  <VerificationBadge
                    entity="property"
                    status={item.property.verificationStatus}
                  />
                </div>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[item.property.locality, item.property.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <Button asChild className="mt-4" size="sm" variant="outline">
                  <Link href={`/properties/${item.property.id}`}>View property</Link>
                </Button>
              </div>
            ))}
            {!data.savedProperties.length ? (
              <EmptyState
                text="Tap Save on any property card to keep it here."
                title="No saved properties"
              />
            ) : null}
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/saved">Manage saved properties</Link>
            </Button>
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Investment Picks" title="Properties with investment intent">
          <div className="grid gap-4">
            {data.investmentPicks.map((property) => (
              <Link className="rounded-2xl bg-muted p-4 transition hover:bg-violet-50" href={`/properties/${property.id}`} key={property.id}>
                <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                  <TrendingUp className="h-4 w-4" />
                  {property.score}/100 score
                </p>
                <h3 className="mt-2 font-bold">{property.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {property.location} / {property.priceLabel}
                </p>
              </Link>
            ))}
            {!data.investmentPicks.length ? (
              <EmptyState
                text="Investment properties will appear here when available."
                title="No investment picks yet"
              />
            ) : null}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Nearby Projects" title={profile?.city ? `Options around ${profile.city}` : "Popular nearby options"}>
          <div className="grid gap-4">
            {data.nearbyProjects.map((property) => (
              <Link className="rounded-2xl bg-muted p-4 transition hover:bg-violet-50" href={`/properties/${property.id}`} key={property.id}>
                <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                  <Home className="h-4 w-4" />
                  {property.type}
                </p>
                <h3 className="mt-2 font-bold">{property.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {property.location} / {property.priceLabel}
                </p>
              </Link>
            ))}
            {!data.nearbyProjects.length ? (
              <EmptyState
                text="Set your city in onboarding or browse properties to discover nearby matches."
                title="No nearby projects yet"
              />
            ) : null}
          </div>
        </DashboardSection>
      </section>

      <DashboardSection eyebrow="Property Reels" title="Video-first discovery">
        <div className="space-y-3">
          {data.savedReels.map((item) => (
            <div className="rounded-2xl bg-muted p-4" key={item.reelId}>
              <h3 className="font-bold">{item.reel.title}</h3>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {item.reel.property?.title ?? "Property reel"}
              </p>
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href="/reels">Watch reels</Link>
              </Button>
            </div>
          ))}
          {!data.savedReels.length ? (
            <EmptyState
              text="Watch reels to understand a property before visiting."
              title="No saved reels yet"
            />
          ) : null}
        </div>
      </DashboardSection>

      <DashboardSection eyebrow="Continue Browsing" title="Pick up your search">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {continueLinks.map(([label, href]) => (
            <Link className="rounded-2xl bg-muted p-5 font-bold transition hover:bg-violet-50" href={href as never} key={href}>
              <Sparkles className="mb-4 h-5 w-5 text-violet-700" />
              {label}
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}
