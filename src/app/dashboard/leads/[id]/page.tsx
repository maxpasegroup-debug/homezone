import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, Bell, Clock3, Home, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeadLifecycleActions } from "@/components/leads/lead-lifecycle-actions";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { requireLeadAccess } from "@/lib/leads/access";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function label(value?: string | null) {
  if (!value) return "Not set";
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default async function LeadDetailPage({ params }: PageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/leads");
  }

  const profile = await getOrCreateProfile(user);
  const { id } = await params;
  const access = await requireLeadAccess(id, profile);

  if ("error" in access) {
    notFound();
  }

  const lead = access.lead;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Button asChild variant="outline">
          <Link href={"/dashboard/leads" as Route}>
            <ArrowLeft className="h-4 w-4" />
            Lead Inbox
          </Link>
        </Button>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_26rem]">
          <div className="space-y-6">
            <Card className="p-6 shadow-soft">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-violet-700">Lead Details</p>
                  <h1 className="mt-2 text-5xl font-bold tracking-tight">{lead.name}</h1>
                  <p className="mt-3 text-muted-foreground">{lead.message}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-700 px-4 py-2 text-sm font-bold text-white">{label(lead.stage)}</span>
                  <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">{lead.priority}</span>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info icon={<UserRound className="h-4 w-4" />} label="Buyer" value={[lead.phone, lead.email].filter(Boolean).join(" · ") || "Contact saved"} />
                <Info icon={<Home className="h-4 w-4" />} label="Property" value={lead.property?.title ?? "Property inquiry"} />
                <Info icon={<Clock3 className="h-4 w-4" />} label="Source" value={`${lead.source}${lead.contactAction ? ` · ${lead.contactAction}` : ""}`} />
                <Info icon={<Bell className="h-4 w-4" />} label="Priority" value={lead.priority} />
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Timeline</h2>
              <div className="mt-5 space-y-3">
                {lead.timeline.map((event) => (
                  <div className="rounded-2xl bg-muted p-4" key={event.id}>
                    <p className="text-sm font-bold">{label(event.eventType)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{event.message}</p>
                    <p className="mt-2 text-xs font-bold text-muted-foreground">{event.createdAt.toLocaleString("en-IN")}</p>
                  </div>
                ))}
                {!lead.timeline.length ? <p className="text-sm text-muted-foreground">No timeline activity yet.</p> : null}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Ownership</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p><strong>Owner:</strong> {lead.property?.owner?.fullName ?? "Not assigned"}</p>
                <p><strong>Assigned broker:</strong> {lead.assigned?.fullName ?? "Ready for broker assignment"}</p>
                <p><strong>Created:</strong> {lead.createdAt.toLocaleString("en-IN")}</p>
                <p><strong>Next action:</strong> {lead.nextAction ?? "No next action set"}</p>
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Notifications</h2>
              <div className="mt-4 space-y-3">
                {lead.notifications.map((notification) => (
                  <div className="rounded-2xl bg-muted p-4" key={notification.id}>
                    <p className="text-sm font-bold">{notification.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 text-xs font-bold text-muted-foreground">{notification.readAt ? "Read" : "Unread"}</p>
                  </div>
                ))}
                {!lead.notifications.length ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : null}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <LeadLifecycleActions
            leadId={lead.id}
            notes={lead.notes.map((note) => ({ id: note.id, note: note.note }))}
            priority={lead.priority}
            stage={lead.stage}
            tasks={lead.tasks.map((task) => ({
              completedAt: task.completedAt,
              dueAt: task.dueAt,
              id: task.id,
              taskType: task.taskType,
              title: task.title
            }))}
            visits={lead.siteVisits.map((visit) => ({
              id: visit.id,
              notes: visit.notes,
              scheduledAt: visit.scheduledAt,
              status: visit.status
            }))}
          />
        </div>
      </section>
    </main>
  );
}

function Info({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-muted p-4">
      <div className="flex items-center gap-2 text-violet-700">{icon}<span className="text-xs font-bold uppercase">{label}</span></div>
      <p className="mt-2 text-sm font-bold">{value}</p>
    </div>
  );
}
