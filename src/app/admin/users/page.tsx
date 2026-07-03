import Link from "next/link";
import { Search } from "lucide-react";
import { AdminUserPanel } from "@/components/admin/admin-action-panels";
import { Card } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth/admin";
import { formatAdminStatus, getAdminUsers } from "@/lib/admin/operations";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
};

const roles = ["ALL", "USER", "OWNER", "BROKER", "BUILDER", "SERVICE_PROVIDER", "ADMIN", "SUPER_ADMIN"];
const statuses = ["ALL", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdminProfile();
  const params = await searchParams;
  const users = await getAdminUsers({ q: params.q, role: params.role, status: params.status });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/admin">Admin</Link>
        <h1 className="mt-8 text-5xl font-bold tracking-tight">User management</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Search profiles, verify owners, suspend or reactivate users, and adjust workspaces without deleting accounts.
        </p>

        <Card className="mt-8 p-4 shadow-sm">
          <form className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_auto]">
            <label className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
              <input className="h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-sm font-semibold outline-none" defaultValue={params.q} name="q" placeholder="Search name, email, phone, city" />
            </label>
            <select className="h-12 rounded-2xl border bg-white px-4 text-sm font-bold" defaultValue={params.role ?? "ALL"} name="role">
              {roles.map((role) => <option key={role}>{role}</option>)}
            </select>
            <select className="h-12 rounded-2xl border bg-white px-4 text-sm font-bold" defaultValue={params.status ?? "ALL"} name="status">
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button className="rounded-2xl bg-violet-700 px-5 text-sm font-bold text-white" type="submit">Filter</button>
          </form>
        </Card>

        <div className="mt-8 grid gap-5">
          {users.map((profile) => (
            <Card className="p-6 shadow-sm" key={profile.id}>
              <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{profile.role}</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{formatAdminStatus(profile.verificationStatus)}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold">{profile.fullName ?? profile.user.email ?? "HomeZone user"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{[profile.user.email, profile.phone, profile.city].filter(Boolean).join(" · ")}</p>
                  <p className="mt-3 text-xs font-bold text-muted-foreground">
                    Listings {profile._count.properties} · Buyer leads {profile._count.userLeads} · Assigned leads {profile._count.assignedLeads}
                  </p>
                  <p className="mt-2 text-xs font-bold text-muted-foreground">
                    Verified by {profile.verifiedBy ?? "none"} · {profile.verifiedAt ? profile.verifiedAt.toLocaleString("en-IN") : "not verified"}
                  </p>
                </div>
                <AdminUserPanel profileId={profile.id} role={profile.role} verificationStatus={profile.verificationStatus} />
              </div>
            </Card>
          ))}
          {!users.length ? (
            <Card className="p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold">No users found</h2>
              <p className="mt-3 text-muted-foreground">Try a different search or filter.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
