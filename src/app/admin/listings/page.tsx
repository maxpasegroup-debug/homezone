import Link from "next/link";
import type { Route } from "next";
import { requireAdminProfile } from "@/lib/auth/admin";
import { getAdminListingQueue, formatAdminStatus } from "@/lib/admin/operations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/trust/verification-badge";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  await requireAdminProfile();
  const listings = await getAdminListingQueue();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/admin">Admin</Link>
        <h1 className="mt-8 text-5xl font-bold tracking-tight">Listing moderation</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Review pending listings, owner documents, media, buyer performance, and moderation notes before approval.
        </p>
        <div className="mt-8 grid gap-5">
          {listings.map((property) => (
            <Card className="p-6 shadow-sm" key={property.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{formatAdminStatus(property.status)}</span>
                    <VerificationBadge entity="property" status={property.verificationStatus} />
                  </div>
                  <h2 className="mt-3 text-2xl font-bold">{property.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-violet-700">{[property.locality, property.city].filter(Boolean).join(", ")}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Owner: {property.owner?.fullName ?? property.owner?.user.email ?? "No owner"} · Docs {property.documents.length} · Media {property.mediaUrls.length}
                  </p>
                  <p className="mt-2 text-xs font-bold text-muted-foreground">
                    {property._count.viewedBy} views · {property._count.savedBy} saves · {property._count.leads} leads
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/admin/listings/${property.id}` as Route}>Review Listing</Link>
                </Button>
              </div>
            </Card>
          ))}
          {!listings.length ? (
            <Card className="p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold">No listings in moderation</h2>
              <p className="mt-3 text-muted-foreground">New owner submissions will appear here.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
