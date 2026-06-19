import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingBadges } from "@/components/payments/listing-badges";
import { PaymentButton } from "@/components/payments/payment-button";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/listings");
  }

  const profile = await getOrCreateProfile(user);
  const listings = await db.property.findMany({
    where: {
      ownerId: profile.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">My Listings</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Manage your properties
            </h1>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/listings/new">
              <Plus className="h-4 w-4" />
              Add Property
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((property) => (
            <Card className="p-6 shadow-sm" key={property.id}>
              <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {property.status.replace("_", " ")}
              </p>
              <div className="mt-3">
                <VerificationBadge
                  entity="property"
                  status={property.verificationStatus}
                />
              </div>
              <div className="mt-3">
                <ListingBadges
                  featured={property.featured}
                  featuredUntil={property.featuredUntil}
                  premium={property.premium}
                  premiumUntil={property.premiumUntil}
                />
              </div>
              <h2 className="mt-5 text-2xl font-bold">{property.title}</h2>
              <p className="mt-2 text-sm font-semibold text-violet-700">
                {[property.locality, property.city].filter(Boolean).join(", ")}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {property.description}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline">
                  <Link href={`/properties/${property.id}`}>View Listing</Link>
                </Button>
                <Button asChild>
                  <Link href={`/dashboard/listings/${property.id}/media`}>
                    Upload Media
                  </Link>
                </Button>
              </div>
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
            </Card>
          ))}
          {!listings.length ? (
            <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-bold">No listings yet</h2>
              <p className="mt-3 text-muted-foreground">
                Add your first property and submit it for HomeZone review.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
