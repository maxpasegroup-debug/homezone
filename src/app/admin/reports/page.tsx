import Link from "next/link";
import { AdminReportPanel } from "@/components/admin/admin-action-panels";
import { Card } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth/admin";
import { formatAdminStatus, getAdminReports } from "@/lib/admin/operations";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdminProfile();
  const reports = await getAdminReports();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/admin">Admin</Link>
        <h1 className="mt-8 text-5xl font-bold tracking-tight">Reports and flags</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Review reported properties, users, service providers, builders, brokers, Studio orders, and reviews.
        </p>

        <div className="mt-8 grid gap-5">
          {reports.map((report) => {
            const metadata = report.metadata as Record<string, unknown>;
            return (
              <Card className="p-6 shadow-sm" key={report.id}>
                <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{formatAdminStatus(report.entityType)}</span>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{formatAdminStatus(report.status)}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold">{report.reason}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{report.createdAt.toLocaleString("en-IN")} / Entity {report.entityId}</p>
                    {report.adminNotes ? <p className="mt-3 text-sm font-semibold text-violet-700">{report.adminNotes}</p> : null}
                    <pre className="mt-4 overflow-auto rounded-2xl bg-muted p-4 text-xs text-muted-foreground">{JSON.stringify(metadata, null, 2)}</pre>
                  </div>
                  <AdminReportPanel reportId={report.id} />
                </div>
              </Card>
            );
          })}
          {!reports.length ? (
            <Card className="p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold">No reports yet</h2>
              <p className="mt-3 text-muted-foreground">User-submitted reports will appear here.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
