import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Clock, IndianRupee, PackageCheck, Star, UsersRound } from "lucide-react";
import { StudioAdminActions } from "@/components/studio/studio-admin-actions";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminStudioOperationsData, studioLabel } from "@/lib/studio/workflow";

export const dynamic = "force-dynamic";

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value / 100);
}

export default async function AdminStudioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth?next=/admin/studio");

  const profile = await getOrCreateProfile(user);
  if (!isAdminRole(profile.role)) redirect("/dashboard");

  const data = await getAdminStudioOperationsData();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/admin">
          Admin
        </Link>
        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-semibold text-violet-700">Studio Operations</p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight">HomeZone Studio control room</h1>
          <p className="mt-4 leading-8 text-muted-foreground">
            Assign creators, track production, upload deliveries, monitor revisions, and keep paid Studio work moving.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={PackageCheck} label="Orders" value={data.analytics.orders} />
          <Metric icon={IndianRupee} label="Revenue" value={rupees(data.analytics.revenue)} />
          <Metric icon={Clock} label="Avg Delivery" value={`${data.analytics.averageDeliveryDays} days`} />
          <Metric icon={Activity} label="Pending Work" value={data.analytics.pendingWork} />
          <Metric icon={Star} label="Satisfaction" value={data.analytics.customerSatisfaction || "New"} />
        </div>

        <div className="mt-8 space-y-5">
          {data.orders.map((order) => (
            <Card className="p-6 shadow-sm" key={order.id}>
              <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
                <div>
                  <p className="text-xs font-bold text-violet-700">{studioLabel(order.status)} / {studioLabel(order.paymentStatus)}</p>
                  <h2 className="mt-2 text-2xl font-bold">{order.serviceType}</h2>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">
                    {order.requester?.fullName ?? order.requester?.user?.email ?? "Customer"} / {order.city ?? "City not set"}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Mini label="Files" value={order.files.length} />
                    <Mini label="Revisions" value={order.revisions.length} />
                    <Mini label="Assignments" value={order.assignments.length} />
                    <Mini label="Value" value={order.orderValue ? rupees(order.orderValue) : "To confirm"} />
                  </div>
                </div>
                <StudioAdminActions orderId={order.id} />
              </div>
            </Card>
          ))}
          {!data.orders.length ? (
            <Card className="p-8 text-center shadow-sm">
              <UsersRound className="mx-auto h-10 w-10 text-violet-700" />
              <h2 className="mt-4 text-2xl font-bold">No Studio orders yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Paid and submitted Studio orders will appear here for assignment, production, delivery, and approvals.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof PackageCheck; label: string; value: number | string }) {
  return (
    <Card className="p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
    </div>
  );
}
