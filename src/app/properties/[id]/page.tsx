import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, Images, MapPin, Share2, Sparkles } from "lucide-react";
import { VerificationGate } from "@/components/account/verification-gate";
import { AIPropertyIntelligencePanel } from "@/components/ai/ai-property-intelligence-panel";
import { ContactPropertyForm } from "@/components/properties/contact-property-form";
import { BuyerPropertyActions } from "@/components/properties/buyer-property-actions";
import { PropertyCard } from "@/components/properties/property-card";
import { ReportButton } from "@/components/reports/report-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingBadges } from "@/components/payments/listing-badges";
import { PropertyViewTracker } from "@/components/properties/property-view-tracker";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMarketplaceProperty, getRelatedMarketplaceProperties } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [property, user] = await Promise.all([
    getMarketplaceProperty(id),
    getSessionUser()
  ]);

  if (!property) {
    notFound();
  }

  const profile = user ? await getOrCreateProfile(user) : null;
  const saved = profile
    ? await db.savedProperty.findUnique({
        where: {
          userId_propertyId: {
            userId: profile.id,
            propertyId: property.id
          }
        }
      })
    : null;
  const relatedProperties = await getRelatedMarketplaceProperties(property);
  const gallery = property.mediaUrls.length
    ? property.mediaUrls
    : [
        "",
        "",
        ""
      ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <PropertyViewTracker propertyId={property.id} />
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/properties">
          HomeZone Properties
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <div
              className="flex aspect-[16/10] items-end rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-500 p-7 text-white shadow-glow"
              style={
                property.mediaUrls[0]
                  ? {
                      backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.76)), url(${property.mediaUrls[0]})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover"
                    }
                  : undefined
              }
            >
              <div>
                <p className="rounded-full bg-white/18 px-3 py-1 text-sm font-bold">
                  {property.type}
                </p>
                <h1 className="mt-4 text-5xl font-bold tracking-tight">
                  {property.title}
                </h1>
              </div>
            </div>

            <Card className="mt-6 p-4 shadow-sm sm:p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <Images className="h-4 w-4" />
                Gallery
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {gallery.map((image, index) => (
                  <div
                    className="flex aspect-[4/3] items-end rounded-2xl bg-gradient-to-br from-violet-100 via-white to-cyan-100 p-4 text-sm font-bold text-slate-700"
                    key={`${image}-${index}`}
                    style={
                      image
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(15,23,42,0.42)), url(${image})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                            color: "white"
                          }
                        : undefined
                    }
                  >
                    {image ? `Photo ${index + 1}` : index === 0 ? "Main view" : index === 1 ? "Interior view" : "Location view"}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="mt-8 p-6 shadow-sm sm:p-8">
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <Sparkles className="h-4 w-4" />
                AI Summary
              </p>
              <p className="mt-4 text-xl font-bold leading-9">
                {property.aiSummary ??
                  `This property has been prepared for guided discovery. HomeZone score is ${property.score}/100 with rental signal ${property.rentalYield}.`}
              </p>
            </Card>

            <AIPropertyIntelligencePanel
              propertyId={property.id}
              propertyTitle={property.title}
            />

            <Card className="mt-8 p-6 shadow-sm sm:p-8">
              <h2 className="text-3xl font-bold">Description</h2>
              <p className="mt-4 leading-8 text-muted-foreground">
                {property.description ?? "Detailed description will be updated by the verified owner."}
              </p>
            </Card>

            <Card className="mt-8 p-6 shadow-sm sm:p-8">
              <h2 className="text-3xl font-bold">Amenities</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {property.highlights.map((highlight) => (
                  <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold" key={highlight}>
                    {highlight}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="mt-8 p-6 shadow-sm sm:p-8">
              <h2 className="text-3xl font-bold">Nearby facilities</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(property.nearbyFacilities ?? []).map((facility) => (
                  <p className="rounded-2xl bg-muted p-4 text-sm font-bold" key={facility}>
                    {facility}
                  </p>
                ))}
              </div>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="p-6 shadow-soft sm:p-8">
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <MapPin className="h-4 w-4" />
                {property.location}
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
              <p className="mt-4 text-5xl font-bold">{property.priceLabel}</p>
              <p className="mt-2 text-sm font-semibold text-emerald-600">
                HomeZone Score {property.score}/100
              </p>
              <div className="mt-5 rounded-2xl bg-muted p-4">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Building2 className="h-4 w-4 text-violet-700" />
                  {property.ownerName ?? "Verified owner"}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  Owner/builder details are shown after verified contact request.
                </p>
              </div>
              <div className="mt-5">
                <BuyerPropertyActions initialSaved={Boolean(saved)} propertyId={property.id} />
              </div>
              <ContactPropertyForm propertyId={property.id} />
              <div className="mt-3 grid gap-3">
                <Button disabled size="lg" variant="outline">
                  <Share2 className="h-4 w-4" />
                  Share link
                </Button>
                <ReportButton entityId={property.id} entityType="property" />
              </div>
            </Card>

            <VerificationGate action="contact, save, or book a site visit" />
          </aside>
        </div>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Similar Properties
              </p>
              <h2 className="mt-2 text-3xl font-bold">More options to compare</h2>
            </div>
            <Button asChild variant="outline">
              <Link href={`/properties?city=${encodeURIComponent(property.city)}&purpose=${property.intent}`}>
                Browse {property.city}
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {relatedProperties.map((related) => (
              <PropertyCard key={related.id} property={related} />
            ))}
            {!relatedProperties.length ? (
              <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
                <h3 className="text-2xl font-bold">No close matches yet</h3>
                <p className="mt-3 text-muted-foreground">
                  Try browsing nearby cities or adjusting your budget to compare alternatives.
                </p>
              </Card>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
