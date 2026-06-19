import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelsFeed } from "@/components/reels/reels-feed";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReelsPage() {
  const reels = await db.propertyReel.findMany({
    where: {
      status: "PUBLISHED"
    },
    include: {
      property: {
        select: {
          city: true,
          id: true,
          locality: true,
          owner: {
            select: {
              fullName: true,
              id: true,
              role: true,
              verificationStatus: true
            }
          },
          title: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 7
  });

  const hasMore = reels.length > 6;
  const initialReels = hasMore ? reels.slice(0, 6) : reels;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Property Reels</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Watch before you visit
            </h1>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/reels/new">
              <Plus className="h-4 w-4" />
              Upload Reel
            </Link>
          </Button>
        </div>

        <ReelsFeed
          initialNextCursor={hasMore ? initialReels.at(-1)?.id ?? null : null}
          initialReels={initialReels}
        />
      </section>
    </main>
  );
}
