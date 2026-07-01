"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Megaphone, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BuilderProject = {
  id: string;
  name: string;
  city: string;
  locality: string | null;
  description: string | null;
  unitsCount: number | null;
  availableUnits: number | null;
  campaignStatus: string;
  aiReport: unknown;
};

export function LiveBuilderDashboard({ projects }: { projects: BuilderProject[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "Aster Sky Villas",
    city: "Kochi",
    locality: "Kakkanad",
    description: "Premium villa project with modern amenities, work-hub access, and family-friendly planning.",
    unitsCount: "42",
    availableUnits: "18",
    campaignStatus: "draft"
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createProject() {
    setLoading(true);
    await fetch("/api/builder/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Building2 className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight">
          Builder project dashboard
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Create projects, track inventory, prepare campaigns, and generate AI
          project reports from one verified builder workspace.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(["name", "city", "locality", "unitsCount", "availableUnits", "campaignStatus"] as const).map((field) => (
            <label className="space-y-2" key={field}>
              <span className="text-sm font-semibold capitalize">{field}</span>
              <input
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => updateField(field, event.target.value)}
                value={form[field]}
              />
            </label>
          ))}
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-semibold">Description</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-border bg-white p-4 font-semibold outline-none"
              onChange={(event) => updateField("description", event.target.value)}
              value={form.description}
            />
          </label>
        </div>

        <Button className="mt-6" disabled={loading} onClick={createProject} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Project
        </Button>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Card className="p-6 shadow-sm" key={project.id}>
            <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              {project.campaignStatus}
            </p>
            <h2 className="mt-5 text-2xl font-bold">{project.name}</h2>
            <p className="mt-2 text-sm font-semibold text-violet-700">
              {[project.locality, project.city].filter(Boolean).join(", ")}
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {project.description}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs font-semibold text-muted-foreground">Units</p>
                <p className="mt-1 text-2xl font-bold">{project.unitsCount ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs font-semibold text-muted-foreground">Available</p>
                <p className="mt-1 text-2xl font-bold">{project.availableUnits ?? 0}</p>
              </div>
            </div>
            <div className="mt-5 rounded-[1.5rem] bg-violet-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                <Sparkles className="h-4 w-4" />
                AI report ready after campaign data
              </p>
            </div>
            <Button className="mt-5 w-full" variant="outline">
              <Megaphone className="h-4 w-4" />
              Request Campaign
            </Button>
          </Card>
        ))}
        {!projects.length ? (
          <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
            <h2 className="text-2xl font-bold">No builder projects yet</h2>
            <p className="mt-3 text-muted-foreground">
              Create your first project to start showcasing inventory.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
