import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeadStageButton } from "@/components/leads/lead-stage-button";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { leadAccessWhere, leadStages } from "@/lib/leads/access";

export const dynamic = "force-dynamic";

function label(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default async function LeadPipelinePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/leads/pipeline");
  }

  const profile = await getOrCreateProfile(user);
  const leads = await db.lead.findMany({
    include: {
      property: true
    },
    orderBy: {
      updatedAt: "desc"
    },
    where: {
      AND: [
        leadAccessWhere(profile.id),
        {
          stage: {
            in: leadStages
          }
        }
      ]
    }
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Button asChild variant="outline">
          <Link href={"/dashboard/leads" as Route}>
            <ArrowLeft className="h-4 w-4" />
            Lead Inbox
          </Link>
        </Button>
        <h1 className="mt-8 text-5xl font-bold tracking-tight">Lead pipeline</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Move leads from inquiry to qualification, site visit, negotiation, and closure.
        </p>

        <div className="mt-8 grid min-w-full gap-4 overflow-x-auto xl:grid-cols-7">
          {leadStages.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.stage === stage);

            return (
              <Card className="min-h-96 p-4 shadow-sm" key={stage}>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{label(stage)}</h2>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">{stageLeads.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {stageLeads.map((lead) => (
                    <div className="rounded-3xl border bg-white p-4" key={lead.id}>
                      <Link className="text-sm font-bold text-violet-700" href={`/dashboard/leads/${lead.id}` as Route}>
                        {lead.name}
                      </Link>
                      <p className="mt-2 text-sm text-muted-foreground">{lead.property?.title ?? "Property inquiry"}</p>
                      <p className="mt-2 text-xs font-bold text-muted-foreground">{lead.priority} · {lead.source}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {leadStages
                          .filter((nextStage) => nextStage !== stage)
                          .slice(0, 2)
                          .map((nextStage) => (
                            <LeadStageButton key={nextStage} leadId={lead.id} stage={nextStage} />
                          ))}
                      </div>
                    </div>
                  ))}
                  {!stageLeads.length ? (
                    <p className="rounded-2xl border border-dashed bg-white p-4 text-sm text-muted-foreground">
                      No leads in {label(stage)}.
                    </p>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
