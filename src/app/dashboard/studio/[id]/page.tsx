import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText, History, PackageCheck, UsersRound } from "lucide-react";
import type { PaymentProduct } from "@prisma/client";
import { StudioCustomerActions } from "@/components/studio/studio-customer-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { getStudioService } from "@/lib/studio-data";
import { requireStudioOrderAccess, studioLabel } from "@/lib/studio/workflow";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value / 100);
}

export default async function StudioOrderDetailPage({ params }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  const profile = await getOrCreateProfile(user);
  const { id } = await params;
  const access = await requireStudioOrderAccess(id, profile);
  if ("error" in access) redirect("/dashboard/studio");

  const order = access.order;
  const service = getStudioService(order.serviceType);
  const product = service?.product ?? "STUDIO_PHOTOGRAPHY";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard/studio">
          Studio Dashboard
        </Link>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.42fr]">
          <Card className="p-7 shadow-soft sm:p-10">
            <p className="text-sm font-bold text-violet-700">{studioLabel(order.status)}</p>
            <h1 className="mt-3 text-5xl font-bold tracking-tight">{order.serviceType}</h1>
            <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">{order.notes ?? "Studio production details will appear as the team works on this order."}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Info label="Order Value" value={order.orderValue ? rupees(order.orderValue) : (order.budget ?? "To confirm")} />
              <Info label="Payment" value={studioLabel(order.paymentStatus)} />
              <Info label="Location" value={order.city ?? "Not set"} />
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="font-bold">Customer actions</p>
            <div className="mt-5">
              <StudioCustomerActions
                city={order.city}
                orderId={order.id}
                paymentStatus={order.paymentStatus}
                product={product as PaymentProduct}
                status={order.status}
              />
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <UsersRound className="h-4 w-4" />
              Assigned Team
            </p>
            <div className="mt-5 space-y-3">
              {order.assignments.map((assignment) => (
                <div className="rounded-2xl bg-muted p-4" key={assignment.id}>
                  <p className="font-bold">{studioLabel(assignment.role)}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    {assignment.assignee?.fullName ?? assignment.assignee?.user?.email ?? "Assigned team member"}
                  </p>
                </div>
              ))}
              {!order.assignments.length ? <Empty text="Team assignment appears after payment and operations review." /> : null}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <PackageCheck className="h-4 w-4" />
              Delivered Files
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {order.files.map((file) => (
                <div className="rounded-[1.5rem] border bg-white p-5" key={file.id}>
                  <p className="text-xs font-bold text-violet-700">Version {file.version} / {studioLabel(file.fileType)}</p>
                  <h2 className="mt-2 font-bold">{file.fileName}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{file.notes ?? "Ready for preview and download."}</p>
                  <Button asChild className="mt-4" size="sm" variant="outline">
                    <a href={file.fileUrl} rel="noreferrer" target="_blank">
                      <Download className="h-4 w-4" />
                      Open File
                    </a>
                  </Button>
                </div>
              ))}
              {!order.files.length ? <Empty text="Delivered photos, videos, brochures, and creatives will appear here." /> : null}
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <History className="h-4 w-4" />
              Production Timeline
            </p>
            <div className="mt-5 space-y-3">
              {order.timeline.map((event) => (
                <div className="rounded-2xl bg-muted p-4" key={event.id}>
                  <p className="font-bold">{studioLabel(event.eventType)}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.message}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{event.createdAt.toLocaleString("en-IN")}</p>
                </div>
              ))}
              {!order.timeline.length ? <Empty text="Timeline starts when the order is created." /> : null}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <FileText className="h-4 w-4" />
              Revisions
            </p>
            <div className="mt-5 space-y-3">
              {order.revisions.map((revision) => (
                <div className="rounded-2xl bg-muted p-4" key={revision.id}>
                  <p className="font-bold">Version {revision.version} / {studioLabel(revision.status)}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{revision.comments}</p>
                </div>
              ))}
              {!order.revisions.length ? <Empty text="Revision history will appear after the first delivery." /> : null}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed bg-white p-4 text-sm font-semibold text-muted-foreground">{text}</p>;
}
