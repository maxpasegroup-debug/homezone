import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProviderOnboardingForm } from "@/components/services/provider-onboarding-form";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardServicesPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/services");
  }

  const profile = await getOrCreateProfile(user);
  const [requests, provider] = await Promise.all([
    db.serviceRequest.findMany({
      where: {
        requesterId: profile.id
      },
      include: {
        quotes: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.serviceProvider.findFirst({
      where: {
        profileId: profile.id
      }
    })
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              Services Marketplace
            </p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Service requests
            </h1>
          </div>
          <Button asChild size="lg">
            <Link href="/services">
              <Wrench className="h-4 w-4" />
              Request Service
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <Card className="p-6 shadow-sm" key={request.id}>
              <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {request.status}
              </p>
              <h2 className="mt-5 text-2xl font-bold">{request.category}</h2>
              <p className="mt-2 text-sm font-semibold text-violet-700">
                {request.city} / {request.budget ?? "Budget not set"}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {request.message}
              </p>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-emerald-600">
                <BadgeCheck className="h-4 w-4" />
                {request.quotes.length} quotes received
              </p>
            </Card>
          ))}
          {!requests.length ? (
            <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-bold">No service requests yet</h2>
              <p className="mt-3 text-muted-foreground">
                Request legal, loans, interiors, movers, solar, cleaning, and more.
              </p>
            </Card>
          ) : null}
        </div>

        <div className="mt-10">
          {provider ? (
            <Card className="p-6 shadow-soft sm:p-8">
              <p className="text-sm font-semibold text-violet-700">
                Provider profile
              </p>
              <h2 className="mt-2 text-3xl font-bold">{provider.businessName}</h2>
              <p className="mt-2 text-muted-foreground">
                {provider.category} / {provider.city ?? "City not set"} /{" "}
                {provider.priceLabel ?? "Price not set"}
              </p>
              <p className="mt-5 rounded-full bg-muted px-4 py-2 text-sm font-bold">
                {provider.verified ? "Verified" : "Pending verification"}
              </p>
            </Card>
          ) : (
            <ProviderOnboardingForm />
          )}
        </div>
      </section>
    </main>
  );
}
