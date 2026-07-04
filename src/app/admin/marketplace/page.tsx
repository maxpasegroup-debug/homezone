import Link from "next/link";
import type { Route } from "next";
import { BarChart3, BriefcaseBusiness, Building2, Home, IndianRupee, KeyRound, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminMarketplaceSetupData } from "@/lib/admin/operations";
import { requireAdminProfile } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const marketplaceLines = [
  {
    description: "Homes, villas, apartments, land, and projects for purchase.",
    href: "/properties?purpose=BUY",
    icon: Home,
    intent: "BUY",
    label: "Buy Properties",
    manageHref: "/admin/listings?intent=BUY"
  },
  {
    description: "Rental homes, flats, apartments, villas, and managed rentals.",
    href: "/properties?purpose=RENT",
    icon: KeyRound,
    intent: "RENT",
    label: "Rent Properties",
    manageHref: "/admin/listings?intent=RENT"
  },
  {
    description: "Long-term lease and sale-ready inventory for owners and builders.",
    href: "/properties?purpose=LEASE",
    icon: Building2,
    intent: "LEASE",
    label: "Lease / Sell",
    manageHref: "/admin/listings?intent=LEASE"
  },
  {
    description: "Yield-oriented listings, land banking, appreciation, and investor picks.",
    href: "/properties?purpose=INVEST",
    icon: BarChart3,
    intent: "INVEST",
    label: "Invest",
    manageHref: "/admin/listings?intent=INVEST"
  }
];

function countBy<T extends string>(rows: { _count: { _all: number } }[], key: T, value: string) {
  const row = rows.find((item) => String(item[key as keyof typeof item]) === value);
  return row?._count._all ?? 0;
}

function price(value: unknown) {
  if (!value) return "Price not set";
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(Number(value));
}

export default async function AdminMarketplacePage() {
  await requireAdminProfile();
  const data = await getAdminMarketplaceSetupData();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/admin">
          Admin
        </Link>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_.55fr]">
          <Card className="p-7 shadow-soft sm:p-9">
            <p className="text-sm font-bold text-violet-700">Marketplace Setup</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Manage HomeZone business lines.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
              Create, review, and control the public property marketplace for buy, rent, lease/sell, and investment discovery from one admin workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={"/dashboard/listings/new" as Route}>
                  <Plus className="h-4 w-4" />
                  Add Property Listing
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={"/admin/listings" as Route}>
                  <ShieldCheck className="h-4 w-4" />
                  Moderate Listings
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white shadow-soft sm:p-9">
            <IndianRupee className="h-11 w-11" />
            <p className="mt-6 text-sm font-bold text-white/70">Admin principle</p>
            <h2 className="mt-2 text-3xl font-bold">Create supply. Control quality.</h2>
            <p className="mt-4 leading-7 text-white/75">
              Admin can create seed listings, moderate owner submissions, and keep each property line clean before public users see it.
            </p>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {marketplaceLines.map((line) => {
            const Icon = line.icon;
            const count = countBy(data.intentCounts, "intent", line.intent);
            return (
              <Card className="p-5 shadow-sm" key={line.intent}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-3xl font-bold">{count}</p>
                <h2 className="mt-1 text-lg font-bold">{line.label}</h2>
                <p className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground">{line.description}</p>
                <div className="mt-5 flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href={`/dashboard/listings/new?intent=${line.intent}` as Route}>
                      <Plus className="h-4 w-4" />
                      Add {line.intent}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={line.manageHref as Route}>Manage</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={line.href as Route}>View Public</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[.85fr_1fr]">
          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <BriefcaseBusiness className="h-4 w-4" />
              Marketplace Controls
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ["Draft listings", countBy(data.statusCounts, "status", "DRAFT")],
                ["Pending review", countBy(data.statusCounts, "status", "PENDING_REVIEW")],
                ["Published", countBy(data.statusCounts, "status", "PUBLISHED")],
                ["Archived", countBy(data.statusCounts, "status", "ARCHIVED")]
              ].map(([label, value]) => (
                <div className="flex items-center justify-between rounded-2xl bg-muted p-4" key={label}>
                  <p className="text-sm font-bold">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Recent Listings</p>
            <div className="mt-5 space-y-3">
              {data.recentListings.map((listing) => (
                <Link
                  className="block rounded-2xl border bg-white p-4 transition hover:border-violet-300 hover:bg-violet-50/40"
                  href={`/admin/listings/${listing.id}` as Route}
                  key={listing.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{listing.title}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {listing.intent} / {listing.category} / {listing.city}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-violet-700">{price(listing.price)}</p>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-muted-foreground">
                    {listing.status} / {listing.verificationStatus}
                  </p>
                </Link>
              ))}
              {!data.recentListings.length ? (
                <p className="rounded-2xl border border-dashed bg-white p-4 text-sm font-semibold text-muted-foreground">
                  No listings yet. Use Add Property Listing to create the first marketplace supply.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
