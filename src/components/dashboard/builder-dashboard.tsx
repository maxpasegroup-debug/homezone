import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Film,
  Home,
<<<<<<< HEAD
  MessageSquare,
  Users
=======
  MessageSquare
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardHeader,
  DashboardSection,
  DetailRow,
  EmptyState,
  MetricCard
} from "@/components/dashboard/dashboard-primitives";
<<<<<<< HEAD
import { ListingBadges } from "@/components/payments/listing-badges";
import { PaymentButton } from "@/components/payments/payment-button";
import { PaymentHistory } from "@/components/payments/payment-history";
import { VerificationBadge } from "@/components/trust/verification-badge";
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
import type { getBuilderDashboardData } from "@/lib/dashboard/queries";

type BuilderDashboardData = Awaited<ReturnType<typeof getBuilderDashboardData>>;

export function BuilderDashboard({ data }: { data: BuilderDashboardData }) {
  const profile = data.profile;

  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Builder Dashboard"
        subtitle="Track builder projects, inventory, leads, media readiness, verification, and profile details using live marketplace data."
        title="Builder workspace"
      />

<<<<<<< HEAD
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
=======
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
        <MetricCard
          icon={Building2}
          label="Projects"
          value={data.analytics.projectCount}
        />
        <MetricCard
          icon={Home}
          label="Inventory"
          value={data.analytics.inventoryCount}
        />
        <MetricCard
          icon={MessageSquare}
          label="Leads"
          value={data.analytics.leadCount}
        />
<<<<<<< HEAD
        <MetricCard
          icon={Users}
          label="Followers"
          note={`+${data.analytics.followersGained} / 30d`}
          value={data.analytics.followerCount}
        />
        <MetricCard icon={Film} label="Media items" value={data.analytics.mediaCount} />
        <MetricCard
          icon={Film}
          label="Reported reels"
          value={data.analytics.reportedReels}
        />
        <MetricCard
          icon={BadgeCheck}
          label="Verification"
          value={profile?.verificationStatus ?? "PENDING"}
=======
        <MetricCard icon={Film} label="Media items" value={data.analytics.mediaCount} />
        <MetricCard
          icon={BadgeCheck}
          label="Verification"
          value={profile?.whatsappVerified ? "Verified" : "Pending"}
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <DashboardSection eyebrow="Projects" title="Builder projects">
          <div className="space-y-3">
            {data.projects.map((project) => (
              <div className="rounded-2xl bg-muted p-4" key={project.id}>
                <p className="text-xs font-bold text-violet-700">
                  {project.campaignStatus}
                </p>
                <h3 className="mt-2 font-bold">{project.name}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[project.locality, project.city].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {project.availableUnits ?? 0} of {project.unitsCount ?? 0} units available
                </p>
              </div>
            ))}
            {!data.projects.length ? (
              <EmptyState
                text="BuilderProject records linked to this builder will appear here."
                title="No projects yet"
              />
            ) : null}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Inventory" title="Property inventory">
          <div className="space-y-3">
            {data.inventory.map((property) => (
              <div className="rounded-2xl bg-muted p-4" key={property.id}>
                <p className="text-xs font-bold text-violet-700">
                  {property.status.replaceAll("_", " ")}
                </p>
<<<<<<< HEAD
                <div className="mt-2">
                  <VerificationBadge
                    entity="property"
                    status={property.verificationStatus}
                  />
                </div>
                <div className="mt-2">
                  <ListingBadges
                    featured={property.featured}
                    featuredUntil={property.featuredUntil}
                    premium={property.premium}
                    premiumUntil={property.premiumUntil}
                  />
                </div>
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
                <h3 className="mt-2 font-bold">{property.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[property.locality, property.city].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {property._count.leads} leads, {property._count.reels} reels
                </p>
<<<<<<< HEAD
                <div className="mt-4 flex flex-wrap gap-2">
                  <PaymentButton
                    label="Feature"
                    product="FEATURED_LISTING"
                    propertyId={property.id}
                    variant="outline"
                  />
                  <PaymentButton
                    label="Premium"
                    product="PREMIUM_LISTING"
                    propertyId={property.id}
                    variant="outline"
                  />
                </div>
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
              </div>
            ))}
            {!data.inventory.length ? (
              <EmptyState
                text="Builder-owned properties and units will appear here."
                title="No inventory yet"
              />
            ) : null}
            <Button asChild className="mt-2">
              <Link href="/dashboard/listings/new">Add inventory</Link>
            </Button>
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Leads" title="Project and inventory leads">
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
<<<<<<< HEAD
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  Source: {lead.source}
                </p>
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
              </div>
            ))}
            {!data.leads.length ? (
              <EmptyState
                text="Leads attached to builder inventory will appear here."
                title="No leads yet"
              />
            ) : null}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Media" title="Reels and media readiness">
          <div className="space-y-3">
            {data.media.map((reel) => (
              <div className="rounded-2xl bg-muted p-4" key={reel.id}>
                <p className="text-xs font-bold text-violet-700">
                  {reel.status.replaceAll("_", " ")}
                </p>
                <h3 className="mt-2 font-bold">{reel.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
<<<<<<< HEAD
                  {reel.viewsCount} views, {reel.likesCount} likes, {reel.savesCount} saves, {reel.sharesCount} shares, {reel.leadsCount} leads
=======
                  {reel.likesCount} likes, {reel.savesCount} saves
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
                </p>
              </div>
            ))}
            {!data.media.length ? (
              <EmptyState
                text="Property reels and uploaded media signals will appear here."
                title="No media yet"
              />
            ) : null}
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Analytics" title="Builder summary">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow
              label="Projects"
              value={data.analytics.projectCount}
            />
            <DetailRow
              label="Inventory"
              value={data.analytics.inventoryCount}
            />
            <DetailRow label="Leads" value={data.analytics.leadCount} />
            <DetailRow label="Reels" value={data.analytics.reelCount} />
<<<<<<< HEAD
            <DetailRow label="Followers" value={data.analytics.followerCount} />
            <DetailRow label="Followers gained" value={data.analytics.followersGained} />
            <DetailRow label="Reported reels" value={data.analytics.reportedReels} />
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
            <DetailRow label="Reel views" value={data.analytics.reelEngagement._sum.viewsCount ?? 0} />
            <DetailRow label="Reel likes" value={data.analytics.reelEngagement._sum.likesCount ?? 0} />
            <DetailRow label="Reel leads" value={data.analytics.reelEngagement._sum.leadsCount ?? 0} />
            {data.leadsBySource.map((item) => (
              <DetailRow
                key={item.source}
                label={`${item.source.replaceAll("_", " ")} leads`}
                value={item._count._all}
              />
            ))}
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Profile" title="Builder profile">
          <div className="space-y-3">
            <DetailRow
              label="Name"
              value={profile?.fullName ?? "Not available"}
            />
            <DetailRow
              label="Email"
              value={profile?.user.email ?? "Not available"}
            />
            <DetailRow label="Role" value={profile?.role ?? "BUILDER"} />
            <DetailRow label="City" value={profile?.city ?? "Not set"} />
            <DetailRow
<<<<<<< HEAD
              label="Builder verification"
              value={
                <VerificationBadge
                  entity="builder"
                  status={profile?.verificationStatus}
                />
              }
            />
            <DetailRow
              label="Phone verification"
=======
              label="Verification"
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
              value={profile?.whatsappVerified ? "Verified" : "Not verified"}
            />
          </div>
        </DashboardSection>
      </section>
<<<<<<< HEAD

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Lead Analytics" title="Leads by property and reel">
          <div className="space-y-3">
            <DetailRow label="Properties with leads" value={data.leadsByProperty.length} />
            <DetailRow label="Reels with leads" value={data.leadsByReel.length} />
            {data.reelPerformance.map((reel) => (
              <div className="rounded-2xl bg-muted p-4" key={reel.id}>
                <h3 className="font-bold">{reel.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reel.leadsCount} leads from {reel.viewsCount} views
                </p>
              </div>
            ))}
            {!data.reelPerformance.length ? (
              <EmptyState
                text="Builder reel lead performance will appear here."
                title="No reel lead analytics yet"
              />
            ) : null}
          </div>
        </DashboardSection>

        <DashboardSection eyebrow="Builder Plans" title="Subscription plans">
          <div className="flex flex-wrap gap-3">
            <PaymentButton label="Builder Monthly" product="BUILDER_MONTHLY" />
            <PaymentButton
              label="Builder Yearly"
              product="BUILDER_YEARLY"
              variant="outline"
            />
          </div>
        </DashboardSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSection eyebrow="Payments" title="Payment history">
          <PaymentHistory payments={data.payments} />
        </DashboardSection>
      </section>
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
    </div>
  );
}
