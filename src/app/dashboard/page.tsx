import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeZoneDashboard } from "@/components/dashboard/homezone-dashboard";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { requireDashboardProfile } from "@/lib/auth/dashboard";
import { isAdminRole } from "@/lib/auth/roles";
import { getOwnerDashboardData, getUserDashboardData } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireDashboardProfile("/dashboard");

  if (isAdminRole(profile.role)) {
    redirect("/admin");
  }

  const ownerData =
    profile.role === "OWNER" ? await getOwnerDashboardData(profile.id) : null;
  const data = ownerData ? null : await getUserDashboardData(profile.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          {ownerData ? (
            <OwnerDashboard data={ownerData} />
          ) : data ? (
            <HomeZoneDashboard data={data} email={data.profile?.user.email} />
          ) : null}
        </div>
      </section>
    </main>
  );
}
