"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentProduct } from "@prisma/client";
import { BarChart3, Building2, CalendarDays, CheckCircle2, Home, IndianRupee, Layers3, Plus, UsersRound } from "lucide-react";
import { PaymentButton } from "@/components/payments/payment-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type BuilderEnterpriseData = {
  analytics: {
    activeProjects: number;
    availableUnits: number;
    campaignPerformance: number;
    newLeads: number;
    reservedUnits: number;
    revenuePipeline: number;
    soldRevenue: number;
    soldUnits: number;
    teamActivity: number;
    totalUnits: number;
    visits: number;
  };
  bookings: {
    id: string;
    leadName: string;
    projectName: string;
    saleValue: number;
    status: string;
    unitNumber: string;
  }[];
  campaigns: {
    channel: string;
    id: string;
    leadsCount: number;
    name: string;
    projectName: string;
    status: string;
  }[];
  leads: {
    id: string;
    name: string;
    phone: string | null;
    stage: string;
  }[];
  plan: {
    limits: {
      projects: number;
      teamMembers: number;
      units: number;
    };
    plan: "BASIC" | "PRO" | "ENTERPRISE";
  };
  projects: {
    availableUnits: number;
    bookings: number;
    campaigns: number;
    city: string;
    constructionStatus: string;
    id: string;
    leads: number;
    name: string;
    status: string;
    team: number;
    towers: { id: string; name: string }[];
    units: {
      id: string;
      price: number;
      status: string;
      unitNumber: string;
      unitType: string;
    }[];
  }[];
  team: {
    active: boolean;
    id: string;
    name: string;
    role: string;
  }[];
};

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

export function BuilderEnterpriseDashboard({ data }: { data: BuilderEnterpriseData }) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id ?? "");
  const [projectName, setProjectName] = useState("New Residential Project");
  const [city, setCity] = useState("Kochi");
  const [towerName, setTowerName] = useState("Tower A");
  const [unitNumber, setUnitNumber] = useState("A-101");
  const [teamName, setTeamName] = useState("");
  const [campaignName, setCampaignName] = useState("Launch Campaign");
  const [loading, setLoading] = useState("");

  const selectedProject = useMemo(
    () => data.projects.find((project) => project.id === selectedProjectId) ?? data.projects[0],
    [data.projects, selectedProjectId]
  );

  async function post(path: string, body: Record<string, unknown>) {
    setLoading(path);
    await fetch(path, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setLoading("");
    router.refresh();
  }

  async function patch(path: string, body: Record<string, unknown>) {
    setLoading(path);
    await fetch(path, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[1fr_.45fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-bold text-violet-700">Builder Enterprise</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Project command center</h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Manage projects, towers, inventory, bookings, leads, sales teams, campaigns, and reports from one builder workspace.
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white sm:p-10">
            <p className="text-sm font-bold text-white/70">Builder Plan</p>
            <h2 className="mt-2 text-4xl font-bold">{data.plan.plan}</h2>
            <p className="mt-3 text-white/70">
              Projects {data.projects.length}/{data.plan.limits.projects} / Units {data.analytics.totalUnits}/{data.plan.limits.units}
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Building2} label="Active Projects" value={data.analytics.activeProjects} />
        <Metric icon={Layers3} label="Total Units" value={data.analytics.totalUnits} />
        <Metric icon={Home} label="Available Units" value={data.analytics.availableUnits} />
        <Metric icon={CheckCircle2} label="Sold Units" value={data.analytics.soldUnits} />
        <Metric icon={IndianRupee} label="Revenue Pipeline" value={rupees(data.analytics.revenuePipeline)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.5fr]">
        <Card className="p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-700">Projects</p>
              <h2 className="mt-1 text-3xl font-bold">Project portfolio</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setProjectName(event.target.value)} value={projectName} />
              <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setCity(event.target.value)} value={city} />
              <Button disabled={loading !== ""} onClick={() => post("/api/builder/projects", {
                campaignStatus: "DRAFT",
                city,
                constructionStatus: "PLANNING",
                description: `${projectName} is managed through HomeZone Builder Enterprise.`,
                name: projectName,
                status: "DRAFT"
              })}>
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.projects.map((project) => (
              <button
                className={`rounded-[1.5rem] border bg-white p-5 text-left shadow-sm ${selectedProjectId === project.id ? "border-violet-300 ring-4 ring-violet-100" : ""}`}
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <p className="text-xs font-bold text-violet-700">{project.status} / {project.constructionStatus}</p>
                <h3 className="mt-2 text-2xl font-bold">{project.name}</h3>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">{project.city} / {project.availableUnits} available</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Mini label="Units" value={project.units.length} />
                  <Mini label="Towers" value={project.towers.length} />
                  <Mini label="Bookings" value={project.bookings} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={(event) => {
                    event.stopPropagation();
                    patch(`/api/builder/projects/${project.id}`, { status: "PUBLISHED" });
                  }} size="sm" variant="outline">
                    Publish
                  </Button>
                  <Button onClick={(event) => {
                    event.stopPropagation();
                    patch(`/api/builder/projects/${project.id}`, { status: "ARCHIVED" });
                  }} size="sm" variant="outline">
                    Archive
                  </Button>
                </div>
              </button>
            ))}
            {!data.projects.length ? <Empty title="No builder projects yet" text="Create your first project to configure towers, units, team, bookings, and campaigns." /> : null}
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Enterprise Subscription</p>
          <div className="mt-4 space-y-3">
            <Plan active={data.plan.plan === "BASIC"} name="Builder Basic" text="Starter project and inventory tools" />
            <Plan active={data.plan.plan === "PRO"} name="Builder Pro" product="BUILDER_YEARLY" text="Higher project, team, and inventory limits" />
            <Plan active={data.plan.plan === "ENTERPRISE"} name="Builder Enterprise" product="BUILDER_ENTERPRISE" text="Large-scale launch and sales operations" />
          </div>
        </Card>
      </section>

      {selectedProject ? (
        <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Configure {selectedProject.name}</p>
            <div className="mt-5 space-y-5">
              <ActionBlock title="Add Tower">
                <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setTowerName(event.target.value)} value={towerName} />
                <Button onClick={() => post(`/api/builder/projects/${selectedProject.id}/towers`, { floors: 20, name: towerName, status: "ACTIVE" })}>
                  Add Tower
                </Button>
              </ActionBlock>
              <ActionBlock title="Add Unit">
                <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setUnitNumber(event.target.value)} value={unitNumber} />
                <Button onClick={() => post(`/api/builder/projects/${selectedProject.id}/units`, {
                  areaValue: 1250,
                  bathrooms: 2,
                  bedrooms: 3,
                  floor: 1,
                  price: 8500000,
                  towerId: selectedProject.towers[0]?.id,
                  unitNumber,
                  unitType: "3 BHK"
                })}>
                  Add Unit
                </Button>
              </ActionBlock>
              <ActionBlock title="Invite Sales Team">
                <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setTeamName(event.target.value)} placeholder="Team member name" value={teamName} />
                <Button disabled={!teamName} onClick={() => post(`/api/builder/projects/${selectedProject.id}/team`, {
                  name: teamName,
                  permissions: ["LEADS", "INVENTORY"],
                  role: "SALES"
                })}>
                  Invite
                </Button>
              </ActionBlock>
              <ActionBlock title="Launch Campaign">
                <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setCampaignName(event.target.value)} value={campaignName} />
                <Button onClick={() => post(`/api/builder/projects/${selectedProject.id}/campaigns`, {
                  channel: "HOMEZONE",
                  name: campaignName,
                  status: "ACTIVE"
                })}>
                  Create Campaign
                </Button>
              </ActionBlock>
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Inventory & Booking</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {selectedProject.units.map((unit) => (
                <div className="rounded-[1.5rem] border bg-white p-5" key={unit.id}>
                  <p className="text-xs font-bold text-violet-700">{unit.status}</p>
                  <h3 className="mt-2 text-2xl font-bold">{unit.unitNumber}</h3>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">{unit.unitType} / {rupees(unit.price)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={unit.status !== "AVAILABLE"} onClick={() => post(`/api/builder/projects/${selectedProject.id}/bookings`, { unitId: unit.id, saleValue: unit.price })} size="sm" variant="outline">
                      Reserve
                    </Button>
                  </div>
                </div>
              ))}
              {!selectedProject.units.length ? <Empty title="No units configured" text="Add units to begin inventory and booking management." /> : null}
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-violet-700"><UsersRound className="h-4 w-4" /> Team Activity</p>
          <div className="mt-4 space-y-3">
            {data.team.map((member) => <Mini key={member.id} label={member.role} value={member.name} />)}
          </div>
        </Card>
        <Card className="p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-violet-700"><CalendarDays className="h-4 w-4" /> Leads & Visits</p>
          <div className="mt-4 grid gap-3">
            <Mini label="New Leads" value={data.analytics.newLeads} />
            <Mini label="Site Visits" value={data.analytics.visits} />
            <Mini label="Campaign Leads" value={data.analytics.campaignPerformance} />
          </div>
        </Card>
        <Card className="p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-violet-700"><BarChart3 className="h-4 w-4" /> Reports</p>
          <div className="mt-4 grid gap-3">
            <Mini label="Sold Revenue" value={rupees(data.analytics.soldRevenue)} />
            <Mini label="Reserved Units" value={data.analytics.reservedUnits} />
            <Mini label="Sold Units" value={data.analytics.soldUnits} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number | string }) {
  return (
    <Card className="p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Icon className="h-5 w-5" /></span>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl bg-muted p-3"><p className="font-bold">{value}</p><p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p></div>;
}

function ActionBlock({ children, title }: { children: ReactNode; title: string }) {
  return <div className="rounded-[1.5rem] border bg-white p-4"><p className="font-bold">{title}</p><div className="mt-3 grid gap-3">{children}</div></div>;
}

function Plan({ active, name, product, text }: { active: boolean; name: string; product?: PaymentProduct; text: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="font-bold">{name}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      {!active && product ? <div className="mt-3"><PaymentButton label={`Upgrade to ${name}`} product={product} variant="outline" /></div> : null}
    </div>
  );
}

function Empty({ text, title }: { text: string; title: string }) {
  return <div className="rounded-[1.5rem] border border-dashed bg-white p-6 text-center"><h3 className="text-xl font-bold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>;
}
