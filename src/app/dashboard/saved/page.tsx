import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/saved");
  }

  const profile = await getOrCreateProfile(user);
  const saved = await db.savedProperty.findMany({
    where: {
      userId: profile.id
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
        <h1 className="mt-8 text-5xl font-bold tracking-tight">
          Saved Properties
        </h1>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {saved.map((item) => (
            <Card className="p-6 shadow-sm" key={item.propertyId}>
              <h2 className="text-2xl font-bold">{item.property.title}</h2>
              <div className="mt-3">
                <VerificationBadge
                  entity="property"
                  status={item.property.verificationStatus}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-violet-700">
                {[item.property.locality, item.property.city].filter(Boolean).join(", ")}
              </p>
              <Link
                className="mt-6 inline-flex font-bold text-violet-700"
                href={`/properties/${item.property.id}`}
              >
                View property
              </Link>
            </Card>
          ))}
          {!saved.length ? (
            <Card className="p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <h2 className="text-2xl font-bold">Nothing saved yet</h2>
              <p className="mt-3 text-muted-foreground">
                Save properties from the marketplace to compare later.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
