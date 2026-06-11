"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Network,
  RadioTower,
  Route,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ecosystemMetrics,
  ecosystemModules,
  ecosystemPrinciples,
  launchRoadmap,
  operatingSystemFlows
} from "@/lib/ecosystem-data";

const filters = ["All", "Core", "Revenue", "CRM", "B2B", "Intelligence", "Unique", "Trust"];

export function EcosystemHub() {
  const [filter, setFilter] = useState("All");

  const modules = useMemo(() => {
    if (filter === "All") return ecosystemModules;
    return ecosystemModules.filter((module) => module.status === filter);
  }, [filter]);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {ecosystemMetrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <Card className="p-6 shadow-sm" key={metric.label}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <MetricIcon className="h-6 w-6" />
              </span>
              <p className="mt-6 text-3xl font-bold">{metric.value}</p>
              <p className="mt-1 font-semibold text-muted-foreground">
                {metric.label}
              </p>
            </Card>
          );
        })}
      </section>

      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-8 text-white sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Network className="h-7 w-7" />
            </div>
            <p className="mt-7 text-sm font-semibold text-white/65">
              Final Vision
            </p>
            <h2 className="mt-2 text-4xl font-bold sm:text-5xl">
              One AI operating system for property.
            </h2>
            <p className="mt-5 leading-7 text-white/72">
              HomeZone now connects discovery, AI guidance, media, marketing,
              CRM, builders, services, investment intelligence, and life-based
              recommendations into one ecosystem.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filters.map((item) => (
                <button
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                    filter === item
                      ? "bg-violet-700 text-white"
                      : "bg-muted text-muted-foreground hover:bg-violet-50 hover:text-violet-700"
                  }`}
                  key={item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {modules.map((module) => {
                const ModuleIcon = module.icon;
                return (
                  <a
                    className="rounded-[1.5rem] border border-border bg-white p-5 transition hover:-translate-y-1 hover:shadow-soft"
                    href={module.route}
                    key={module.title}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                        <ModuleIcon className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                        {module.status}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {module.text}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {operatingSystemFlows.map((flow) => {
          const FlowIcon = flow.icon;
          return (
            <Card className="p-6 shadow-sm" key={flow.title}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <FlowIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-6 text-2xl font-bold">{flow.title}</h3>
              <div className="mt-5 space-y-3">
                {flow.steps.map((step) => (
                  <p
                    className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
                    key={step}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {step}
                  </p>
                ))}
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Route className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">
            Next Implementation Roadmap
          </p>
          <h2 className="mt-2 text-4xl font-bold">
            Turn the prototype into a live product.
          </h2>
          <div className="mt-7 space-y-4">
            {launchRoadmap.map((item, index) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={item}>
                <p className="flex gap-3 text-sm font-bold leading-6">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs text-white">
                    {index + 1}
                  </span>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">
            Ecosystem Principles
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            Keep the super app simple.
          </h2>
          <div className="mt-6 space-y-4">
            {ecosystemPrinciples.map((principle) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={principle}>
                <p className="flex items-center gap-3 font-bold">
                  <BadgeCheck className="h-5 w-5 text-emerald-500" />
                  {principle}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <RadioTower className="h-4 w-4" />
              HomeZone 2026
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              The platform vision is now mapped end to end.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              This Phase 10 hub acts as the system map for the full HomeZone
              product: public discovery, verified dashboards, revenue engines,
              AI intelligence, and service expansion.
            </p>
          </div>
          <Button>
            Start From AI Search
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
