import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Film, Home, Users } from "lucide-react";
import { CreatorFollowButton } from "@/components/reels/creator-follow-button";
import { Card } from "@/components/ui/card";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CreatorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [profile, followersCount, followingCount] = await Promise.all([
    db.profile.findFirst({
      where: {
        id,
        role: {
          in: ["BROKER", "BUILDER"]
        }
      },
      include: {
        properties: {
          where: {
            status: "PUBLISHED"
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 6
        }
      }
    }),
    db.profileFollow.count({
      where: {
        targetId: id
      }
    }),
    db.profileFollow.count({
      where: {
        followerId: id
      }
    })
  ]);

  if (!profile) {
    notFound();
  }

  const reels = await db.propertyReel.findMany({
    where: {
      ownerId: profile.id,
      status: "PUBLISHED"
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 6
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/reels">
          Property Reels
        </Link>

        <Card className="mt-8 overflow-hidden shadow-soft">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.72fr]">
            <div className="p-7 sm:p-10">
              <p className="text-sm font-semibold text-violet-700">
                {profile.role === "BROKER" ? "Broker Creator" : "Builder Creator"}
              </p>
              <h1 className="mt-3 text-5xl font-bold tracking-tight">
                {profile.fullName ?? `${profile.role} profile`}
              </h1>
              <div className="mt-5">
                <VerificationBadge
                  entity={profile.role === "BROKER" ? "broker" : "builder"}
                  status={profile.verificationStatus}
                />
              </div>
              <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                {profile.city ?? profile.country} marketplace profile with live listings,
                reels, and follower activity.
              </p>
            </div>
            <div className="bg-slate-950 p-7 text-white sm:p-10">
              <Building2 className="h-10 w-10" />
              <h2 className="mt-5 text-3xl font-bold">Creator signals</h2>
              <div className="mt-6 grid gap-3">
                <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">
                  {followersCount} followers
                </p>
                <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">
                  {followingCount} following
                </p>
                <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">
                  {profile.properties.length} recent listings
                </p>
                <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">
                  {reels.length} published reels
                </p>
              </div>
            </div>
          </div>
        </Card>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          <Card className="p-6 shadow-sm sm:p-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Users className="h-4 w-4" />
              Follow profile
            </p>
            <div className="mt-5">
              <CreatorFollowButton
                initialFollowersCount={followersCount}
                profileId={profile.id}
              />
            </div>
          </Card>

          <Card className="p-6 shadow-sm sm:p-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Home className="h-4 w-4" />
              Listings
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {profile.properties.map((property) => (
                <Link
                  className="rounded-2xl bg-muted p-4"
                  href={`/properties/${property.id}`}
                  key={property.id}
                >
                  <h3 className="font-bold">{property.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">
                    {[property.locality, property.city].filter(Boolean).join(", ")}
                  </p>
                </Link>
              ))}
              {!profile.properties.length ? (
                <p className="rounded-2xl bg-muted p-4 text-sm font-bold text-muted-foreground">
                  No public listings yet.
                </p>
              ) : null}
            </div>
          </Card>
        </section>

        <Card className="mt-8 p-6 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <Film className="h-4 w-4" />
            Reels
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reels.map((reel) => (
              <Link
                className="overflow-hidden rounded-2xl bg-slate-950 text-white"
                href={{
                  pathname: "/reels/[id]",
                  query: {
                    id: reel.id
                  }
                }}
                key={reel.id}
              >
                <video className="aspect-[9/14] w-full object-cover" src={reel.videoUrl} />
                <div className="p-4">
                  <h3 className="font-bold">{reel.title}</h3>
                  <p className="mt-2 text-xs text-white/62">
                    {reel.viewsCount} views, {reel.leadsCount} leads
                  </p>
                </div>
              </Link>
            ))}
            {!reels.length ? (
              <p className="rounded-2xl bg-muted p-4 text-sm font-bold text-muted-foreground">
                No published reels yet.
              </p>
            ) : null}
          </div>
        </Card>
      </section>
    </main>
  );
}
