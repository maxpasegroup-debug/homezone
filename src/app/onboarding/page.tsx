import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleOnboarding } from "@/components/onboarding/role-onboarding";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/onboarding");
  }

  const profile = await getOrCreateProfile(user);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          <RoleOnboarding defaultRole={profile.role} email={user.email} />
        </div>
      </section>
    </main>
  );
}
