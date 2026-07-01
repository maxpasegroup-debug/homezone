import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardStudioPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/studio");
  }

  const profile = await getOrCreateProfile(user);
  const requests = await db.studioRequest.findMany({
    where: {
      requesterId: profile.id
    },
    include: {
      property: true
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
            <p className="text-sm font-semibold text-violet-700">
              HomeZone Studio
            </p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Studio requests
            </h1>
          </div>
          <Button asChild size="lg">
            <Link href="/studio">
              <Camera className="h-4 w-4" />
              Book Studio
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <Card className="p-6 shadow-sm" key={request.id}>
              <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {request.status.replace("_", " ")}
              </p>
              <h2 className="mt-5 text-2xl font-bold">{request.serviceType}</h2>
              <p className="mt-2 text-sm font-semibold text-violet-700">
                {request.city ?? "City not set"} / {request.budget ?? "Budget not set"}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {request.notes}
              </p>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                WhatsApp update pending provider setup
              </p>
            </Card>
          ))}
          {!requests.length ? (
            <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-bold">No Studio requests yet</h2>
              <p className="mt-3 text-muted-foreground">
                Book photography, drone, walkthrough, brochures, reels, or ad creatives.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
