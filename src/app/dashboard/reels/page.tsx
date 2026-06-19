import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardReelsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/reels");
  }

  const profile = await getOrCreateProfile(user);
  const reels = await db.propertyReel.findMany({
    where: {
      ownerId: profile.id
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
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Property Reels</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Manage reels</h1>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/reels/new">
              <Plus className="h-4 w-4" />
              New Reel
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {reels.map((reel) => (
            <Card className="overflow-hidden shadow-sm" key={reel.id}>
              <video className="aspect-[9/14] w-full bg-slate-950 object-cover" controls src={reel.videoUrl} />
              <div className="p-5">
                <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {reel.status.replace("_", " ")}
                </p>
                <h2 className="mt-4 text-xl font-bold">{reel.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reel.viewsCount} views, {reel.likesCount} likes, {reel.savesCount} saves, {reel.sharesCount} shares, {reel.leadsCount} leads
                </p>
              </div>
            </Card>
          ))}
          {!reels.length ? (
            <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-bold">No reels yet</h2>
              <p className="mt-3 text-muted-foreground">
                Upload your first vertical property walkthrough.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
