import Link from "next/link";
import { Fragment } from "react";
import { ArrowLeft, CheckCircle2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMarketplacePropertiesByIds } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function PropertyComparePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const ids = valueOf(params.ids)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);
  const properties = await getMarketplacePropertiesByIds(ids);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Button asChild variant="outline">
          <Link href="/properties">
            <ArrowLeft className="h-4 w-4" />
            Back to properties
          </Link>
        </Button>

        <div className="mt-8 max-w-3xl">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <Scale className="h-4 w-4" />
            Property Comparison
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            Compare your shortlisted options
          </h1>
          <p className="mt-5 leading-7 text-muted-foreground">
            Review price, area, bedrooms, bathrooms, locality, amenities, owner,
            and AI summary side by side before contacting owners.
          </p>
        </div>

        {properties.length >= 2 ? (
          <div className="mt-10 overflow-x-auto rounded-[1.5rem] border border-violet-100 bg-white shadow-sm">
            <div
              className="grid min-w-[760px]"
              style={{
                gridTemplateColumns: `220px repeat(${properties.length}, minmax(220px, 1fr))`
              }}
            >
              <div className="border-b border-r border-border p-4 font-bold">Decision point</div>
              {properties.map((property) => (
                <div className="border-b border-r border-border p-4" key={property.id}>
                  <h2 className="text-xl font-bold">{property.title}</h2>
                  <p className="mt-2 text-sm font-semibold text-violet-700">
                    {property.location}
                  </p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href={`/properties/${property.id}`}>Open details</Link>
                  </Button>
                </div>
              ))}

              {[
                ["Price", (property: typeof properties[number]) => property.priceLabel],
                ["Area", (property: typeof properties[number]) => property.area],
                ["Bedrooms", (property: typeof properties[number]) => property.bedrooms ? `${property.bedrooms}` : "Not set"],
                ["Bathrooms", (property: typeof properties[number]) => property.bathrooms ? `${property.bathrooms}` : "Not set"],
                ["Builder / Owner", (property: typeof properties[number]) => property.ownerName ?? "Verified owner"],
                ["Locality", (property: typeof properties[number]) => property.locality ?? property.city],
                ["HomeZone Score", (property: typeof properties[number]) => `${property.score}/100`],
                ["AI Summary", (property: typeof properties[number]) => property.aiSummary ?? property.description ?? "Summary pending"]
              ].map(([label, getter]) => (
                <Fragment key={label as string}>
                  <div className="border-b border-r border-border bg-muted/60 p-4 text-sm font-bold">
                    {label as string}
                  </div>
                  {properties.map((property) => (
                    <div className="border-b border-r border-border p-4 text-sm font-semibold" key={`${property.id}-${label}`}>
                      {(getter as (property: typeof properties[number]) => string)(property)}
                    </div>
                  ))}
                </Fragment>
              ))}

              <div className="border-r border-border bg-muted/60 p-4 text-sm font-bold">
                Amenities
              </div>
              {properties.map((property) => (
                <div className="border-r border-border p-4" key={`${property.id}-amenities`}>
                  <div className="flex flex-wrap gap-2">
                    {property.highlights.map((highlight) => (
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold" key={highlight}>
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="mt-10 p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-violet-700" />
            <h2 className="mt-4 text-2xl font-bold">Choose at least two properties</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Use the Compare button on property cards or detail pages. Your selection
              stays on this device until you clear or replace it.
            </p>
            <Button asChild className="mt-6">
              <Link href="/properties">Browse properties</Link>
            </Button>
          </Card>
        )}
      </section>
    </main>
  );
}
