import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  FileCheck,
  Flag,
  Home,
  ShieldCheck,
  UsersRound,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModerationActions } from "@/components/admin/moderation-actions";

export function AdminControlCenter({
  pendingProperties = [],
  pendingReels = [],
  reports = [],
  counts
}: {
  pendingProperties?: {
    id: string;
    title: string;
    city: string;
    locality: string | null;
    status: string;
  }[];
  pendingReels?: {
    id: string;
    title: string;
    status: string;
  }[];
  reports?: {
    id: string;
    entityType: string | null;
    action: string;
    createdAt: Date;
    metadata: unknown;
  }[];
  counts?: {
    properties: number;
    reels: number;
    reports: number;
    providers: number;
    builders: number;
    brokers: number;
  };
}) {
  const queueData = [
    {
      title: "Pending Listings",
      count: String(counts?.properties ?? 0),
      text: "Approve, reject, or request corrections.",
      icon: Home
    },
    {
      title: "Broker Verification",
      count: String(counts?.brokers ?? 0),
      text: "Review identity, license, and business details.",
      icon: UsersRound
    },
    {
      title: "Builder Projects",
      count: String(counts?.builders ?? 0),
      text: "Validate builder profile, project info, and media quality.",
      icon: Building2
    },
    {
      title: "Reels Moderation",
      count: String(counts?.reels ?? 0),
      text: "Check video quality, ownership, and compliance.",
      icon: Video
    },
    {
      title: "Service Providers",
      count: String(counts?.providers ?? 0),
      text: "Approve verified providers and provider categories.",
      icon: BadgeCheck
    },
    {
      title: "Reports",
      count: String(counts?.reports ?? 0),
      text: "Handle fake listing reports and user complaints.",
      icon: Flag
    }
  ];

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.82fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-semibold text-violet-700">
              Admin Control Center
            </p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Trust, safety, and moderation
            </h1>
            <p className="mt-5 max-w-2xl leading-8 text-muted-foreground">
              Admins control property approval, verified badges, broker/builder
              onboarding, reels moderation, service providers, reports, and
              launch quality.
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white sm:p-10">
            <ShieldCheck className="h-12 w-12" />
            <h2 className="mt-6 text-3xl font-bold">Production rule</h2>
            <p className="mt-4 leading-7 text-white/72">
              No user-generated property, project, service provider, or reel
              should be treated as trusted until moderation and verification
              workflows are active.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {queueData.map((queue) => {
          const QueueIcon = queue.icon;
          return (
            <Card className="p-6 shadow-sm" key={queue.title}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <QueueIcon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                  {queue.count}
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-bold">{queue.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {queue.text}
              </p>
            </Card>
          );
        })}
      </div>

      <section className="grid gap-8 xl:grid-cols-2">
        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Listing Approval Queue
          </p>
          <h2 className="mt-2 text-3xl font-bold">Pending properties</h2>
          <div className="mt-6 space-y-4">
            {pendingProperties.map((property) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={property.id}>
                <p className="text-xs font-bold text-violet-700">
                  {property.status.replace("_", " ")}
                </p>
                <h3 className="mt-2 text-xl font-bold">{property.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {[property.locality, property.city].filter(Boolean).join(", ")}
                </p>
                <ModerationActions id={property.id} type="properties" />
              </div>
            ))}
            {!pendingProperties.length ? (
              <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
                No pending property approvals.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Reels Moderation Queue
          </p>
          <h2 className="mt-2 text-3xl font-bold">Pending reels</h2>
          <div className="mt-6 space-y-4">
            {pendingReels.map((reel) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={reel.id}>
                <p className="text-xs font-bold text-violet-700">
                  {reel.status.replace("_", " ")}
                </p>
                <h3 className="mt-2 text-xl font-bold">{reel.title}</h3>
                <ModerationActions id={reel.id} type="reels" />
              </div>
            ))}
            {!pendingReels.length ? (
              <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
                No pending reel approvals.
              </p>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold text-violet-700">
          User Reports
        </p>
        <h2 className="mt-2 text-3xl font-bold">Trust and safety inbox</h2>
        <div className="mt-6 grid gap-4">
          {reports.map((report) => (
            <div className="rounded-[1.5rem] bg-muted p-5" key={report.id}>
              <p className="text-xs font-bold text-violet-700">
                {report.entityType ?? "unknown"} / {report.createdAt.toLocaleDateString()}
              </p>
              <p className="mt-2 font-bold">{report.action}</p>
              <pre className="mt-3 overflow-auto rounded-2xl bg-white p-3 text-xs text-muted-foreground">
                {JSON.stringify(report.metadata, null, 2)}
              </pre>
            </div>
          ))}
          {!reports.length ? (
            <p className="rounded-[1.5rem] bg-muted p-5 text-sm font-bold text-muted-foreground">
              No user reports yet.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 shadow-soft sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
          <AlertTriangle className="h-4 w-4" />
          Before public launch
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Complete verification operations before onboarding real users.
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            "Create admin users",
            "Enable RLS policies",
            "Configure storage moderation",
            "Approve WhatsApp templates",
            "Set payment webhooks",
            "Test report abuse workflow"
          ].map((item) => (
            <p
              className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm font-bold"
              key={item}
            >
              <FileCheck className="h-4 w-4 text-emerald-500" />
              {item}
            </p>
          ))}
        </div>
        <Button className="mt-6" variant="outline">
          Export Launch Checklist
        </Button>
      </Card>
    </div>
  );
}
