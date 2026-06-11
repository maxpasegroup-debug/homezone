"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  PhoneCall,
  Plus,
  Send,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  assistantCards,
  automationItems,
  brokerLeads,
  pipelineStages,
  proPlans
} from "@/lib/pro-data";

const leadStatuses = ["All Leads", "Hot", "Site Visit", "Nurture", "New"];

export function ProDashboard() {
  const [status, setStatus] = useState("All Leads");
  const [autoFollowup, setAutoFollowup] = useState(true);
  const [autoGreeting, setAutoGreeting] = useState(true);

  const visibleLeads = useMemo(() => {
    if (status === "All Leads") return brokerLeads;
    return brokerLeads.filter((lead) => lead.stage === status);
  }, [status]);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {pipelineStages.map((stage) => {
          const StageIcon = stage.icon;
          return (
            <Card className="p-6 shadow-sm" key={stage.title}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <StageIcon className="h-6 w-6" />
                </span>
                <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                  {stage.value}
                </p>
              </div>
              <h2 className="mt-6 text-3xl font-bold">{stage.count}</h2>
              <p className="mt-1 font-semibold text-muted-foreground">
                {stage.title} leads
              </p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Broker CRM
              </p>
              <h2 className="mt-1 text-4xl font-bold">Lead command center</h2>
            </div>
            <Button>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {leadStatuses.map((item) => (
              <button
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                  status === item
                    ? "bg-violet-700 text-white"
                    : "bg-muted text-muted-foreground hover:bg-violet-50 hover:text-violet-700"
                }`}
                key={item}
                onClick={() => setStatus(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {visibleLeads.map((lead) => (
              <div
                className="rounded-[1.5rem] border border-border bg-white p-5"
                key={lead.phone}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold">{lead.name}</h3>
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                        {lead.stage}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {lead.need}
                    </p>
                    <p className="mt-2 text-xs font-bold text-muted-foreground">
                      {lead.source} · {lead.phone}
                    </p>
                  </div>
                  <div className="min-w-36 lg:text-right">
                    <p className="text-3xl font-bold">{lead.score}</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      AI lead score
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-violet-700" />
                    Next action: {lead.next}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button size="sm">
                      <PhoneCall className="h-4 w-4" />
                      Call
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-8">
          <Card className="overflow-hidden shadow-soft">
            <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white">
              <p className="text-sm font-semibold text-white/62">
                AI Lead Assistant
              </p>
              <h2 className="mt-2 text-4xl font-bold">
                Know who to call first.
              </h2>
              <p className="mt-4 leading-7 text-white/72">
                HomeZone prioritizes serious buyers, reminds brokers, and
                recommends the next best action.
              </p>
            </div>
            <div className="grid gap-4 p-6">
              {assistantCards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <div className="rounded-[1.5rem] bg-muted p-5" key={card.title}>
                    <div className="flex gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700">
                        <CardIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          {card.title}
                        </p>
                        <h3 className="mt-1 text-xl font-bold">{card.value}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {card.note}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MessageCircle className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">
            WhatsApp Automation
          </p>
          <h2 className="mt-2 text-4xl font-bold">
            Follow up without losing leads.
          </h2>

          <div className="mt-7 space-y-4">
            <label className="flex items-center justify-between rounded-[1.5rem] bg-muted p-5">
              <span>
                <span className="block font-bold">Auto greeting</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Send instant intro to every new lead.
                </span>
              </span>
              <input
                checked={autoGreeting}
                className="h-5 w-5 accent-violet-700"
                onChange={(event) => setAutoGreeting(event.target.checked)}
                type="checkbox"
              />
            </label>

            <label className="flex items-center justify-between rounded-[1.5rem] bg-muted p-5">
              <span>
                <span className="block font-bold">Auto follow-up reminders</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Remind broker before lead interest drops.
                </span>
              </span>
              <input
                checked={autoFollowup}
                className="h-5 w-5 accent-violet-700"
                onChange={(event) => setAutoFollowup(event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-violet-100 bg-violet-50 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <Bot className="h-4 w-4" />
              AI message preview
            </p>
            <p className="mt-3 text-lg font-bold leading-8">
              Hi Anjana, this is HomeZone Pro. I found 3 villas in Kochi under
              your budget. Would you like a site visit today or tomorrow?
            </p>
          </div>

          <Button className="mt-6 w-full" size="lg">
            <Send className="h-4 w-4" />
            Save Automation
          </Button>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {automationItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Card className="p-6 shadow-sm" key={item.title}>
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <ItemIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {proPlans.map((plan, index) => (
          <Card
            className={`p-6 shadow-sm ${
              index === 1 ? "border-violet-300 ring-4 ring-violet-100" : ""
            }`}
            key={plan.name}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-700">
                  {plan.bestFor}
                </p>
                <h3 className="mt-2 text-3xl font-bold">{plan.name}</h3>
              </div>
              {index === 1 ? (
                <span className="rounded-full bg-violet-700 px-3 py-1 text-xs font-bold text-white">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-5 text-3xl font-bold">{plan.price}</p>
            <div className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <p
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
                  key={feature}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {feature}
                </p>
              ))}
            </div>
            <Button className="mt-6 w-full" variant={index === 1 ? "default" : "outline"}>
              Start Plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <BadgeCheck className="h-4 w-4" />
              Pro account verification
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Broker tools require WhatsApp-verified identity.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Public users can browse freely. HomeZone Pro requires verified
              WhatsApp login before lead contact, automation, subscriptions, and
              team access.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline">
              <BellRing className="h-4 w-4" />
              Set Reminders
            </Button>
            <Button>
              <Sparkles className="h-4 w-4" />
              Verify Pro Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
