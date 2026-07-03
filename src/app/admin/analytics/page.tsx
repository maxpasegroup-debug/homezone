import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, BarChart3, Home, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth/admin";
import { formatAdminStatus, getAdminMarketplaceAnalytics } from "@/lib/admin/operations";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdminProfile();
  const data = await getAdminMarketplaceAnalytics();
  const totalApprovals = data.approvals.reduce((sum, item) => sum + item._count._all, 0);
  const verified = data.approvals.find((item) => item.verificationStatus === "VERIFIED")?._count._all ?? 0;
  const approvalRate = totalApprovals ? Math.round((verified / totalApprovals) * 100) : 0;
  const leadTotal = data.leadStages.reduce((sum, item) => sum + item._count._all, 0);
  const won = data.leadStages.find((item) => item.stage === "WON")?._count._all ?? 0;
  const leadConversion = leadTotal ? Math.round((won / leadTotal) * 100) : 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/admin">Admin</Link>
        <h1 className="mt-8 text-5xl font-bold tracking-tight">Marketplace analytics</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Operational visibility into listings, approvals, active users, performance, conversion, and daily activity.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Metric icon={<Home className="h-5 w-5" />} label="New Listings" value={data.newListings} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Approval Rate" suffix="%" value={approvalRate} />
          <Metric icon={<UsersRound className="h-5 w-5" />} label="Active Users" value={data.activeUsers} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Lead Conversion" suffix="%" value={leadConversion} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Approval Status</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.approvals.map((item) => (
                <div className="rounded-2xl bg-muted p-4" key={item.verificationStatus}>
                  <p className="text-2xl font-bold">{item._count._all}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{formatAdminStatus(item.verificationStatus)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Lead Conversion</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.leadStages.map((item) => (
                <div className="rounded-2xl bg-muted p-4" key={item.stage}>
                  <p className="text-2xl font-bold">{item._count._all}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{formatAdminStatus(item.stage)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_.8fr]">
          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Listing Performance</p>
            <div className="mt-5 space-y-3">
              {data.topProperties.map((property) => (
                <div className="rounded-2xl bg-muted p-4" key={property.id}>
                  <p className="text-sm font-bold">{property.title}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {property.city} · {property.callClicks} calls · {property.whatsappClicks} WhatsApp · {property.inquirySubmissions} inquiries
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <Activity className="h-4 w-4" />
              Daily Activity
            </p>
            <div className="mt-5 space-y-3">
              {data.dailyActivity.map((activity, index) => (
                <div className="rounded-2xl bg-muted p-4" key={`${activity.action}-${index}`}>
                  <p className="text-sm font-bold">{formatAdminStatus(activity.action)}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{activity.entityType ?? "system"} · {activity.createdAt.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, suffix = "", value }: { icon: ReactNode; label: string; suffix?: string; value: number }) {
  return (
    <Card className="p-5 shadow-sm">
      <div className="text-violet-700">{icon}</div>
      <p className="mt-3 text-3xl font-bold">{value}{suffix}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}
