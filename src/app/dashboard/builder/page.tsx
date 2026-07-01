import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveBuilderDashboard } from "@/components/builder/live-builder-dashboard";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardBuilderPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/builder");
  }

  const profile = await getOrCreateProfile(user);
  const projects = await db.builderProject.findMany({
    where:
      profile.role === "ADMIN"
        ? {}
        : {
            builderId: profile.id
          },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-10">
          <LiveBuilderDashboard projects={projects} />
        </div>
      </section>
    </main>
  );
}
