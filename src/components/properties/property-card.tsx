import Link from "next/link";
import { ArrowRight, BedDouble, MapPin, ShieldCheck } from "lucide-react";
import { BuyerPropertyActions } from "@/components/properties/buyer-property-actions";
import { ListingBadges } from "@/components/payments/listing-badges";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MarketplaceProperty } from "@/lib/properties/queries";

export function PropertyCard({
  property,
  saved = false
}: {
  property: MarketplaceProperty;
  saved?: boolean;
}) {
  const imageUrl = property.mediaUrls[0];

  return (
    <Card className="group overflow-hidden shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <div
        className="relative flex aspect-[4/3] items-end bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-500 p-5 text-white"
        style={
          imageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.72)), url(${imageUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover"
              }
            : undefined
        }
      >
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-bold backdrop-blur">
            Score {property.score}/100
          </span>
          {property.verified ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-white/75">
            {property.type}
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight">{property.title}</h2>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <VerificationBadge
            entity="property"
            status={property.verificationStatus}
          />
          <ListingBadges
            featured={property.featured}
            featuredUntil={property.featuredUntil}
            premium={property.premium}
            premiumUntil={property.premiumUntil}
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-violet-700">
          <MapPin className="h-4 w-4" />
          {property.location || property.city}
        </p>
        <p className="mt-3 text-3xl font-bold">{property.priceLabel}</p>
        <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
          {property.intent} / {property.category}
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <BedDouble className="h-4 w-4" />
          {property.bedrooms ? `${property.bedrooms}BHK` : property.type} / {property.area}
        </p>
        <div className="mt-4">
          <BuyerPropertyActions compact initialSaved={saved} propertyId={property.id} />
        </div>
        <Button asChild className="mt-4 w-full">
          <Link href={`/properties/${property.id}`}>
            View details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
