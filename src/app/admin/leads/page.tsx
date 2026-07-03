import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Clock3, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth/admin";
import { formatAdminStatus, getAdminLeadOversight } from "@/lib/admin/operations";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  await requireAdminProfile();
  const data = await getAdminLeadOversight();
  const total = data.leads.length;
  const won = data.leads.filter((lead) => lead.stage === "WON").length;
  const conversion = total ? Math.round((won / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/admin">Admin</Link>
        <h1 className="mt-8 text-5xl font-bold tracking-tight">Lead oversight</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Read-only operational visibility into all marketplace leads, response quality, stuck deals, and scheduled site visits.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Metric icon={<UsersRound className="h-5 w-5" />} label="Total Leads" value={total} />
          <Metric icon={<Clock3 className="h-5 w-5" />} label="Avg Response Hours" value={data.avgResponseHours} />
          <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Stuck Leads" value={data.stuck.length} />
          <Metric icon={<UsersRound className="h-5 w-5" />} label="Conversion %" value={conversion} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_.8fr]">
          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Pipeline Health</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.stages.map((stage) => (
                <div className="rounded-2xl bg-muted p-4" key={stage.stage}>
                  <p className="text-2xl font-bold">{stage._count._all}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{formatAdminStatus(stage.stage)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Site Visits</p>
            <div className="mt-5 space-y-3">
              {data.visits.map((visit) => (
                <div className="rounded-2xl bg-muted p-4" key={visit.id}>
                  <p className="text-sm font-bold">{visit.lead.name}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {visit.scheduledAt.toLocaleString("en-IN")} · {visit.status} · {visit.property?.title ?? "Property not set"}
                  </p>
                </div>
              ))}
              {!data.visits.length ? <p className="text-sm text-muted-foreground">No site visits scheduled.</p> : null}
            </div>
          </Card>
        </div>

        <Card className="mt-8 p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Stuck Leads</p>
          <div className="mt-5 grid gap-3">
            {data.stuck.map((lead) => (
              <div className="rounded-2xl bg-muted p-4" key={lead.id}>
                <p className="text-sm font-bold">{lead.name}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {formatAdminStatus(lead.stage)} · Updated {lead.updatedAt.toLocaleDateString("en-IN")} · {lead.property?.title ?? "No property"}
                </p>
              </div>
            ))}
            {!data.stuck.length ? <p className="text-sm text-muted-foreground">No stuck leads right now.</p> : null}
          </div>
        </Card>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="p-5 shadow-sm">
      <div className="text-violet-700">{icon}</div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}
