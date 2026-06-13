import { notFound } from "next/navigation";
import Link from "next/link";
import { Bookmark, MapPin, Share2, Sparkles } from "lucide-react";
import { VerificationGate } from "@/components/account/verification-gate";
import { ContactPropertyForm } from "@/components/properties/contact-property-form";
import { ReportButton } from "@/components/reports/report-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMarketplaceProperty } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const property = await getMarketplaceProperty(id);

  if (!property) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/properties">
          HomeZone Properties
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <div className="flex aspect-[16/10] items-end rounded-[2.5rem] bg-gradient-to-br from-violet-700 via-fuchsia-500 to-cyan-400 p-7 text-white shadow-glow">
              <div>
                <p className="rounded-full bg-white/18 px-3 py-1 text-sm font-bold">
                  {property.type}
                </p>
                <h1 className="mt-4 text-5xl font-bold tracking-tight">
                  {property.title}
                </h1>
              </div>
            </div>

            <Card className="mt-8 p-6 shadow-sm sm:p-8">
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <Sparkles className="h-4 w-4" />
                AI Summary
              </p>
              <p className="mt-4 text-xl font-bold leading-9">
                This property has been prepared for guided discovery.
                HomeZone score is {property.score}/100 with rental signal{" "}
                {property.rentalYield}. {property.description}
              </p>
            </Card>

            <Card className="mt-8 p-6 shadow-sm sm:p-8">
              <h2 className="text-3xl font-bold">Highlights</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {property.highlights.map((highlight) => (
                  <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold" key={highlight}>
                    {highlight}
                  </span>
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
              <p className="mt-4 text-5xl font-bold">{property.priceLabel}</p>
              <p className="mt-2 text-sm font-semibold text-emerald-600">
                HomeZone Score {property.score}/100
              </p>
              <ContactPropertyForm propertyId={property.id} />
              <div className="mt-3 grid gap-3">
                <Button asChild size="lg" variant="outline">
                  <a href="/auth">
                    <Bookmark className="h-4 w-4" />
                    Save Property
                  </a>
                </Button>
                <Button size="lg" variant="outline">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <ReportButton entityId={property.id} entityType="property" />
              </div>
            </Card>

            <VerificationGate action="contact, save, or book a site visit" />
          </aside>
        </div>
      </section>
    </main>
  );
}
