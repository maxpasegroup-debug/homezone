import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Building2, Home, MapPin } from "lucide-react";
import { ReelActions } from "@/components/reels/reel-actions";
import { Card } from "@/components/ui/card";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReelDetailPage({ params }: PageProps) {
  const { id } = await params;
  const reel = await db.propertyReel.findFirst({
    where: {
      id,
      status: "PUBLISHED"
    },
    include: {
      property: {
        include: {
          owner: {
            select: {
              fullName: true,
              id: true,
              role: true,
              verificationStatus: true
            }
          }
        }
      }
    }
  });

  if (!reel) {
    notFound();
  }

  const owner = reel.property?.owner;
  const canFollow = owner?.role === "BROKER" || owner?.role === "BUILDER";
  const followersCount = owner
    ? await db.profileFollow.count({
        where: {
          targetId: owner.id
        }
      })
    : 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/reels">
          Property Reels
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(320px,0.42fr)]">
          <Card className="overflow-hidden bg-slate-950 text-white shadow-soft">
            <video
              className="aspect-[9/14] w-full bg-black object-cover lg:max-h-[760px]"
              controls
              poster={reel.thumbnailUrl ?? undefined}
              src={reel.videoUrl}
            />
          </Card>

          <aside className="space-y-6">
            <Card className="bg-slate-950 p-6 text-white shadow-soft sm:p-8">
              <p className="text-sm font-semibold text-white/62">Reel Detail</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">
                {reel.title}
              </h1>
              {reel.property ? (
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/72">
                  <MapPin className="h-4 w-4" />
                  {[reel.property.locality, reel.property.city].filter(Boolean).join(", ")}
                </p>
              ) : null}

              {owner ? (
                <div className="mt-5">
                  <Link
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
                    href={{
                      pathname: "/creators/[id]",
                      query: {
                        id: owner.id
                      }
                    }}
                  >
                    <Building2 className="h-4 w-4" />
                    {owner.fullName ?? `${owner.role} creator`}
                  </Link>
                </div>
              ) : null}

              <div className="mt-6">
                <ReelActions
                  canFollow={canFollow}
                  followTargetId={owner?.id}
                  initialFollowersCount={followersCount}
                  initialLikesCount={reel.likesCount}
                  initialSavesCount={reel.savesCount}
                  initialSharesCount={reel.sharesCount}
                  reelId={reel.id}
                />
              </div>
            </Card>

            <Card className="p-6 shadow-sm sm:p-8">
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <BarChart3 className="h-4 w-4" />
                Reel analytics
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold">
                <span className="rounded-2xl bg-muted p-4">{reel.viewsCount} views</span>
                <span className="rounded-2xl bg-muted p-4">{reel.likesCount} likes</span>
                <span className="rounded-2xl bg-muted p-4">{reel.savesCount} saves</span>
                <span className="rounded-2xl bg-muted p-4">{reel.sharesCount} shares</span>
                <span className="rounded-2xl bg-muted p-4">{reel.leadsCount} leads</span>
              </div>
            </Card>

            {reel.property ? (
              <Card className="p-6 shadow-sm sm:p-8">
                <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                  <Home className="h-4 w-4" />
                  Related property
                </p>
                <h2 className="mt-3 text-2xl font-bold">{reel.property.title}</h2>
                <div className="mt-3">
                  <VerificationBadge
                    entity="property"
                    status={reel.property.verificationStatus}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">
                  {[reel.property.locality, reel.property.city].filter(Boolean).join(", ")}
                </p>
                <Link
                  className="mt-5 inline-flex text-sm font-bold text-violet-700"
                  href={`/properties/${reel.property.id}`}
                >
                  View property
                </Link>
              </Card>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
