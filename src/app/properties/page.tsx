import Link from "next/link";
import { ArrowRight, BedDouble, Bookmark, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
<<<<<<< HEAD
import { ListingBadges } from "@/components/payments/listing-badges";
import { VerificationBadge } from "@/components/trust/verification-badge";
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
import { getMarketplaceProperties, parseMarketplaceFilters } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const categories = ["RESIDENTIAL", "COMMERCIAL", "LAND", "INDUSTRIAL", "AGRICULTURAL", "HOSPITALITY", "LUXURY"];
const purposes = ["BUY", "RENT", "LEASE", "INVEST"];

function valueOf(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const filters = parseMarketplaceFilters(params);
  const properties = await getMarketplaceProperties(filters);

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

        <form className="mt-8 grid gap-3 rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-sm md:grid-cols-4 xl:grid-cols-8">
          <input
            className="h-11 rounded-2xl border border-border px-3 text-sm font-semibold outline-none"
            defaultValue={valueOf(params.keyword ?? params.q)}
            name="keyword"
            placeholder="Keyword"
          />
          <input
            className="h-11 rounded-2xl border border-border px-3 text-sm font-semibold outline-none"
            defaultValue={valueOf(params.country)}
            name="country"
            placeholder="Country"
          />
          <input
            className="h-11 rounded-2xl border border-border px-3 text-sm font-semibold outline-none"
            defaultValue={valueOf(params.city)}
            name="city"
            placeholder="City"
          />
          <select
            className="h-11 rounded-2xl border border-border px-3 text-sm font-semibold outline-none"
            defaultValue={valueOf(params.purpose ?? params.intent)}
            name="purpose"
          >
            <option value="">Purpose</option>
            {purposes.map((purpose) => (
              <option key={purpose}>{purpose}</option>
            ))}
          </select>
          <select
            className="h-11 rounded-2xl border border-border px-3 text-sm font-semibold outline-none"
            defaultValue={valueOf(params.category)}
            name="category"
          >
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input
            className="h-11 rounded-2xl border border-border px-3 text-sm font-semibold outline-none"
            defaultValue={valueOf(params.maxPrice)}
            name="maxPrice"
            placeholder="Max price"
          />
          <label className="flex h-11 items-center gap-2 rounded-2xl border border-border px-3 text-sm font-semibold">
            <input
              defaultChecked={valueOf(params.verifiedOnly) === "true"}
              name="verifiedOnly"
              type="checkbox"
              value="true"
            />
            Verified
          </label>
          <Button className="h-11" type="submit">
            Filter
          </Button>
        </form>

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
                <VerificationBadge
                  entity="property"
                  status={property.verificationStatus}
                />
                <div className="mt-2">
                  <ListingBadges
                    featured={property.featured}
                    featuredUntil={property.featuredUntil}
                    premium={property.premium}
                    premiumUntil={property.premiumUntil}
                  />
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-violet-700">
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </p>
                <p className="mt-3 text-3xl font-bold">{property.priceLabel}</p>
                <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
                  {property.intent} / {property.category}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <BedDouble className="h-4 w-4" />
                  {property.bedrooms ? `${property.bedrooms}BHK` : property.type} - {property.area}
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
