import Link from "next/link";
import { redirect } from "next/navigation";
import { BrokerProCrm, type BrokerProData } from "@/components/pro/broker-pro-crm";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { getBrokerProDashboardData } from "@/lib/pro/queries";

export const dynamic = "force-dynamic";

export default async function DashboardProPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/pro");
  }

  const profile = await getOrCreateProfile(user);
  const raw = await getBrokerProDashboardData(profile.id);
  const data: BrokerProData = {
    analytics: raw.analytics,
    automations: raw.automations.map((rule) => ({
      channel: rule.channel,
      enabled: rule.enabled,
      id: rule.id,
      template: rule.template,
      trigger: rule.trigger
    })),
    calendar: {
      followUpsDue: raw.calendar.followUpsDue.map((task) => ({
        dueAt: task.dueAt?.toISOString() ?? null,
        id: task.id,
        leadName: task.lead?.name ?? "Lead",
        title: task.title
      })),
      visitsToday: raw.calendar.visitsToday.map((visit) => ({
        id: visit.id,
        leadName: visit.lead?.name ?? "Lead",
        propertyTitle: visit.property?.title ?? "Property",
        scheduledAt: visit.scheduledAt.toISOString(),
        status: visit.status
      }))
    },
    commissionTotals: raw.commissionTotals,
    commissions: raw.commissions.map((commission) => ({
      amount: Number(commission.commissionAmount),
      dealValue: Number(commission.dealValue),
      id: commission.id,
      leadName: commission.lead?.name ?? "Lead",
      status: commission.status
    })),
    leads: raw.leads.map((lead) => ({
      aiScore: lead.aiScore,
      assignmentLabel: lead.brokerAssignments[0]?.assignee?.name ?? lead.assigned?.fullName ?? "Unassigned",
      dealValue: Number(lead.dealValue ?? 0),
      documents: lead.clientDocuments.length,
      id: lead.id,
      message: lead.message,
      name: lead.name,
      phone: lead.phone,
      propertyTitle: lead.property?.title ?? "Property not linked",
      source: lead.source,
      stage: lead.stage,
      tasks: lead.tasks.length,
      visits: lead.siteVisits.length
    })),
    plan: raw.plan,
    stageGroups: raw.stageGroups.map((item) => ({
      count: item._count._all,
      stage: item.stage
    })),
    team: raw.team.map((member) => ({
      active: member.active,
      email: member.email,
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
          <BrokerProCrm data={data} />
        </div>
      </section>
    </main>
  );
}
