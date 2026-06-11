"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  Upload,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  analyzerInputs,
  healthMetrics,
  legalNotes,
  scoreBreakdown
} from "@/lib/analyzer-data";

const sampleProperties = [
  "3BHK Villa, Kakkanad",
  "2BHK Apartment, Edappally",
  "12 Cent Land, Calicut",
  "Commercial Space, Thrissur"
];

export function PropertyAnalyzer() {
  const [property, setProperty] = useState(sampleProperties[0]);
  const [analysisMode, setAnalysisMode] = useState("Buyer safety");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportReady, setReportReady] = useState(true);

  const overallScore = useMemo(() => {
    return Math.round(
      scoreBreakdown.reduce((total, item) => total + item.score, 0) /
        scoreBreakdown.length
    );
  }, []);

  function runAnalysis() {
    setIsAnalyzing(true);
    setReportReady(false);
    window.setTimeout(() => {
      setIsAnalyzing(false);
      setReportReady(true);
    }, 900);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Upload className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Upload & Analyze
              </p>
              <h2 className="text-3xl font-bold">Property Health Report</h2>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Sample property</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setProperty(event.target.value)}
                value={property}
              >
                {sampleProperties.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Analysis mode</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setAnalysisMode(event.target.value)}
                value={analysisMode}
              >
                <option>Buyer safety</option>
                <option>Investment decision</option>
                <option>Rental income</option>
                <option>Seller pricing</option>
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {analyzerInputs.map((input) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-4 py-4"
                key={input}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  {input.includes("Images") || input.includes("Plan") ? (
                    <ImagePlus className="h-4 w-4 text-violet-700" />
                  ) : (
                    <FileText className="h-4 w-4 text-violet-700" />
                  )}
                  {input}
                </span>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-muted p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <MapPin className="h-4 w-4" />
              Analyzer context
            </p>
            <p className="mt-3 text-lg font-bold">
              {property} · {analysisMode}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Phase 4 UI is ready for OpenAI document/image analysis, Supabase
              Storage uploads, and country-wise legal disclaimer logic.
            </p>
          </div>

          <Button
            className="mt-6 w-full"
            disabled={isAnalyzing}
            onClick={runAnalysis}
            size="lg"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Generate AI Report
          </Button>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-8 text-white">
            <p className="text-sm font-semibold text-white/62">
              HomeZone Property Score
            </p>
            <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-8xl font-bold tracking-tight">
                  {overallScore}
                </p>
                <p className="text-lg font-semibold text-white/72">out of 100</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-5">
                <p className="text-sm text-white/65">AI Summary</p>
                <p className="mt-2 max-w-sm text-xl font-bold leading-8">
                  Strong property for family living with good demand. Verify
                  approvals before payment.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            {healthMetrics.map((metric) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  className="rounded-[1.5rem] border border-border bg-white p-5"
                  key={metric.label}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <MetricIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {metric.label}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold">
                        {metric.value}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {metric.note}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {reportReady ? (
        <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <Card className="p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-violet-700">
              Score Breakdown
            </p>
            <h2 className="mt-2 text-4xl font-bold">
              Why this property scored {overallScore}.
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {scoreBreakdown.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    className="rounded-[1.5rem] border border-border p-5"
                    key={item.label}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                          <ItemIcon className="h-5 w-5" />
                        </span>
                        <p className="font-bold">{item.label}</p>
                      </div>
                      <p className="text-xl font-bold">{item.score}</p>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-violet-700">
              Legal Notes
            </p>
            <h2 className="mt-2 text-4xl font-bold">
              Ask these before you commit.
            </h2>
            <div className="mt-7 space-y-4">
              {legalNotes.map((note) => {
                const NoteIcon = note.icon;
                return (
                  <div
                    className="rounded-[1.5rem] bg-muted p-5"
                    key={note.title}
                  >
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700">
                        <NoteIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-bold">{note.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {note.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      ) : null}

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              Professional disclaimer
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              HomeZone AI reports are decision-support tools. Final valuation,
              legal verification, and purchase decisions should be confirmed by
              licensed property, legal, and finance professionals.
            </p>
          </div>
          <Button>
            Share Report
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
