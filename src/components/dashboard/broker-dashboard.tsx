import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  Home,
  MessageSquare,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardHeader,
  DashboardSection,
  DetailRow,
  EmptyState,
  MetricCard
} from "@/components/dashboard/dashboard-primitives";
import { ListingBadges } from "@/components/payments/listing-badges";
import { PaymentButton } from "@/components/payments/payment-button";
import { PaymentHistory } from "@/components/payments/payment-history";
import { VerificationBadge } from "@/components/trust/verification-badge";
import type { getBrokerDashboardData } from "@/lib/dashboard/queries";

type BrokerDashboardData = Awaited<ReturnType<typeof getBrokerDashboardData>>;

export function BrokerDashboard({ data }: { data: BrokerDashboardData }) {
  const profile = data.profile;

  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Broker Dashboard"
        subtitle="Manage your listings, property leads, verification status, and broker profile with live marketplace data."
        title="Broker workspace"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={Home}
          label="Listings"
          value={data.analytics.totalListings}
        />
        <MetricCard
          icon={MessageSquare}
          label="Leads"
          value={data.analytics.leadCount}
        />
        <MetricCard
          icon={Users}
          label="Followers"
          note={`+${data.analytics.followersGained} / 30d`}
          value={data.analytics.followerCount}
        />
        <MetricCard
          icon={Bookmark}
          label="Reported reels"
          value={data.analytics.reportedReels}
        />
        <MetricCard
          icon={BarChart3}
          label="Published"
          value={data.analytics.publishedCount}
        />
        <MetricCard
          icon={BadgeCheck}
          label="Verification"
          value={profile?.verificationStatus ?? "PENDING"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <DashboardSection eyebrow="Listings" title="Broker-owned listings">
          <div className="space-y-3">
            {data.listings.map((listing) => (
              <div className="rounded-2xl bg-muted p-4" key={listing.id}>
                <p className="text-xs font-bold text-violet-700">
                  {listing.status.replaceAll("_", " ")}
                </p>
                <div className="mt-2">
                  <VerificationBadge
                    entity="property"
                    status={listing.verificationStatus}
                  />
                </div>
                <div className="mt-2">
                  <ListingBadges
                    featured={listing.featured}
                    featuredUntil={listing.featuredUntil}
                    premium={listing.premium}
                    premiumUntil={listing.premiumUntil}
                  />
                </div>
                <h3 className="mt-2 font-bold">{listing.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[listing.locality, listing.city].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {listing._count.leads} leads
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PaymentButton
                    label="Feature"
                    product="FEATURED_LISTING"
                    propertyId={listing.id}
                    variant="outline"
                  />
                  <PaymentButton
                    label="Premium"
                    product="PREMIUM_LISTING"
                    propertyId={listing.id}
                    variant="outline"
                  />
                </div>
              </div>
            ))}
            {!data.listings.length ? (
              <EmptyState
                text="Broker listings created from this account will appear here."
                title="No broker listings"
              />
            ) : null}
            <Button asChild className="mt-2">
              <Link href="/dashboard/listings/new">Add listing</Link>
            </Button>
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Leads" title="Recent property leads">
          <div className="space-y-3">
            {data.leads.map((lead) => (
              <div className="rounded-2xl bg-muted p-4" key={lead.id}>
                <p className="text-xs font-bold text-violet-700">
                  {lead.stage.replaceAll("_", " ")}
                </p>
                <h3 className="mt-2 font-bold">{lead.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lead.property?.title ?? lead.message ?? "General inquiry"}
                </p>
                <p className="mt-2 text-sm font-semibold">Score {lead.aiScore}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  Source: {lead.source}
                </p>
              </div>
            ))}
            {!data.leads.length ? (
              <EmptyState
                text="Leads assigned to you or attached to your listings will appear here."
                title="No leads yet"
              />
            ) : null}
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Analytics" title="Lead sources">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Reel leads" value={data.analytics.reelLeadCount} />
            <DetailRow label="Property leads" value={data.analytics.propertyLeadCount} />
            {data.leadsBySource.map((item) => (
              <DetailRow
                key={item.source}
                label={item.source.replaceAll("_", " ")}
                value={item._count._all}
              />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Performance" title="Property performance">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Property views" value={data.analytics.propertyViews} />
            <DetailRow
              label="Call clicks"
              value={data.analytics.propertyPerformance._sum.callClicks ?? 0}
            />
            <DetailRow
              label="WhatsApp clicks"
              value={data.analytics.propertyPerformance._sum.whatsappClicks ?? 0}
            />
            <DetailRow
              label="Inquiries"
              value={data.analytics.propertyPerformance._sum.inquirySubmissions ?? 0}
            />
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Reels" title="Reel performance">
          <div className="space-y-3">
            {data.reelPerformance.map((reel) => (
              <div className="rounded-2xl bg-muted p-4" key={reel.id}>
                <h3 className="font-bold">{reel.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reel.viewsCount} views, {reel.likesCount} likes, {reel.savesCount} saves, {reel.sharesCount} shares, {reel.leadsCount} leads
                </p>
              </div>
            ))}
            {!data.reelPerformance.length ? (
              <EmptyState
                text="Published and pending reels from your listings will appear here."
                title="No reel performance yet"
              />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Views" value={data.analytics.reelEngagement._sum.viewsCount ?? 0} />
              <DetailRow label="Likes" value={data.analytics.reelEngagement._sum.likesCount ?? 0} />
              <DetailRow label="Saves" value={data.analytics.reelEngagement._sum.savesCount ?? 0} />
              <DetailRow label="Shares" value={data.analytics.reelEngagement._sum.sharesCount ?? 0} />
              <DetailRow label="Reel leads" value={data.analytics.reelEngagement._sum.leadsCount ?? 0} />
            </div>
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Saved Leads" title="Saved lead shortlist">
          <EmptyState
            text="Saved leads require future persistence. Phase 2B intentionally keeps this as an empty state without adding a new Prisma model."
            title="No saved leads yet"
          />
        </DashboardSection>

        <DashboardSection eyebrow="Profile" title="Broker profile">
          <div className="space-y-3">
            <DetailRow
              label="Name"
              value={profile?.fullName ?? "Not available"}
            />
            <DetailRow
              label="Email"
              value={profile?.user.email ?? "Not available"}
            />
            <DetailRow label="Role" value={profile?.role ?? "BROKER"} />
            <DetailRow label="City" value={profile?.city ?? "Not set"} />
            <DetailRow
              label="Broker verification"
              value={
                <VerificationBadge
                  entity="broker"
                  status={profile?.verificationStatus}
                />
              }
            />
            <DetailRow
              label="Phone verification"
              value={profile?.whatsappVerified ? "Verified" : "Not verified"}
            />
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Broker Plans" title="Subscription plans">
          <div className="flex flex-wrap gap-3">
            <PaymentButton label="Broker Monthly" product="BROKER_MONTHLY" />
            <PaymentButton
              label="Broker Yearly"
              product="BROKER_YEARLY"
              variant="outline"
            />
          </div>
        </DashboardSection>
        <DashboardSection eyebrow="Payments" title="Payment history">
          <PaymentHistory payments={data.payments} />
        </DashboardSection>
      </section>
    </div>
  );
}
