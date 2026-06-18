import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Building2,
  FileCheck,
  Flag,
  Home,
  ShieldCheck,
  UsersRound,
  Video
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ModerationActions } from "@/components/admin/moderation-actions";

export function AdminControlCenter({
  analytics,
  pendingProperties = [],
  pendingReels = [],
  reports = [],
  counts
}: {
  analytics?: {
    leads: number;
    publishedProperties: number;
    reels: number;
  };
  counts?: {
    brokers: number;
    builders: number;
    properties: number;
    reports: number;
    users: number;
    verificationQueue: number;
  };
  pendingProperties?: {
    city: string;
    id: string;
    locality: string | null;
    status: string;
    title: string;
  }[];
  pendingReels?: {
    id: string;
    status: string;
    title: string;
  }[];
  reports?: {
    action: string;
    createdAt: Date;
    entityType: string | null;
    id: string;
    metadata: unknown;
  }[];
}) {
  const overview = [
    {
      count: counts?.users ?? 0,
      icon: UsersRound,
      text: "Registered profiles across all marketplace roles.",
      title: "Users"
    },
    {
      count: counts?.brokers ?? 0,
      icon: UsersRound,
      text: "Broker profiles available for role and verification review.",
      title: "Brokers"
    },
    {
      count: counts?.builders ?? 0,
      icon: Building2,
      text: "Builder profiles and project owners in the marketplace.",
      title: "Builders"
    },
    {
      count: counts?.properties ?? 0,
      icon: Home,
      text: "Total marketplace listings across all statuses.",
      title: "Properties"
    },
    {
      count: counts?.verificationQueue ?? 0,
      icon: BadgeCheck,
      text: "Broker and builder profiles pending phone verification.",
      title: "Verification Queue"
    },
    {
      count: counts?.reports ?? 0,
      icon: Flag,
      text: "User reports awaiting trust and safety review.",
      title: "Reports"
    }
  ];

  const analyticsCards = [
    {
      count: analytics?.publishedProperties ?? 0,
      icon: Home,
      label: "Published properties"
    },
    {
      count: analytics?.leads ?? 0,
      icon: BarChart3,
      label: "Lead records"
    },
    {
      count: analytics?.reels ?? 0,
      icon: Video,
      label: "Property reels"
    }
  ];

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.82fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-semibold text-violet-700">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Trust, users, and marketplace operations
            </h1>
            <p className="mt-5 max-w-2xl leading-8 text-muted-foreground">
              Admins review users, brokers, builders, properties, verification
              queues, reports, and marketplace activity with database-backed
              counts.
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white sm:p-10">
            <ShieldCheck className="h-12 w-12" />
            <h2 className="mt-6 text-3xl font-bold">Production rule</h2>
            <p className="mt-4 leading-7 text-white/72">
              User-generated listings, reels, projects, and reports stay
              operationally visible until moderation and verification workflows
              clear them.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {overview.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Card className="p-6 shadow-sm" key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <ItemIcon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                  {item.count}
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </Card>
          );
        })}
      </div>

      <section className="grid gap-5 md:grid-cols-3">
        {analyticsCards.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Card className="p-6 shadow-sm" key={item.label}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <ItemIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-6 text-3xl font-bold">{item.count}</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {item.label}
              </p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <Card className="p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Verification Queue
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
            Media Moderation
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
        <p className="text-sm font-semibold text-violet-700">Reports</p>
        <h2 className="mt-2 text-3xl font-bold">Trust and safety inbox</h2>
        <div className="mt-6 grid gap-4">
          {reports.map((report) => (
            <div className="rounded-[1.5rem] bg-muted p-5" key={report.id}>
              <p className="text-xs font-bold text-violet-700">
                {report.entityType ?? "unknown"} /{" "}
                {report.createdAt.toLocaleDateString()}
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
          Operational readiness
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Keep controls ready before wider marketplace rollout.
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            "Create admin users",
            "Configure storage moderation",
            "Review broker verification",
            "Review builder verification",
            "Test report abuse workflow",
            "Monitor audit logs"
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
      </Card>
    </div>
  );
}
