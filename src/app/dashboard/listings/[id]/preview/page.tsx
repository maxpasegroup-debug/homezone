import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BuyerPropertyActions } from "@/components/properties/buyer-property-actions";
import { ContactPropertyForm } from "@/components/properties/contact-property-form";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { getMarketplaceProperty } from "@/lib/properties/queries";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingPreviewPage({ params }: PageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/listings");
  }

  const { id } = await params;
  const profile = await getOrCreateProfile(user);
  const raw = await db.property.findUnique({
    where: {
      id
    }
  });

  if (!raw) {
    notFound();
  }

  if (raw.ownerId !== profile.id && !isAdminRole(profile.role)) {
    redirect("/dashboard/listings");
  }

  const property = await getMarketplaceProperty(id);

  if (!property) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-8 sm:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link href="/dashboard/listings">
              <ArrowLeft className="h-4 w-4" />
              Back to Listings
            </Link>
          </Button>
          <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
            Owner Preview · {raw.status.replace("_", " ")}
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <Card className="overflow-hidden shadow-soft">
              {property.mediaUrls[0] ? (
                <div className="relative aspect-[16/9] w-full">
                  <Image alt={property.title} className="object-cover" fill priority sizes="(min-width: 1024px) 70vw, 100vw" src={property.mediaUrls[0]} />
                </div>
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-violet-50 text-sm font-bold text-violet-700">
                  Add a cover image from Media
                </div>
              )}
            </Card>
            {property.mediaUrls.length > 1 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {property.mediaUrls.slice(1, 5).map((url) => (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl" key={url}>
                    <Image alt={property.title} className="object-cover" fill sizes="(min-width: 640px) 25vw, 50vw" src={url} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">{property.intent} · {property.type}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{property.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {property.location}
            </p>
            <p className="mt-5 text-3xl font-bold">{property.priceLabel}</p>
            <div className="mt-5">
              <BuyerPropertyActions propertyId={property.id} />
            </div>
            <div className="mt-6 rounded-3xl bg-muted p-4">
              <p className="text-sm font-bold">Owner contact preview</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Buyer inquiries will create leads in your owner dashboard after publication.
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <Card className="p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Property Details</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{property.description}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {property.highlights.map((item) => (
                <div className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm font-bold" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-violet-700" />
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <h2 className="text-2xl font-bold">AI Summary</h2>
            <p className="mt-4 leading-7 text-muted-foreground">{property.aiSummary ?? "HomeZone AI summary will appear after review."}</p>
            <h3 className="mt-6 text-lg font-bold">Nearby facilities</h3>
            <div className="mt-3 space-y-2">
              {(property.nearbyFacilities ?? []).map((item) => (
                <p className="rounded-2xl bg-muted p-3 text-sm font-semibold" key={item}>{item}</p>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <ContactPropertyForm propertyId={property.id} />
        </div>
      </section>
    </main>
  );
}
