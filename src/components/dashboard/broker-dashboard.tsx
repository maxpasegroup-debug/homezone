import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  Home,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardHeader,
  DashboardSection,
  DetailRow,
  EmptyState,
  MetricCard
} from "@/components/dashboard/dashboard-primitives";
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          icon={Bookmark}
          label="Saved leads"
          note="Pending model"
          value={data.analytics.savedLeadCount}
        />
        <MetricCard
          icon={BarChart3}
          label="Published"
          value={data.analytics.publishedCount}
        />
        <MetricCard
          icon={BadgeCheck}
          label="Verification"
          value={profile?.whatsappVerified ? "Verified" : "Pending"}
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
                <h3 className="mt-2 font-bold">{listing.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[listing.locality, listing.city].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {listing._count.leads} leads
                </p>
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
              label="Verification"
              value={profile?.whatsappVerified ? "Verified" : "Not verified"}
            />
          </div>
        </DashboardSection>
      </section>
    </div>
  );
}
