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

const adminQueues = [
  {
    title: "Pending Listings",
    count: "0",
    text: "Approve, reject, or request corrections.",
    icon: Home
  },
  {
    title: "Broker Verification",
    count: "0",
    text: "Review identity, license, and business details.",
    icon: UsersRound
  },
  {
    title: "Builder Projects",
    count: "0",
    text: "Validate builder profile, project info, and media quality.",
    icon: Building2
  },
  {
    title: "Reels Moderation",
    count: "0",
    text: "Check video quality, ownership, and compliance.",
    icon: Video
  },
  {
    title: "Service Providers",
    count: "0",
    text: "Approve verified providers and provider categories.",
    icon: BadgeCheck
  },
  {
    title: "Reports",
    count: "0",
    text: "Handle fake listing reports and user complaints.",
    icon: Flag
  }
];

export function AdminControlCenter() {
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
        {adminQueues.map((queue) => {
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
