import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, Camera, CheckCircle2, Clock, CreditCard, PackageCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { getStudioDashboardData, studioLabel } from "@/lib/studio/workflow";

export const dynamic = "force-dynamic";

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value / 100);
}

const activeStatuses = ["SUBMITTED", "PAYMENT_PENDING", "PAID", "ASSIGNED", "IN_PRODUCTION", "QUALITY_CHECK", "DELIVERED", "REVISION_REQUESTED"];

export default async function DashboardStudioPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/studio");
  }

  const profile = await getOrCreateProfile(user);
  const data = await getStudioDashboardData(profile.id);
  const activeOrders = data.orders.filter((order) => activeStatuses.includes(order.status));
  const upcomingShoots = data.orders.filter((order) => order.scheduledAt && order.status !== "COMPLETED" && order.status !== "CANCELLED");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">HomeZone Studio</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Studio dashboard</h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Track orders, payments, assigned teams, shoots, deliveries, revisions, and final approvals.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/studio">
              <Camera className="h-4 w-4" />
              Book Studio
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Clock} label="Active Orders" value={activeOrders.length} />
          <Metric icon={CreditCard} label="Pending Orders" value={data.analytics.pendingOrders} />
          <Metric icon={CheckCircle2} label="Completed" value={data.analytics.completedOrders} />
          <Metric icon={PackageCheck} label="Studio Spend" value={rupees(data.analytics.revenue)} />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_.75fr]">
          <Card className="p-6 shadow-soft">
            <p className="text-sm font-bold text-violet-700">Active Orders</p>
            <div className="mt-5 space-y-4">
              {activeOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
              {!activeOrders.length ? (
                <EmptyState
                  cta="Create Studio Order"
                  href="/studio"
                  text="No active Studio orders yet. Start with photography, drone, video, brochure, ads, staging, or voice-over."
                  title="Your Studio queue is clear"
                />
              ) : null}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-6 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                <CalendarDays className="h-4 w-4" />
                Upcoming Shoots
              </p>
              <div className="mt-5 space-y-3">
                {upcomingShoots.map((order) => (
                  <Link className="block rounded-2xl bg-muted p-4" href={`/dashboard/studio/${order.id}` as Route} key={order.id}>
                    <p className="font-bold">{order.serviceType}</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {order.scheduledAt?.toLocaleString("en-IN")}
                    </p>
                  </Link>
                ))}
                {!upcomingShoots.length ? <p className="rounded-2xl border border-dashed p-4 text-sm font-semibold text-muted-foreground">No shoot scheduled yet.</p> : null}
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                <UsersRound className="h-4 w-4" />
                Assigned Team
              </p>
              <div className="mt-5 space-y-3">
                {activeOrders.flatMap((order) => order.assignments.slice(0, 3).map((assignment) => (
                  <Link className="block rounded-2xl bg-muted p-4" href={`/dashboard/studio/${order.id}` as Route} key={assignment.id}>
                    <p className="font-bold">{studioLabel(assignment.role)}</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {assignment.assignee?.fullName ?? assignment.assignee?.user?.email ?? "Team member assigned"}
                    </p>
                  </Link>
                )))}
                {!activeOrders.some((order) => order.assignments.length) ? <p className="rounded-2xl border border-dashed p-4 text-sm font-semibold text-muted-foreground">Team assignment appears after payment and operations review.</p> : null}
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-8 p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-700">All Studio Orders</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            {!data.orders.length ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  cta="Explore Studio Services"
                  href="/studio"
                  text="Create a draft or submit a paid Studio order to manage property marketing from one place."
                  title="No Studio orders yet"
                />
              </div>
            ) : null}
          </div>
        </Card>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: number | string }) {
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

function OrderRow({ order }: { order: Awaited<ReturnType<typeof getStudioDashboardData>>["orders"][number] }) {
  const progress = getProgress(order.status);
  return (
    <Link className="block rounded-[1.5rem] border bg-white p-5 transition hover:border-violet-200 hover:shadow-sm" href={`/dashboard/studio/${order.id}` as Route}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-violet-700">{studioLabel(order.status)}</p>
          <h2 className="mt-2 text-2xl font-bold">{order.serviceType}</h2>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{order.city ?? "Location pending"} / {order.budget ?? rupees(order.orderValue)}</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{studioLabel(order.paymentStatus)}</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-violet-700" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}

function OrderCard({ order }: { order: Awaited<ReturnType<typeof getStudioDashboardData>>["orders"][number] }) {
  return (
    <Card className="p-6 shadow-sm">
      <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{studioLabel(order.status)}</p>
      <h2 className="mt-5 text-2xl font-bold">{order.serviceType}</h2>
      <p className="mt-2 text-sm font-semibold text-violet-700">{order.city ?? "City not set"} / {order.budget ?? rupees(order.orderValue)}</p>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{order.notes ?? "Studio team will collect production details during assignment."}</p>
      <Button asChild className="mt-5 w-full" variant="outline">
        <Link href={`/dashboard/studio/${order.id}` as Route}>Open Order</Link>
      </Button>
    </Card>
  );
}

function EmptyState({ cta, href, text, title }: { cta: string; href: string; text: string; title: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed bg-white p-8 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{text}</p>
      <Button asChild className="mt-5">
        <Link href={href as Route}>{cta}</Link>
      </Button>
    </div>
  );
}

function getProgress(status: string) {
  const steps = ["DRAFT", "SUBMITTED", "PAYMENT_PENDING", "PAID", "ASSIGNED", "IN_PRODUCTION", "QUALITY_CHECK", "DELIVERED", "CUSTOMER_APPROVED", "COMPLETED"];
  const index = Math.max(0, steps.indexOf(status));
  return Math.max(8, Math.round(((index + 1) / steps.length) * 100));
}
