import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { ServicesDashboard, type ServicesDashboardData } from "@/components/services/services-dashboard";
import { ProviderOnboardingForm } from "@/components/services/provider-onboarding-form";
import { Button } from "@/components/ui/button";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getProviderDashboardData } from "@/lib/services/marketplace";

export const dynamic = "force-dynamic";

export default async function DashboardServicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth?next=/dashboard/services");

  const profile = await getOrCreateProfile(user);
  const [requests, providerDashboard, provider] = await Promise.all([
    db.serviceRequest.findMany({
      include: {
        booking: {
          include: {
            provider: true
          }
        },
        quotes: {
          include: {
            provider: true
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" },
      where: { requesterId: profile.id }
    }),
    getProviderDashboardData(profile.id),
    db.serviceProvider.findFirst({ where: { profileId: profile.id } })
  ]);

  const data: ServicesDashboardData = {
    providerDashboard: providerDashboard
      ? {
          analytics: providerDashboard.analytics,
          provider: {
            businessName: providerDashboard.provider.businessName,
            category: providerDashboard.provider.category,
            city: providerDashboard.provider.city,
            verified: providerDashboard.provider.verified
          },
          quoteRequests: providerDashboard.quoteRequests.map((request) => ({
            budget: request.budget,
            category: request.category,
            city: request.city,
            id: request.id,
            message: request.message
          }))
        }
      : null,
    providerExists: Boolean(provider),
    requests: requests.map((request) => ({
      budget: request.budget,
      booking: request.booking
        ? {
            amount: Number(request.booking.amount ?? 0),
            id: request.booking.id,
            providerName: request.booking.provider.businessName,
            status: request.booking.status
          }
        : null,
      category: request.category,
      city: request.city,
      id: request.id,
      message: request.message,
      quotes: request.quotes.map((quote) => ({
        amount: Number(quote.amount ?? 0),
        id: quote.id,
        message: quote.message,
        providerName: quote.provider?.businessName ?? "Provider",
        revision: quote.revision,
        status: quote.status
      })),
      status: request.status
    }))
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">Dashboard</Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Services Marketplace</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Services workspace</h1>
          </div>
          <Button asChild size="lg"><Link href="/services"><Wrench className="h-4 w-4" /> Request Service</Link></Button>
        </div>
        <div className="mt-10">
          {provider ? <ServicesDashboard data={data} /> : <div className="space-y-8"><ServicesDashboard data={data} /><ProviderOnboardingForm /></div>}
        </div>
      </section>
    </main>
  );
}
