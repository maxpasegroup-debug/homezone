import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PropertyCard } from "@/components/properties/property-card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMarketplaceProperties, parseMarketplaceFilters } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const categories = ["RESIDENTIAL", "COMMERCIAL", "LAND", "INDUSTRIAL", "AGRICULTURAL", "HOSPITALITY", "LUXURY"];
const purposes = ["BUY", "RENT", "LEASE", "INVEST"];
const sorts = [
  ["recommended", "Recommended"],
  ["newest", "Newest"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["score", "HomeZone score"]
] as const;

function valueOf(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const filters = parseMarketplaceFilters(params);
  const [properties, user] = await Promise.all([
    getMarketplaceProperties(filters),
    getSessionUser()
  ]);
  const profile = user ? await getOrCreateProfile(user) : null;
  const savedProperties = profile
    ? await db.savedProperty.findMany({
        where: {
          userId: profile.id
        },
        select: {
          propertyId: true
        }
      })
    : [];
  const savedIds = new Set(savedProperties.map((item) => item.propertyId));

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
              Find the right property faster
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Search homes, land, rentals, and investment options with simple
              filters, clear cards, and buyer actions that carry into your dashboard.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/saved">My Saved Properties</Link>
          </Button>
        </div>

        <form className="mt-8 grid gap-3 rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-sm md:grid-cols-4 xl:grid-cols-9">
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
          <select
            className="h-11 rounded-2xl border border-border px-3 text-sm font-semibold outline-none"
            defaultValue={valueOf(params.sort) || "recommended"}
            name="sort"
          >
            {sorts.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              saved={savedIds.has(property.id)}
            />
          ))}
          {!properties.length ? (
            <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-bold">No properties match this search</h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Try a wider budget, another city, or remove the verified-only filter.
                HomeZone will show the closest matches as soon as they are available.
              </p>
              <Button asChild className="mt-6">
                <Link href="/properties">Reset search</Link>
              </Button>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
