import Link from "next/link";
import { HomeZoneDashboard } from "@/components/dashboard/homezone-dashboard";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const profile = user ? await getOrCreateProfile(user) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          {user ? (
            <HomeZoneDashboard
              city={profile?.city}
              email={user.email}
              role={profile?.role}
              whatsappVerified={profile?.whatsappVerified}
            />
          ) : (
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-violet-100 bg-white p-8 text-center shadow-soft">
              <h1 className="text-4xl font-bold">Verify to open dashboard</h1>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
                HomeZone keeps public discovery open. Dashboard actions require
                a verified account for trust and lead quality.
              </p>
              <a
                className="mt-7 inline-flex h-14 items-center justify-center rounded-full bg-violet-700 px-7 text-base font-bold text-white shadow-glow"
                href="/auth"
              >
                Verify Account
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
