import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OwnerListingEditor } from "@/components/properties/owner-listing-editor";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditListingPage({ params }: PageProps) {
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
          <OwnerListingEditor
            property={{
              address: property.address ?? "",
              amenities: property.amenities,
              areaUnit: property.areaUnit,
              areaValue: property.areaValue?.toString() ?? "",
              bathrooms: property.bathrooms?.toString() ?? "",
              bedrooms: property.bedrooms?.toString() ?? "",
              category: property.category,
              city: property.city,
              country: property.country,
              coverImageUrl: property.coverImageUrl ?? "",
              currency: property.currency,
              description: property.description ?? "",
              id: property.id,
              intent: property.intent,
              latitude: property.latitude?.toString() ?? "",
              locality: property.locality ?? "",
              longitude: property.longitude?.toString() ?? "",
              price: property.price?.toString() ?? "",
              propertyType: property.propertyType,
              state: property.state ?? "",
              status: property.status,
              timezone: property.timezone ?? "",
              title: property.title,
              videoUrl: property.videoUrl ?? "",
              virtualTourUrl: property.virtualTourUrl ?? ""
            }}
          />
        </div>
      </section>
    </main>
  );
}
