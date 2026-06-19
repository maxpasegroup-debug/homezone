import Link from "next/link";
import { AdminControlCenter } from "@/components/admin/admin-control-center";
import { requireAdminProfile } from "@/lib/auth/admin";
import { getAdminDashboardData } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminProfile();
  const data = await getAdminDashboardData();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          <AdminControlCenter
            counts={{
              builders: buildersCount,
              brokers: brokersCount,
              properties: propertiesCount,
              providers: providersCount,
              reels: reelsCount,
              reports: reportsCount
            }}
            pendingProperties={pendingProperties}
            pendingReels={pendingReels}
            reports={reports}
          />
        </div>
      </section>
    </main>
  );
}
