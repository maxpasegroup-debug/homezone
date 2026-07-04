import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnerListingEditor } from "@/components/properties/owner-listing-editor";
import { getSessionUser } from "@/lib/auth/session";

type NewListingPageProps = {
  searchParams?: Promise<{
    intent?: string;
  }>;
};

const allowedIntents = ["BUY", "RENT", "LEASE", "INVEST"];

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  const user = await getSessionUser();
  const params = await searchParams;
  const intent = allowedIntents.includes(String(params?.intent)) ? String(params?.intent) : undefined;

  if (!user) {
    redirect("/auth?next=/dashboard/listings/new");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-10">
          <OwnerListingEditor property={intent ? { intent } : undefined} />
        </div>
      </section>
    </main>
  );
}
