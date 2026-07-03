"use client";

import { useState } from "react";
import { BadgeIndianRupee, Brain, Gavel, GraduationCap, Landmark, LineChart, MapPinned, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ActionKey = "score" | "price" | "investment" | "loan" | "legal" | "locality";

const actions: Array<{
  action: ActionKey;
  icon: typeof Sparkles;
  label: string;
}> = [
  { action: "score", icon: Brain, label: "Property Score" },
  { action: "price", icon: BadgeIndianRupee, label: "Price Insight" },
  { action: "investment", icon: LineChart, label: "Investment" },
  { action: "loan", icon: Landmark, label: "Loan Guide" },
  { action: "legal", icon: Gavel, label: "Legal Basics" },
  { action: "locality", icon: MapPinned, label: "Locality" }
];

type IntelligenceResult = {
  comparableListings?: Array<{ id: string; title: string; priceLabel: string; location: string }>;
  disclaimer?: string;
  documentType?: string;
  downPayment?: number;
  emi?: number;
  estimatedFairValue?: string;
  negotiationRange?: { high: number; low: number } | null;
  priceConfidence?: string;
  riskLevel?: string;
  scores?: {
    overall: number;
    subscores: Record<string, number>;
  };
  source?: string;
  summary?: string;
  suitableHorizon?: string;
};

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) return "--";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function AIPropertyIntelligencePanel({
  propertyId,
  propertyTitle
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const [active, setActive] = useState<ActionKey>("score");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntelligenceResult | null>(null);

  async function run(action: ActionKey) {
    setActive(action);
    setLoading(true);
    const response = await fetch("/api/ai/property-intelligence", {
      body: JSON.stringify({
        action,
        documentType: action === "legal" ? "Sale Deed and Encumbrance Certificate" : undefined,
        propertyId,
        query: `Analyze ${propertyTitle}`
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setResult(data?.result ?? null);
    setLoading(false);
  }

  return (
    <Card className="mt-8 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <Sparkles className="h-4 w-4" />
            AI Property Intelligence
          </p>
          <h2 className="mt-2 text-3xl font-bold">Understand before you visit</h2>
        </div>
        <Button onClick={() => run(active)}>
          {loading ? "Analyzing..." : "Run AI insight"}
        </Button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`flex min-h-12 items-center gap-2 rounded-2xl border px-4 text-left text-sm font-bold transition ${
                active === item.action ? "border-violet-300 bg-violet-50 text-violet-700" : "border-border bg-white hover:bg-muted"
              }`}
              key={item.action}
              onClick={() => run(item.action)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {result ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
            <p className="text-sm font-semibold text-cyan-200">AI result</p>
            {result.scores ? (
              <div className="mt-4">
                <p className="text-6xl font-bold">{result.scores.overall}</p>
                <p className="mt-1 text-sm font-bold text-white/70">Property Intelligence Score</p>
              </div>
            ) : null}
            {result.emi ? (
              <div className="mt-4">
                <p className="text-4xl font-bold">Rs {formatNumber(result.emi)}</p>
                <p className="mt-1 text-sm font-bold text-white/70">Estimated monthly EMI</p>
              </div>
            ) : null}
            {result.estimatedFairValue ? (
              <div className="mt-4">
                <p className="text-4xl font-bold">{result.estimatedFairValue}</p>
                <p className="mt-1 text-sm font-bold text-white/70">AI-estimated fair value signal</p>
              </div>
            ) : null}
            <p className="mt-5 text-sm leading-6 text-white/72">
              Source: {result.source ?? "AI Core"} / Confidence: {result.priceConfidence ?? "Decision support"}
            </p>
          </div>

          <div>
            <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
              {result.summary ?? "HomeZone AI could not generate this insight right now."}
            </p>
            {result.scores ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {Object.entries(result.scores.subscores).slice(0, 8).map(([key, value]) => (
                  <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm" key={key}>
                    <span className="font-semibold capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-bold">{value}/100</span>
                  </div>
                ))}
              </div>
            ) : null}
            {result.negotiationRange ? (
              <div className="mt-5 rounded-2xl bg-muted p-4 text-sm font-semibold">
                Potential negotiation range: Rs {formatNumber(result.negotiationRange.low)} - Rs {formatNumber(result.negotiationRange.high)}
              </div>
            ) : null}
            {result.disclaimer ? (
              <p className="mt-5 flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                <Scale className="h-4 w-4 shrink-0" />
                {result.disclaimer}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] bg-muted p-6">
          <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
            <GraduationCap className="h-4 w-4" />
            Start with Property Score, Price Insight, Investment, Loan, Legal, or Locality.
          </p>
        </div>
      )}
    </Card>
  );
}
