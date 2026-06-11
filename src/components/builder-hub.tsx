"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  Megaphone,
  PlaySquare,
  Plus,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  aiReportHighlights,
  builderMetrics,
  builderProjects,
  builderTasks,
  builderTools,
  campaignRequests
} from "@/lib/builder-data";

const launchTypes = ["New launch", "Ready to move", "Investment project", "Luxury project"];

export function BuilderHub() {
  const [selectedProject, setSelectedProject] = useState(builderProjects[0].name);
  const [launchType, setLaunchType] = useState("New launch");
  const [campaignBudget, setCampaignBudget] = useState("₹1L - ₹3L");

  const currentProject = useMemo(
    () => builderProjects.find((project) => project.name === selectedProject) ?? builderProjects[0],
    [selectedProject]
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {builderMetrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <Card className="p-6 shadow-sm" key={metric.label}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <MetricIcon className="h-6 w-6" />
              </span>
              <p className="mt-6 text-3xl font-bold">{metric.value}</p>
              <p className="mt-1 font-semibold text-muted-foreground">{metric.label}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700">Builder Dashboard</p>
              <h2 className="mt-1 text-4xl font-bold">Project command center</h2>
            </div>
            <Button>
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </div>

          <div className="mt-7 grid gap-4">
            {builderProjects.map((project) => {
              const active = selectedProject === project.name;
              return (
                <button
                  className={`rounded-[1.5rem] border bg-white p-5 text-left transition hover:-translate-y-1 hover:shadow-soft ${
                    active ? "border-violet-300 ring-4 ring-violet-100" : "border-border"
                  }`}
                  key={project.name}
                  onClick={() => setSelectedProject(project.name)}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                        <Building2 className="h-4 w-4" />
                        {project.location}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">{project.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {project.units} · {project.inventory}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 lg:min-w-80">
                      <div className="rounded-2xl bg-muted p-3">
                        <p className="text-xs font-semibold text-muted-foreground">Leads</p>
                        <p className="mt-1 text-xl font-bold">{project.leads}</p>
                      </div>
                      <div className="rounded-2xl bg-muted p-3">
                        <p className="text-xs font-semibold text-muted-foreground">Score</p>
                        <p className="mt-1 text-xl font-bold">{project.score}</p>
                      </div>
                      <div className="rounded-2xl bg-violet-50 p-3">
                        <p className="text-xs font-semibold text-violet-700">Status</p>
                        <p className="mt-1 text-sm font-bold">{project.status}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white">
            <p className="text-sm font-semibold text-white/62">AI Builder Report</p>
            <h2 className="mt-2 text-4xl font-bold">{currentProject.name}</h2>
            <p className="mt-4 leading-7 text-white/72">
              HomeZone summarizes lead quality, buyer questions, campaign signals, and next actions.
            </p>
          </div>
          <div className="grid gap-4 p-6">
            {aiReportHighlights.map((highlight) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={highlight}>
                <p className="flex gap-3 text-sm font-semibold leading-6">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                  {highlight}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {builderTools.map((tool) => {
          const ToolIcon = tool.icon;
          return (
            <Card className="p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft" key={tool.title}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <ToolIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-6 text-2xl font-bold">{tool.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{tool.text}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Megaphone className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">Campaign Request</p>
          <h2 className="mt-2 text-4xl font-bold">Launch a project campaign.</h2>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Project</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setSelectedProject(event.target.value)}
                value={selectedProject}
              >
                {builderProjects.map((project) => (
                  <option key={project.name}>{project.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Launch type</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setLaunchType(event.target.value)}
                value={launchType}
              >
                {launchTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Campaign budget</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setCampaignBudget(event.target.value)}
                value={campaignBudget}
              >
                <option>₹50K - ₹1L</option>
                <option>₹1L - ₹3L</option>
                <option>₹3L - ₹8L</option>
                <option>Custom enterprise budget</option>
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-violet-50 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <Sparkles className="h-4 w-4" />
              AI campaign draft
            </p>
            <p className="mt-3 text-lg font-bold leading-8">
              {launchType} campaign for {selectedProject} with {campaignBudget} budget: use reels, lead forms, landing page, and weekend site-visit push.
            </p>
          </div>

          <Button className="mt-6 w-full" size="lg">
            Request Campaign
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <div className="grid gap-4">
          {campaignRequests.map((request) => {
            const RequestIcon = request.icon;
            return (
              <Card className="p-6 shadow-sm" key={request.title}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <RequestIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold">{request.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">{request.channel}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{request.status}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <Globe2 className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">Landing Pages</p>
          <h2 className="mt-2 text-4xl font-bold">Create project pages that convert.</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Builder Hub can generate campaign-specific landing pages with project story, videos, floor plans, inventory, offers, and verified lead forms.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Floor Plans", "Inventory", "Lead Form"].map((item) => (
              <span className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold" key={item}>
                {item}
              </span>
            ))}
          </div>
          <Button className="mt-6" size="lg">
            Generate Landing Page
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-violet-700">Builder Tasks</p>
          <h2 className="mt-2 text-3xl font-bold">Next actions</h2>
          <div className="mt-6 space-y-4">
            {builderTasks.map((task) => {
              const TaskIcon = task.icon;
              return (
                <div className="rounded-[1.5rem] bg-muted p-5" key={task.title}>
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-700">
                      <TaskIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold">{task.title}</p>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">Due {task.due}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <BadgeCheck className="h-4 w-4" />
              Builder verification
            </p>
            <h2 className="mt-2 text-3xl font-bold">Verified builders get premium visibility.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              HomeZone Builder Hub is designed for verified developer accounts, project approvals, media quality control, and campaign accountability.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline">
              <PlaySquare className="h-4 w-4" />
              Request Media
            </Button>
            <Button>
              <FileText className="h-4 w-4" />
              Submit Project
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
