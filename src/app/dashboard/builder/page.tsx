import Link from "next/link";
import { redirect } from "next/navigation";
import { BuilderEnterpriseDashboard, type BuilderEnterpriseData } from "@/components/builder/builder-enterprise-dashboard";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { getBuilderEnterpriseData } from "@/lib/builder/queries";

export const dynamic = "force-dynamic";

export default async function DashboardBuilderPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/builder");
  }

  const profile = await getOrCreateProfile(user);
  const raw = await getBuilderEnterpriseData(profile.id);
  const data: BuilderEnterpriseData = {
    analytics: raw.analytics,
    bookings: raw.bookings.map((booking) => ({
      id: booking.id,
      leadName: booking.lead?.name ?? "Direct buyer",
      projectName: booking.project.name,
      saleValue: Number(booking.saleValue ?? booking.unit.price ?? 0),
      status: booking.status,
      unitNumber: booking.unit.unitNumber
    })),
    campaigns: raw.campaigns.map((campaign) => ({
      channel: campaign.channel,
      id: campaign.id,
      leadsCount: campaign.leadsCount,
      name: campaign.name,
      projectName: campaign.project.name,
      status: campaign.status
    })),
    leads: raw.leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      stage: lead.stage
    })),
    plan: raw.plan,
    projects: raw.projects.map((project) => ({
      availableUnits: project.availableUnits ?? project.units.filter((unit) => unit.status === "AVAILABLE").length,
      bookings: project.bookings.length,
      campaigns: project.campaigns.length,
      city: project.city,
      constructionStatus: project.constructionStatus,
      id: project.id,
      leads: raw.leads.filter((lead) => lead.property?.city === project.city).length,
      name: project.name,
      status: project.status,
      team: project.team.length,
      towers: project.towers.map((tower) => ({ id: tower.id, name: tower.name })),
      units: project.units.map((unit) => ({
        id: unit.id,
        price: Number(unit.price ?? 0),
        status: unit.status,
        unitNumber: unit.unitNumber,
        unitType: unit.unitType
      }))
    })),
    team: raw.team.map((member) => ({
      active: member.active,
      id: member.id,
      name: member.name,
      role: member.role
    }))
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-10">
          <BuilderEnterpriseDashboard data={data} />
        </div>
      </section>
    </main>
  );
}
