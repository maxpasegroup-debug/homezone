"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStage, PaymentProduct } from "@prisma/client";
import { BarChart3, CalendarDays, CheckCircle2, IndianRupee, Lock, Plus, UserPlus, UsersRound, Zap } from "lucide-react";
import { PaymentButton } from "@/components/payments/payment-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type BrokerProData = {
  analytics: {
    activeDeals: number;
    conversionRate: number;
    followUpsDue: number;
    monthlyClosings: number;
    newLeads: number;
    pipelineValue: number;
    revenueEstimate: number;
    siteVisitsToday: number;
    winLossRatio: number;
  };
  automations: {
    id: string;
    channel: string;
    enabled: boolean;
    template: string;
    trigger: string;
  }[];
  calendar: {
    followUpsDue: { id: string; title: string; dueAt: string | null; leadName: string }[];
    visitsToday: { id: string; scheduledAt: string; status: string; leadName: string; propertyTitle: string }[];
  };
  commissionTotals: {
    outstanding: number;
    paid: number;
    pending: number;
  };
  commissions: {
    id: string;
    amount: number;
    dealValue: number;
    leadName: string;
    status: string;
  }[];
  leads: {
    aiScore: number;
    assignmentLabel: string;
    dealValue: number;
    documents: number;
    id: string;
    message: string | null;
    name: string;
    phone: string | null;
    propertyTitle: string;
    source: string;
    stage: LeadStage;
    tasks: number;
    visits: number;
  }[];
  plan: {
    limits: {
      automations: number;
      teamMembers: number;
    };
    plan: "FREE" | "PRO" | "ENTERPRISE";
  };
  stageGroups: {
    count: number;
    stage: string;
  }[];
  team: {
    active: boolean;
    email: string | null;
    id: string;
    name: string;
    role: string;
  }[];
};

const stages: LeadStage[] = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "WON", "LOST", "NURTURE"];

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

export function BrokerProCrm({ data }: { data: BrokerProData }) {
  const router = useRouter();
  const [filter, setFilter] = useState<LeadStage | "ALL">("ALL");
  const [teamName, setTeamName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [automationTemplate, setAutomationTemplate] = useState("Hi {{name}}, following up on your HomeZone property inquiry.");
  const [loading, setLoading] = useState("");

  const visibleLeads = useMemo(() => {
    if (filter === "ALL") return data.leads;
    return data.leads.filter((lead) => lead.stage === filter);
  }, [data.leads, filter]);

  async function updateLead(leadId: string, stage: LeadStage) {
    setLoading(`${leadId}-${stage}`);
    await fetch(`/api/pro/leads/${leadId}`, {
      body: JSON.stringify({ stage }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading("");
    router.refresh();
  }

  async function addTeamMember() {
    if (!teamName) return;
    setLoading("team");
    await fetch("/api/pro/team", {
      body: JSON.stringify({
        email: teamEmail || undefined,
        name: teamName,
        permissions: ["LEADS"],
        role: "AGENT"
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setLoading("");
    setTeamName("");
    setTeamEmail("");
    router.refresh();
  }

  async function assignLead(leadId: string, assigneeId: string) {
    setLoading(`assign-${leadId}`);
    await fetch(`/api/pro/leads/${leadId}/assignments`, {
      body: JSON.stringify({ assigneeId, notes: "Assigned from Broker Pro dashboard." }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setLoading("");
    router.refresh();
  }

  async function addCommission(leadId: string) {
    const dealValue = Number(window.prompt("Deal value", "7500000") ?? 0);
    const commissionPercent = Number(window.prompt("Commission %", "2") ?? 0);
    if (!dealValue || !commissionPercent) return;
    setLoading(`commission-${leadId}`);
    await fetch(`/api/pro/leads/${leadId}/commission`, {
      body: JSON.stringify({ commissionPercent, dealValue, status: "PENDING" }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setLoading("");
    router.refresh();
  }

  async function addAutomation() {
    setLoading("automation");
    await fetch("/api/pro/automation", {
      body: JSON.stringify({
        channel: "WHATSAPP",
        enabled: true,
        template: automationTemplate,
        trigger: "FOLLOW_UP_DUE"
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setLoading("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[1fr_.45fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-bold text-violet-700">Broker Pro CRM</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Broker command center</h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Manage team assignments, pipeline, calendar, client workspace, commissions, and automation-ready follow-ups.
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white sm:p-10">
            <p className="text-sm font-bold text-white/70">Current Plan</p>
            <h2 className="mt-2 text-4xl font-bold">{data.plan.plan}</h2>
            <p className="mt-3 text-white/70">
              Team {data.team.length}/{data.plan.limits.teamMembers} / Automation {data.automations.length}/{data.plan.limits.automations}
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={UsersRound} label="New Leads" value={data.analytics.newLeads} />
        <Metric icon={BarChart3} label="Active Deals" value={data.analytics.activeDeals} />
        <Metric icon={CalendarDays} label="Visits Today" value={data.analytics.siteVisitsToday} />
        <Metric icon={CheckCircle2} label="Follow-ups Due" value={data.analytics.followUpsDue} />
        <Metric icon={IndianRupee} label="Revenue Estimate" value={rupees(data.analytics.revenueEstimate)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.48fr]">
        <Card className="p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-700">Pipeline</p>
              <h2 className="mt-1 text-3xl font-bold">Lead workspace</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["ALL", ...stages].map((stage) => (
                <button
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${filter === stage ? "bg-violet-700 text-white" : "bg-muted text-muted-foreground"}`}
                  key={stage}
                  onClick={() => setFilter(stage as LeadStage | "ALL")}
                >
                  {stage.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {visibleLeads.map((lead) => (
              <div className="rounded-[1.5rem] border bg-white p-5" key={lead.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold text-violet-700">{lead.stage.replace("_", " ")} / {lead.source}</p>
                    <h3 className="mt-1 text-2xl font-bold">{lead.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{lead.message ?? "No message captured."}</p>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">{lead.phone ?? "No phone"} / {lead.propertyTitle}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:min-w-64">
                    <Mini label="Score" value={lead.aiScore} />
                    <Mini label="Visits" value={lead.visits} />
                    <Mini label="Docs" value={lead.documents} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <select
                    className="h-11 rounded-xl border px-3 text-sm font-semibold"
                    disabled={!data.team.length}
                    onChange={(event) => assignLead(lead.id, event.target.value)}
                    value=""
                  >
                    <option value="">Assign to team</option>
                    {data.team.filter((member) => member.active).map((member) => (
                      <option key={member.id} value={member.id}>{member.name} / {member.role}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={loading === `commission-${lead.id}`} onClick={() => addCommission(lead.id)} size="sm" variant="outline">
                      Commission
                    </Button>
                    {stages.map((stage) => (
                      <Button disabled={Boolean(loading)} key={stage} onClick={() => updateLead(lead.id, stage)} size="sm" variant={lead.stage === stage ? "default" : "outline"}>
                        {stage.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {!visibleLeads.length ? <Empty title="No leads here" text="New inquiries, assigned owner leads, and broker-created leads will appear in this workspace." /> : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <UserPlus className="h-4 w-4" />
              Team Management
            </p>
            <div className="mt-4 grid gap-3">
              <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setTeamName(event.target.value)} placeholder="Agent name" value={teamName} />
              <input className="h-11 rounded-xl border px-3 text-sm" onChange={(event) => setTeamEmail(event.target.value)} placeholder="Agent email" value={teamEmail} />
              <Button disabled={loading === "team"} onClick={addTeamMember}>
                <Plus className="h-4 w-4" />
                Invite Team Member
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {data.team.map((member) => (
                <div className="rounded-2xl bg-muted p-4" key={member.id}>
                  <p className="font-bold">{member.name}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{member.role} / {member.active ? "Active" : "Inactive"}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <Zap className="h-4 w-4" />
              Automation Ready
            </p>
            <textarea className="mt-4 min-h-24 w-full rounded-xl border p-3 text-sm" onChange={(event) => setAutomationTemplate(event.target.value)} value={automationTemplate} />
            <Button className="mt-3 w-full" disabled={loading === "automation"} onClick={addAutomation} variant="outline">
              Save WhatsApp Rule
            </Button>
            <div className="mt-4 space-y-3">
              {data.automations.map((rule) => (
                <div className="rounded-2xl bg-muted p-4" key={rule.id}>
                  <p className="text-sm font-bold">{rule.channel} / {rule.trigger}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{rule.enabled ? "Enabled" : "Paused"}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Calendar</p>
          <div className="mt-4 space-y-3">
            {data.calendar.visitsToday.map((visit) => (
              <div className="rounded-2xl bg-muted p-4" key={visit.id}>
                <p className="font-bold">{visit.leadName}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{new Date(visit.scheduledAt).toLocaleString("en-IN")} / {visit.propertyTitle}</p>
              </div>
            ))}
            {data.calendar.followUpsDue.map((task) => (
              <div className="rounded-2xl bg-muted p-4" key={task.id}>
                <p className="font-bold">{task.title}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{task.leadName}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Commission Tracking</p>
          <div className="mt-4 grid gap-3">
            <Mini label="Paid" value={rupees(data.commissionTotals.paid)} />
            <Mini label="Pending" value={rupees(data.commissionTotals.pending)} />
            <Mini label="Outstanding" value={rupees(data.commissionTotals.outstanding)} />
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Subscription</p>
          <div className="mt-4 space-y-3">
            <Plan name="Free" text="Basic lead workspace" active={data.plan.plan === "FREE"} />
            <Plan name="Pro" text="Team CRM and automations" active={data.plan.plan === "PRO"} product="BROKER_MONTHLY" />
            <Plan name="Enterprise" text="Large brokerage operations" active={data.plan.plan === "ENTERPRISE"} product="BROKER_ENTERPRISE" />
          </div>
        </Card>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number | string }) {
  return (
    <Card className="p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="font-bold">{value}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

function Plan({ active, name, product, text }: { active: boolean; name: string; product?: PaymentProduct; text: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="flex items-center gap-2 font-bold">
        {active ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-violet-700" />}
        {name}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      {!active && product ? (
        <div className="mt-3">
          <PaymentButton label={`Upgrade to ${name}`} product={product} variant="outline" />
        </div>
      ) : null}
    </div>
  );
}

function Empty({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed bg-white p-8 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
