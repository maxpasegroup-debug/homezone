import Link from "next/link";
import { OwnerListingEditor } from "@/components/properties/owner-listing-editor";
import { requireAdminProfile } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type AdminNewListingPageProps = {
  searchParams?: Promise<{
    intent?: string;
  }>;
};

const allowedIntents = ["BUY", "RENT", "LEASE", "INVEST"];

export default async function AdminNewListingPage({ searchParams }: AdminNewListingPageProps) {
  await requireAdminProfile();
  const params = await searchParams;
  const intent = allowedIntents.includes(String(params?.intent)) ? String(params?.intent) : undefined;

  return (
    <main>
      <section className="container py-8 sm:py-10">
        <Link className="text-sm font-bold text-violet-700" href="/admin/marketplace">
          Marketplace Setup
        </Link>
        <div className="mt-8">
          <OwnerListingEditor property={intent ? { intent } : undefined} />
        </div>
      </section>
    </main>
  );
}
