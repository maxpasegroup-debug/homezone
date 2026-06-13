import Link from "next/link";
import { redirect } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { getSessionUser } from "@/lib/auth/session";

export default async function NewListingPage() {
  const user = await getSessionUser();

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
          <PropertyForm />
        </div>
      </section>
    </main>
  );
}
