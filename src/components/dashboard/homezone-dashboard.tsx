import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  Heart,
  Home,
  MessageSquare,
  PlaySquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardHeader,
  DashboardSection,
  DetailRow,
  EmptyState,
  MetricCard
} from "@/components/dashboard/dashboard-primitives";
import type { getUserDashboardData } from "@/lib/dashboard/queries";

type UserDashboardData = Awaited<ReturnType<typeof getUserDashboardData>>;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function HomeZoneDashboard({
  data,
  email
}: {
  data: UserDashboardData;
  email?: string | null;
}) {
  const profile = data.profile;

  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="User Dashboard"
        subtitle="Track your property activity, saved homes, inquiries, listings, verification, and recent account actions from one place."
        title={`Welcome${profile?.fullName ? `, ${profile.fullName}` : ""}`}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Heart}
          label="Saved properties"
          value={data.counts.savedProperties}
        />
        <MetricCard
          icon={PlaySquare}
          label="Saved reels"
          note="Pending model"
          value={data.counts.savedReels}
        />
        <MetricCard
          icon={MessageSquare}
          label="My inquiries"
          value={data.counts.inquiries}
        />
        <MetricCard icon={Home} label="My listings" value={data.counts.listings} />
        <MetricCard
          icon={BadgeCheck}
          label="Verification"
          value={profile?.whatsappVerified ? "Verified" : "Pending"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <DashboardSection eyebrow="Profile" title="Account profile">
          <div className="space-y-3">
            <DetailRow label="Email" value={email ?? "Not available"} />
            <DetailRow label="Role" value={profile?.role ?? "USER"} />
            <DetailRow label="Country" value={profile?.country ?? "Not set"} />
            <DetailRow label="City" value={profile?.city ?? "Not set"} />
            <DetailRow
              label="Phone verification"
              value={profile?.whatsappVerified ? "Verified" : "Not verified"}
            />
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Recent Activity" title="Latest account events">
          <div className="space-y-3">
            {data.recentActivity.map((activity) => (
              <div className="rounded-2xl bg-muted p-4" key={activity.id}>
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Activity className="h-4 w-4 text-violet-700" />
                  {activity.action.replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {formatDate(activity.createdAt)}
                </p>
              </div>
            ))}
            {!data.recentActivity.length ? (
              <EmptyState
                text="Security and marketplace actions will appear here as they are recorded."
                title="No recent activity"
              />
            ) : null}
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Saved Properties" title="Properties you saved">
          <div className="space-y-3">
            {data.savedProperties.map((item) => (
              <div className="rounded-2xl bg-muted p-4" key={item.propertyId}>
                <h3 className="font-bold">{item.property.title}</h3>
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
                text="Save properties from the marketplace to compare them later."
                title="No saved properties"
              />
            ) : null}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Saved Reels" title="Saved video walkthroughs">
          <EmptyState
            text="Saved reels require a future SavedReel persistence model. Phase 2B intentionally shows a real empty state without adding that model."
            title="No saved reels yet"
          />
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="My Inquiries" title="Property inquiries">
          <div className="space-y-3">
            {data.inquiries.map((inquiry) => (
              <div className="rounded-2xl bg-muted p-4" key={inquiry.id}>
                <p className="text-xs font-bold text-violet-700">
                  {inquiry.stage.replaceAll("_", " ")}
                </p>
                <h3 className="mt-2 font-bold">{inquiry.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {inquiry.property?.title ?? inquiry.message ?? "General inquiry"}
                </p>
              </div>
            ))}
            {!data.inquiries.length ? (
              <EmptyState
                text="Your property contact requests and inquiries will appear here."
                title="No inquiries yet"
              />
            ) : null}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="My Listings" title="Listings you own">
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
              </div>
            ))}
            {!data.listings.length ? (
              <EmptyState
                text="Create a listing when you are ready to sell, rent, lease, or invest."
                title="No listings yet"
              />
            ) : null}
            <Button asChild className="mt-2">
              <Link href="/dashboard/listings/new">Add property</Link>
            </Button>
          </div>
        </DashboardSection>
      </section>
    </div>
  );
}
