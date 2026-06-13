import Link from "next/link";
import { Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const demoReels = [
  "Sea-view apartment, Kochi",
  "Family villa under 80L",
  "Prime land near highway"
];

export default async function ReelsPage() {
  const reels = await db.propertyReel.findMany({
    where: {
      status: "PUBLISHED"
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Property Reels</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Watch before you visit</h1>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/reels/new">
              <Plus className="h-4 w-4" />
              Upload Reel
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reels.length
            ? reels.map((reel) => (
                <Card className="overflow-hidden bg-slate-950 text-white shadow-soft" key={reel.id}>
                  <video className="aspect-[9/14] w-full object-cover" controls src={reel.videoUrl} />
                  <div className="p-5">
                    <h2 className="text-xl font-bold">{reel.title}</h2>
                    <p className="mt-2 text-sm text-white/60">Like · Save · Contact</p>
                  </div>
                </Card>
              ))
            : demoReels.map((title, index) => (
                <Card className="flex aspect-[9/14] flex-col justify-end overflow-hidden bg-gradient-to-br from-violet-700 to-fuchsia-500 p-6 text-white shadow-soft" key={title}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                    <Play className="h-5 w-5 fill-white" />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold">{title}</h2>
                  <p className="mt-2 text-sm text-white/70">Demo reel {index + 1}</p>
                </Card>
              ))}
        </div>
      </section>
    </main>
  );
}
