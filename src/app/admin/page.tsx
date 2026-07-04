import { AdminControlCenter } from "@/components/admin/admin-control-center";
import { getAdminOperationsData } from "@/lib/admin/operations";
import { requireAdminProfile } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminProfile();
  const data = await getAdminOperationsData();

  return (
    <main>
      <section className="container py-8 sm:py-10">
        <AdminControlCenter data={data} />
      </section>
    </main>
  );
}
