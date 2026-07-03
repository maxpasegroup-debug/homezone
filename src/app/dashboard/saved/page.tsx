import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PropertyCard } from "@/components/properties/property-card";
import { ShortlistManager } from "@/components/properties/shortlist-manager";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMarketplacePropertiesByIds } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/saved");
  }

  const profile = await getOrCreateProfile(user);
  const [saved, shortlists] = await Promise.all([
    db.savedProperty.findMany({
      where: {
        userId: profile.id
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.propertyShortlist.findMany({
      where: {
        userId: profile.id
      },
      include: {
        items: {
          include: {
            property: {
              select: {
                city: true,
                id: true,
                locality: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })
  ]);
  const savedProperties = await getMarketplacePropertiesByIds(saved.map((item) => item.propertyId));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <h1 className="mt-8 text-5xl font-bold tracking-tight">
          Saved Properties
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Keep your best options, organize them into named shortlists, compare
          side by side, and continue from where you left off.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {savedProperties.map((property) => (
            <PropertyCard key={property.id} property={property} saved />
          ))}
          {!savedProperties.length ? (
            <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-bold">Nothing saved yet</h2>
              <p className="mt-3 text-muted-foreground">
                Save properties from the marketplace to compare later.
              </p>
              <Link className="mt-5 inline-flex font-bold text-violet-700" href="/properties">
                Browse properties
              </Link>
            </Card>
          ) : null}
        </div>

        <section className="mt-12">
          <p className="text-sm font-semibold text-violet-700">
            Buyer Shortlists
          </p>
          <h2 className="mt-2 text-3xl font-bold">Organize your options</h2>
          <div className="mt-6">
            <ShortlistManager initialShortlists={shortlists} />
          </div>
        </section>
      </section>
    </main>
  );
}
