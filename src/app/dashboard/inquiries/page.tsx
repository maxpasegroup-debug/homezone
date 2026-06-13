import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/inquiries");
  }

  const profile = await getOrCreateProfile(user);
  const inquiries = await db.lead.findMany({
    where: {
      OR: [
        {
          userId: profile.id
        },
        {
          assignedTo: profile.id
        }
      ]
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
        <h1 className="mt-8 text-5xl font-bold tracking-tight">Inquiries</h1>
        <div className="mt-10 grid gap-5">
          {inquiries.map((inquiry) => (
            <Card className="p-6 shadow-sm" key={inquiry.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-violet-700">
                    {inquiry.stage.replace("_", " ")}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{inquiry.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {inquiry.message}
                  </p>
                  {inquiry.property ? (
                    <p className="mt-2 text-sm font-semibold">
                      Property: {inquiry.property.title}
                    </p>
                  ) : null}
                </div>
                <p className="text-3xl font-bold">{inquiry.aiScore}</p>
              </div>
            </Card>
          ))}
          {!inquiries.length ? (
            <Card className="p-8 text-center shadow-sm">
              <h2 className="text-2xl font-bold">No inquiries yet</h2>
              <p className="mt-3 text-muted-foreground">
                Contact requests and site visit leads will appear here.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
