import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { LeadStage, Prisma } from "@prisma/client";
import { BarChart3, KanbanSquare, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { leadAccessWhere, leadInboxStages } from "@/lib/leads/access";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    stage?: string;
  }>;
};

function stageLabel(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/leads");
  }

  const profile = await getOrCreateProfile(user);
  const params = await searchParams;
  const activeStage = params.stage ?? "ALL";
  const query = params.q?.trim();
  const baseAccess = leadAccessWhere(profile.id);
  const stageFilter = leadInboxStages.includes(activeStage as (typeof leadInboxStages)[number])
    ? activeStage
    : "ALL";
  const where: Prisma.LeadWhereInput = {
    AND: [
      baseAccess,
      stageFilter !== "ALL" ? { stage: stageFilter as LeadStage } : {},
      query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
              { property: { title: { contains: query, mode: "insensitive" as const } } }
            ]
          }
        : {}
    ]
  };

  const leads = await db.lead.findMany({
    include: {
      assigned: true,
      property: {
        include: {
          owner: true
        }
      },
      siteVisits: true,
      tasks: true
    },
    orderBy: {
      createdAt: "desc"
    },
    where
  });
  const allLeads = await db.lead.findMany({
    select: {
      closedAt: true,
      createdAt: true,
      firstRespondedAt: true,
      stage: true
    },
    where: baseAccess
  });
  const openTasks = await db.leadTask.count({
    where: {
      completedAt: null,
      lead: baseAccess
    }
  });
  const completedTasks = await db.leadTask.count({
    where: {
      completedAt: {
        not: null
      },
      lead: baseAccess
    }
  });

  const won = allLeads.filter((lead) => lead.stage === "WON").length;
  const lost = allLeads.filter((lead) => lead.stage === "LOST").length;
  const conversionRate = allLeads.length ? Math.round((won / allLeads.length) * 100) : 0;
  const responseTimes = allLeads
    .filter((lead) => lead.firstRespondedAt)
    .map((lead) => lead.firstRespondedAt!.getTime() - lead.createdAt.getTime());
  const avgResponseHours = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, item) => sum + item, 0) / responseTimes.length / 36_000) / 100
    : 0;
  const followUpCompletion = openTasks + completedTasks
    ? Math.round((completedTasks / (openTasks + completedTasks)) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">Dashboard</Link>
        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-violet-700">Lead Management</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Unified lead inbox</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Track every buyer inquiry from first contact to site visit, negotiation, and closure.
            </p>
          </div>
          <Button asChild>
            <Link href={"/dashboard/leads/pipeline" as Route}>
              <KanbanSquare className="h-4 w-4" />
              Pipeline
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric icon={<Users className="h-5 w-5" />} label="New Leads" value={allLeads.filter((lead) => lead.stage === "NEW").length} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Conversion" suffix="%" value={conversionRate} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Won Deals" value={won} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Lost Deals" value={lost} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Avg Response" suffix="h" value={avgResponseHours} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Follow-ups" suffix="%" value={followUpCompletion} />
        </div>

        <Card className="mt-8 p-4 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
              <input className="h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-sm font-semibold outline-none" defaultValue={query} name="q" placeholder="Search buyer, phone, email, or property" />
              <input name="stage" type="hidden" value={activeStage} />
            </label>
            <Button type="submit">Search</Button>
          </form>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {leadInboxStages.map((stage) => (
              <Link
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${stageFilter === stage ? "bg-violet-700 text-white" : "bg-muted text-muted-foreground"}`}
                href={`/dashboard/leads?stage=${stage}${query ? `&q=${encodeURIComponent(query)}` : ""}` as Route}
                key={stage}
              >
                {stageLabel(stage)}
              </Link>
            ))}
          </div>
        </Card>

        <div className="mt-8 grid gap-4">
          {leads.map((lead) => (
            <Card className="p-5 shadow-sm" key={lead.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{stageLabel(lead.stage)}</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{lead.priority}</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{lead.source}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold">{lead.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{[lead.phone, lead.email].filter(Boolean).join(" · ") || "Contact provided in inquiry"}</p>
                  <p className="mt-2 text-sm font-semibold text-violet-700">{lead.property?.title ?? "Property inquiry"}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{lead.message}</p>
                  <p className="mt-3 text-xs font-bold text-muted-foreground">
                    Owner: {lead.property?.owner?.fullName ?? "Unassigned"} · Broker: {lead.assigned?.fullName ?? "Not assigned"} · Created {lead.createdAt.toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/leads/${lead.id}` as Route}>Open Lead</Link>
                </Button>
              </div>
            </Card>
          ))}
          {!leads.length ? (
            <Card className="p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold">No leads found</h2>
              <p className="mt-3 text-muted-foreground">New buyer inquiries and follow-ups will appear here.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  suffix = "",
  value
}: {
  icon: ReactNode;
  label: string;
  suffix?: string;
  value: number;
}) {
  return (
    <Card className="p-5 shadow-sm">
      <div className="text-violet-700">{icon}</div>
      <p className="mt-3 text-3xl font-bold">{value}{suffix}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}
