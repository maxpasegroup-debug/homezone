import Link from "next/link";
import { BuilderDashboard } from "@/components/dashboard/builder-dashboard";
import { requireDashboardRole } from "@/lib/auth/dashboard";
import { getBuilderDashboardData } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const profile = await requireDashboardRole(["BUILDER"], "/builder");
  const data = await getBuilderDashboardData(profile.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-10">
          <BuilderDashboard data={data} />
        </div>
      </section>
    </main>
  );
}
