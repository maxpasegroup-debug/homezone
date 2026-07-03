import Link from "next/link";
import type { ReactNode } from "react";
import type { Route } from "next";
import { ArrowUpRight, BarChart3, FileCheck2, Home, Plus, ShieldCheck, Users } from "lucide-react";
import type { getOwnerDashboardData } from "@/lib/dashboard/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingBadges } from "@/components/payments/listing-badges";
import { PaymentButton } from "@/components/payments/payment-button";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { OwnerLeadActions } from "@/components/properties/owner-lead-actions";
import { OwnerListingActions } from "@/components/properties/owner-listing-actions";

type OwnerDashboardData = Awaited<ReturnType<typeof getOwnerDashboardData>>;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function locationFor(property: { city: string; locality?: string | null }) {
  return [property.locality, property.city].filter(Boolean).join(", ");
}

export function OwnerDashboard({ data }: { data: OwnerDashboardData }) {
  const firstName = data.profile?.fullName?.split(" ")[0] ?? "Owner";
  const pendingActions = data.listings.filter(
    (listing) =>
      listing.status === "DRAFT" ||
      listing.status === "REJECTED" ||
      listing.verificationStatus === "NEEDS_CHANGES" ||
      !listing.mediaUrls.length ||
      !listing._count.documents
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <p className="text-sm font-bold text-violet-700">Property Owner Workspace</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome, {firstName}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Manage drafts, verification, leads, media, documents, performance, and premium upgrades from one calm workspace.
          </p>
        </div>
        <Card className="p-5 shadow-soft">
          <p className="text-sm font-bold text-violet-700">Portfolio Health</p>
          <p className="mt-3 text-5xl font-bold">
            {data.analytics.listingCount ? Math.round(((data.analytics.activeCount + data.analytics.reviewCount) / data.analytics.listingCount) * 100) : 0}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Active or under review listings across your owner portfolio.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link href="/dashboard/listings/new">
              <Plus className="h-4 w-4" />
              Create Listing
            </Link>
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Home className="h-5 w-5" />} label="Listings" value={data.analytics.listingCount} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Under Review" value={data.analytics.reviewCount} />
        <Metric icon={<Users className="h-5 w-5" />} label="Buyer Leads" value={data.analytics.leadCount} />
        <Metric icon={<BarChart3 className="h-5 w-5" />} label="Views" value={data.analytics.viewCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_.9fr]">
        <Card className="p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-700">Listing Overview</p>
              <h2 className="mt-1 text-2xl font-bold">Portfolio status</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/listings">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-4">
            {data.listings.map((property) => (
              <div className="rounded-3xl border bg-white p-4" key={property.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                        {property.status.replace("_", " ")}
                      </span>
                      <VerificationBadge entity="property" status={property.verificationStatus} />
                    </div>
                    <h3 className="mt-3 text-xl font-bold">{property.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-violet-700">{locationFor(property)}</p>
                    <div className="mt-3">
                      <ListingBadges
                        featured={property.featured}
                        featuredUntil={property.featuredUntil}
                        premium={property.premium}
                        premiumUntil={property.premiumUntil}
                      />
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-5">
                      <span>{property._count.viewedBy} views</span>
                      <span>{property._count.savedBy} saves</span>
                      <span>{property._count.leads} leads</span>
                      <span>{property._count.shortlistItems} shortlists</span>
                      <span>{property._count.documents} docs</span>
                    </div>
                  </div>
                  <div className="flex min-w-48 flex-col gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/listings/${property.id}/edit` as Route}>Edit</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/listings/${property.id}/preview` as Route}>Preview</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/listings/${property.id}/media` as Route}>Media</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/listings/${property.id}/documents` as Route}>Documents</Link>
                    </Button>
                    <OwnerListingActions propertyId={property.id} status={property.status} />
                  </div>
                </div>
              </div>
            ))}
            {!data.listings.length ? (
              <EmptyState title="No listings yet" text="Create your first draft listing and HomeZone will guide you through media, documents, preview, and verification." />
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Pending Actions</p>
            <div className="mt-4 space-y-3">
              {pendingActions.slice(0, 5).map((listing) => (
                <div className="rounded-2xl bg-muted p-4" key={listing.id}>
                  <p className="text-sm font-bold">{listing.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {listing.status === "DRAFT"
                      ? "Complete draft and submit for verification."
                      : !listing.mediaUrls.length
                        ? "Add a cover photo and gallery."
                        : !listing._count.documents
                          ? "Upload ownership documents."
                          : "Review verification feedback."}
                  </p>
                </div>
              ))}
              {!pendingActions.length ? <EmptyState compact title="All clear" text="Your listings have no urgent owner actions." /> : null}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Listing Performance</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric compact icon={<BarChart3 className="h-4 w-4" />} label="Saves" value={data.analytics.saveCount} />
              <Metric compact icon={<Users className="h-4 w-4" />} label="Contacts" value={data.analytics.contactRequests} />
              <Metric compact icon={<FileCheck2 className="h-4 w-4" />} label="Shortlists" value={data.analytics.shortlistCount} />
              <Metric compact icon={<BarChart3 className="h-4 w-4" />} label="Compares" value={data.analytics.comparisonCount} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <Card className="p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Buyer Leads</p>
          <h2 className="mt-1 text-2xl font-bold">Lead inbox</h2>
          <div className="mt-5 grid gap-4">
            {data.leads.map((lead) => (
              <div className="rounded-3xl border bg-white p-4" key={lead.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-bold">{lead.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[lead.phone, lead.email].filter(Boolean).join(" · ") || "Contact details submitted"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-violet-700">{lead.property?.title ?? "Property inquiry"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {lead.source} lead · {lead.stage.replace("_", " ")} · {lead.createdAt.toLocaleDateString("en-IN")}
                    </p>
                    {lead.message ? <p className="mt-3 text-sm leading-6">{lead.message}</p> : null}
                  </div>
                  <OwnerLeadActions leadId={lead.id} />
                </div>
              </div>
            ))}
            {!data.leads.length ? <EmptyState title="No buyer leads yet" text="Published listings will collect calls, WhatsApp inquiries, and form leads here." /> : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Studio Services</p>
            <h2 className="mt-2 text-2xl font-bold">Make your listing look premium</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Order photography, drone shoot, walkthrough video, reels, and AI brochure from HomeZone Studio.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link href="/studio">Open Studio</Link>
            </Button>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Upgrade Listing</p>
            <h2 className="mt-2 text-2xl font-bold">Boost visibility</h2>
            <div className="mt-5 grid gap-3">
              {data.listings.slice(0, 2).map((property) => (
                <div className="rounded-2xl bg-muted p-4" key={property.id}>
                  <p className="text-sm font-bold">{property.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PaymentButton label="Featured" product="FEATURED_LISTING" propertyId={property.id} variant="outline" />
                    <PaymentButton label="Premium" product="PREMIUM_LISTING" propertyId={property.id} variant="outline" />
                  </div>
                </div>
              ))}
              {!data.listings.length ? <p className="text-sm text-muted-foreground">Create a listing before buying upgrades.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({
  compact = false,
  icon,
  label,
  value
}: {
  compact?: boolean;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className={`${compact ? "p-4" : "p-5"} shadow-sm`}>
      <div className="flex items-center gap-2 text-violet-700">{icon}</div>
      <p className={`${compact ? "mt-2 text-2xl" : "mt-4 text-4xl"} font-bold`}>{formatNumber(value)}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}

function EmptyState({
  compact = false,
  text,
  title
}: {
  compact?: boolean;
  text: string;
  title: string;
}) {
  return (
    <div className={`rounded-3xl border border-dashed bg-white text-center ${compact ? "p-4" : "p-8"}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
