import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Film,
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <MetricCard icon={Film} label="Media items" value={data.analytics.mediaCount} />
        <MetricCard
          icon={BadgeCheck}
          label="Verification"
          value={profile?.whatsappVerified ? "Verified" : "Pending"}
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
                <h3 className="mt-2 font-bold">{property.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[property.locality, property.city].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {property._count.leads} leads, {property._count.reels} reels
                </p>
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
                  {reel.likesCount} likes, {reel.savesCount} saves
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
              label="Verification"
              value={profile?.whatsappVerified ? "Verified" : "Not verified"}
            />
          </div>
        </DashboardSection>
      </section>
    </div>
  );
}
