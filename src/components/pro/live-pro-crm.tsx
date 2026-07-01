"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Loader2, MessageCircle, PhoneCall, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LiveLead = {
  id: string;
  name: string;
  phone: string | null;
  message: string | null;
  source: string;
  stage: string;
  aiScore: number;
  nextAction: string | null;
  followUpAt: Date | null;
  property?: {
    title: string;
    city: string;
  } | null;
  notes: {
    id: string;
    note: string;
  }[];
  tasks: {
    id: string;
    title: string;
    completedAt: Date | null;
  }[];
};

const stages = ["NEW", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "WON", "LOST", "NURTURE"];

export function LiveProCrm({ leads }: { leads: LiveLead[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState("");
  const [quickLeadName, setQuickLeadName] = useState("New Buyer Lead");
  const [quickLeadPhone, setQuickLeadPhone] = useState("+91 99999 99999");

  const visibleLeads = useMemo(() => {
    if (filter === "ALL") return leads;
    return leads.filter((lead) => lead.stage === filter);
  }, [filter, leads]);

  async function updateStage(leadId: string, stage: string) {
    setLoading(`${leadId}-${stage}`);
    await fetch(`/api/pro/leads/${leadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stage
      })
    });
    setLoading("");
    router.refresh();
  }

  async function addNote(leadId: string) {
    const note = window.prompt("Add lead note");
    if (!note) return;
    await fetch(`/api/pro/leads/${leadId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ note })
    });
    router.refresh();
  }

  async function addTask(leadId: string) {
    const title = window.prompt("Add follow-up task");
    if (!title) return;
    await fetch(`/api/pro/leads/${leadId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title })
    });
    router.refresh();
  }

  async function createQuickLead() {
    await fetch("/api/pro/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: quickLeadName,
        phone: quickLeadPhone,
        message: "Quick lead created from HomeZone Pro CRM.",
        source: "DASHBOARD"
      })
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Live Broker CRM</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Lead command center</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Manage real database leads, pipeline stages, notes, follow-ups, and WhatsApp-ready actions.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="h-12 rounded-2xl border border-border bg-white px-4 text-sm font-semibold outline-none"
              onChange={(event) => setQuickLeadName(event.target.value)}
              value={quickLeadName}
            />
            <input
              className="h-12 rounded-2xl border border-border bg-white px-4 text-sm font-semibold outline-none"
              onChange={(event) => setQuickLeadPhone(event.target.value)}
              value={quickLeadPhone}
            />
            <Button onClick={createQuickLead}>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto pb-2">
          {["ALL", ...stages].map((stage) => (
            <button
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                filter === stage
                  ? "bg-violet-700 text-white"
                  : "bg-muted text-muted-foreground hover:bg-violet-50 hover:text-violet-700"
              }`}
              key={stage}
              onClick={() => setFilter(stage)}
            >
              {stage.replace("_", " ")}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5">
        {visibleLeads.map((lead) => (
          <Card className="p-6 shadow-sm" key={lead.id}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold">{lead.name}</h2>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                    {lead.stage.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {lead.message ?? "No message"}
                </p>
                <p className="mt-2 text-sm font-bold text-muted-foreground">
                  {lead.source} / {lead.phone ?? "No phone"}
                </p>
                {lead.property ? (
                  <p className="mt-2 text-sm font-semibold text-violet-700">
                    Property: {lead.property.title}, {lead.property.city}
                  </p>
                ) : null}
              </div>
              <div className="lg:text-right">
                <p className="text-4xl font-bold">{lead.aiScore}</p>
                <p className="text-sm font-semibold text-emerald-600">AI lead score</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-violet-700" />
                Next action: {lead.nextAction ?? "Set follow-up"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => addNote(lead.id)} size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4" />
                  Note
                </Button>
                <Button onClick={() => addTask(lead.id)} size="sm" variant="outline">
                  <CheckCircle2 className="h-4 w-4" />
                  Task
                </Button>
                <Button size="sm">
                  <PhoneCall className="h-4 w-4" />
                  Call
                </Button>
              </div>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {stages.map((stage) => (
                <Button
                  disabled={Boolean(loading)}
                  key={stage}
                  onClick={() => updateStage(lead.id, stage)}
                  size="sm"
                  variant={lead.stage === stage ? "default" : "outline"}
                >
                  {loading === `${lead.id}-${stage}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {stage.replace("_", " ")}
                </Button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-muted p-4">
                <p className="text-sm font-bold">Recent notes</p>
                {lead.notes.length ? (
                  lead.notes.map((note) => (
                    <p className="mt-2 text-sm text-muted-foreground" key={note.id}>
                      {note.note}
                    </p>
                  ))
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No notes yet.</p>
                )}
              </div>
              <div className="rounded-[1.5rem] bg-muted p-4">
                <p className="text-sm font-bold">Tasks</p>
                {lead.tasks.length ? (
                  lead.tasks.map((task) => (
                    <p className="mt-2 text-sm text-muted-foreground" key={task.id}>
                      {task.title}
                    </p>
                  ))
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No tasks yet.</p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <Send className="h-4 w-4" />
                WhatsApp follow-up templates can be managed from the verified communication workflow.
              </p>
            </div>
          </Card>
        ))}
        {!visibleLeads.length ? (
          <Card className="p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No leads in this stage</h2>
            <p className="mt-3 text-muted-foreground">Add a quick lead or wait for property inquiries.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
