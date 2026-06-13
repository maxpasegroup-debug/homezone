import Link from "next/link";
import { ArrowRight, BedDouble, Bookmark, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMarketplaceProperties } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const properties = await getMarketplaceProperties();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              Marketplace
            </p>
            <h1 className="mt-3 text-5xl font-bold tracking-tight">
              Verified-style property discovery
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Browse freely. Contact, save, site visits, and listing actions
              move users into verified account flow.
            </p>
          </div>
          <Button asChild size="lg">
            <a href="/dashboard/listings/new">List Property</a>
          </Button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <Card className="overflow-hidden shadow-sm transition hover:-translate-y-1 hover:shadow-soft" key={property.id}>
              <div className="flex aspect-[4/3] items-end bg-gradient-to-br from-violet-700 via-fuchsia-500 to-cyan-400 p-5 text-white">
                <div>
                  <p className="rounded-full bg-white/18 px-3 py-1 text-xs font-bold">
                    Score {property.score}/100
                  </p>
                  <h2 className="mt-4 text-2xl font-bold">{property.title}</h2>
                </div>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </p>
                <p className="mt-3 text-3xl font-bold">{property.priceLabel}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <BedDouble className="h-4 w-4" />
                  {property.bedrooms ? `${property.bedrooms}BHK` : property.type} · {property.area}
                </p>
                <div className="mt-5 flex gap-2">
                  <Button asChild className="flex-1">
                    <a href={`/properties/${property.id}`}>
                      View
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild size="icon" variant="outline">
                    <a href="/auth">
                      <Bookmark className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
