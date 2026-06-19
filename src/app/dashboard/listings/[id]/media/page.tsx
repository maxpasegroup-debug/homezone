import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PropertyMediaManager } from "@/components/properties/property-media-manager";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingMediaPage({ params }: PageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/listings");
  }

  const { id } = await params;
  const profile = await getOrCreateProfile(user);
  const property = await db.property.findUnique({
    where: {
      id
    }
  });

  if (!property) {
    notFound();
  }

  if (property.ownerId !== profile.id && !isAdminRole(profile.role)) {
    redirect("/dashboard/listings");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard/listings">
          My Listings
        </Link>
        <div className="mt-10">
          <PropertyMediaManager propertyId={property.id} />
        </div>
      </section>
    </main>
  );
}
