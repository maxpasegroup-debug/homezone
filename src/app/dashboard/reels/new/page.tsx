import Link from "next/link";
import { redirect } from "next/navigation";
import { ReelForm } from "@/components/reels/reel-form";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export default async function NewReelPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/reels/new");
  }

  const profile = await getOrCreateProfile(user);
  const properties = await db.property.findMany({
    where: {
      ownerId: profile.id
    },
    select: {
      id: true,
      title: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard/reels">
          Reels
        </Link>
        <div className="mt-10">
          <ReelForm properties={properties} />
        </div>
      </section>
    </main>
  );
}
