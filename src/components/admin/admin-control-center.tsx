import Link from "next/link";
import type { Route } from "next";
import { Activity, BarChart3, Bell, Building2, ClipboardCheck, FileText, Home, IndianRupee, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { getAdminOperationsData } from "@/lib/admin/operations";
import { formatAdminStatus } from "@/lib/admin/operations";

type AdminOpsData = Awaited<ReturnType<typeof getAdminOperationsData>>;

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value / 100);
}

export function AdminControlCenter({ data }: { data: AdminOpsData }) {
  const metrics = [
    { icon: UsersRound, label: "Total Users", value: data.stats.totalUsers },
    { icon: UserRound, label: "Buyers", value: data.stats.buyers },
    { icon: Home, label: "Owners", value: data.stats.owners },
    { icon: UsersRound, label: "Brokers", value: data.stats.brokers },
    { icon: Building2, label: "Builders", value: data.stats.builders },
    { icon: ShieldCheck, label: "Providers", value: data.stats.providers },
    { icon: Home, label: "Active Listings", value: data.stats.activeListings },
    { icon: ClipboardCheck, label: "Pending Listings", value: data.stats.pendingListings },
    { icon: ShieldCheck, label: "Verified Listings", value: data.stats.verifiedListings },
    { icon: UsersRound, label: "New Leads", value: data.stats.newLeads },
    { icon: Activity, label: "Site Visits", value: data.stats.siteVisits },
    { icon: FileText, label: "Studio Requests", value: data.stats.studioRequests }
  ];

  const links = [
    { href: "/admin/listings", label: "Review Listings", text: "Moderate pending listings, documents, media, and owner notes." },
    { href: "/admin/users", label: "Manage Users", text: "Search profiles, verify owners, suspend or reactivate users, manage roles." },
    { href: "/admin/leads", label: "Lead Oversight", text: "View pipeline health, response times, stuck leads, and site visits." },
    { href: "/admin/studio", label: "Studio Operations", text: "Assign Studio work, update production, upload deliveries, and monitor revisions." },
    { href: "/admin/reports", label: "Reports & Flags", text: "Resolve, dismiss, or escalate reported properties and users." },
    { href: "/admin/analytics", label: "Marketplace Analytics", text: "Review listings, approvals, activity, conversion, and performance." }
  ];

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1fr_.82fr]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-bold text-violet-700">Admin Operations</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Marketplace command center
            </h1>
            <p className="mt-5 max-w-2xl leading-8 text-muted-foreground">
              Review listings, verify owners, monitor leads, handle reports, manage users, and keep marketplace quality high.
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white sm:p-10">
            <IndianRupee className="h-12 w-12" />
            <p className="mt-6 text-sm font-bold text-white/70">Revenue Snapshot</p>
            <h2 className="mt-2 text-4xl font-bold">{rupees(data.stats.revenue)}</h2>
            <p className="mt-4 leading-7 text-white/72">
              Paid marketplace revenue recorded through existing payment infrastructure.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card className="p-5 shadow-sm" key={metric.label}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-3xl font-bold">{metric.value}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{metric.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <Card className="p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Operations</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {links.map((item) => (
              <div className="rounded-3xl border bg-white p-5" key={item.href}>
                <h2 className="text-xl font-bold">{item.label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                <Button asChild className="mt-4" size="sm" variant="outline">
                  <Link href={item.href as Route}>{item.label}</Link>
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
            <Bell className="h-4 w-4" />
            Admin Notifications
          </p>
          <div className="mt-5 space-y-3">
            {data.notifications.map((item) => (
              <div className="rounded-2xl bg-muted p-4" key={item.label}>
                <p className="text-2xl font-bold">{Array.isArray(item.count) ? item.count.length : item.count}</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">Pending Listings</p>
          <div className="mt-5 space-y-3">
            {data.pendingProperties.map((property) => (
              <div className="rounded-2xl bg-muted p-4" key={property.id}>
                <p className="text-sm font-bold">{property.title}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {property.city} · {formatAdminStatus(property.status)} · Docs {property.documents.length}
                </p>
              </div>
            ))}
            {!data.pendingProperties.length ? <Empty text="No listings waiting for moderation." /> : null}
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
            <Activity className="h-4 w-4" />
            Recent Activity
          </p>
          <div className="mt-5 space-y-3">
            {data.recentActivity.map((item) => (
              <div className="rounded-2xl bg-muted p-4" key={item.id}>
                <p className="text-sm font-bold">{formatAdminStatus(item.action)}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {item.entityType ?? "system"} · {item.createdAt.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
            {!data.recentActivity.length ? <Empty text="No audit activity yet." /> : null}
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
          <BarChart3 className="h-4 w-4" />
          Marketplace Health
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Health label="Documents Waiting" value={data.stats.pendingDocuments} />
          <Health label="Reports Open" value={data.stats.reports} />
          <Health label="Approval Queue" value={data.stats.pendingListings} />
        </div>
      </Card>
    </div>
  );
}

function Health({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed bg-white p-4 text-sm font-semibold text-muted-foreground">{text}</p>;
}
