"use client";

import { useState } from "react";
import { Bot, Clock, FileText, Lightbulb, Send, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BusinessAIAction } from "@/lib/ai/business/tools";

type SavedReport = {
  createdAt: string;
  id: string;
  reportType: string;
  summary: string;
};

const labels: Record<BusinessAIAction, string> = {
  admin_copilot: "Admin Copilot",
  broker_copilot: "Broker Copilot",
  builder_analytics: "Builder Analytics",
  builder_copilot: "Builder Copilot",
  crm_summary: "CRM Summary",
  lead_analysis: "Lead Analysis",
  notification_draft: "Draft Message",
  report_generator: "Generate Report",
  revenue_analysis: "Revenue Analysis",
  sales_analytics: "Sales Analytics",
  service_analytics: "Service Analytics",
  service_copilot: "Service Copilot",
  studio_analytics: "Studio Analytics",
  studio_copilot: "Studio Copilot"
};

export function BusinessAIDashboard({
  productivity,
  recentReports,
  recommendedActions,
  role
}: {
  productivity: {
    reports: number;
    requests30d: number;
    tokens30d: number;
  };
  recentReports: SavedReport[];
  recommendedActions: BusinessAIAction[];
  role: string;
}) {
  const [action, setAction] = useState<BusinessAIAction>(recommendedActions[0] ?? "report_generator");
  const [context, setContext] = useState("Summarize my highest priority work and suggest what I should do next today.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function runCopilot() {
    setLoading(true);
    const response = await fetch("/api/ai/business", {
      body: JSON.stringify({
        action,
        context
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setResult(data?.result?.summary ?? data?.error ?? "Business AI could not generate this insight right now.");
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-700 p-8 text-white sm:p-10">
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <Bot className="h-4 w-4" />
              Business AI for {role.replace("_", " ")}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Run your professional copilot.
            </h1>
            <p className="mt-5 leading-7 text-white/75">
              Lead analysis, reports, messages, risk alerts, and next best actions powered by HomeZone AI Core.
            </p>
          </div>
          <div className="p-5 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {recommendedActions.map((item) => (
                <button
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                    action === item ? "border-violet-300 bg-violet-50 text-violet-700" : "border-border bg-white hover:bg-muted"
                  }`}
                  key={item}
                  onClick={() => setAction(item)}
                >
                  {labels[item]}
                </button>
              ))}
            </div>
            <textarea
              className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-border bg-white p-4 text-sm font-semibold outline-none"
              onChange={(event) => setContext(event.target.value)}
              value={context}
            />
            <Button className="mt-4 min-h-12 w-full" onClick={runCopilot}>
              <Send className="h-4 w-4" />
              {loading ? "Thinking..." : "Run Business AI"}
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [TrendingUp, productivity.requests30d, "AI requests this month"],
          [FileText, productivity.reports, "Saved business reports"],
          [Sparkles, productivity.tokens30d, "Tokens tracked"]
        ].map(([Icon, value, label]) => {
          const MetricIcon = Icon as typeof TrendingUp;
          return (
            <Card className="p-5 shadow-sm" key={label as string}>
              <MetricIcon className="h-5 w-5 text-violet-700" />
              <p className="mt-5 text-3xl font-bold">{String(value)}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{label as string}</p>
            </Card>
          );
        })}
      </section>

      {result ? (
        <Card className="p-6 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <Lightbulb className="h-4 w-4" />
            AI Insight
          </p>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {result}
          </p>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <Clock className="h-4 w-4" />
            Saved Reports
          </p>
          <div className="mt-5 space-y-3">
            {recentReports.map((report) => (
              <div className="rounded-2xl bg-muted p-4" key={report.id}>
                <p className="text-xs font-bold text-muted-foreground">{report.reportType}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-6">{report.summary}</p>
                <p className="mt-2 text-xs font-semibold text-violet-700">{new Date(report.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {!recentReports.length ? (
              <div className="rounded-2xl bg-muted p-6 text-center">
                <h3 className="text-xl font-bold">No Business AI reports yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Run a copilot action to create your first saved report.</p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <ShieldAlert className="h-4 w-4" />
            Risk Alerts
          </p>
          <div className="mt-5 space-y-3">
            {[
              "Review stale leads before they cool down.",
              "Check pending payments before production or delivery promises.",
              "Use AI drafts as editable suggestions, not automatic sends."
            ].map((item) => (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800" key={item}>
                {item}
              </p>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
