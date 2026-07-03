import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, ImageIcon, UserRound } from "lucide-react";
import { AdminModerationPanel, AdminUserPanel } from "@/components/admin/admin-action-panels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { formatAdminStatus, getAdminListingDetail } from "@/lib/admin/operations";
import { requireAdminProfile } from "@/lib/auth/admin";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminListingDetailPage({ params }: PageProps) {
  await requireAdminProfile();
  const { id } = await params;
  const property = await getAdminListingDetail(id);

  if (!property) notFound();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Button asChild variant="outline">
          <Link href={"/admin/listings" as Route}>
            <ArrowLeft className="h-4 w-4" />
            Listing Queue
          </Link>
        </Button>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_25rem]">
          <div className="space-y-6">
            <Card className="p-6 shadow-soft">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{formatAdminStatus(property.status)}</span>
                <VerificationBadge entity="property" status={property.verificationStatus} />
              </div>
              <h1 className="mt-4 text-5xl font-bold tracking-tight">{property.title}</h1>
              <p className="mt-3 text-violet-700 font-semibold">{[property.locality, property.city, property.state].filter(Boolean).join(", ")}</p>
              <p className="mt-5 leading-8 text-muted-foreground">{property.description}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <Info label="Price" value={property.price?.toString() ?? "Not set"} />
                <Info label="Area" value={property.areaValue ? `${property.areaValue} ${property.areaUnit}` : "Not set"} />
                <Info label="Views" value={String(property._count.viewedBy)} />
                <Info label="Leads" value={String(property._count.leads)} />
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                <ImageIcon className="h-4 w-4" />
                Media Review
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[property.coverImageUrl, ...property.mediaUrls].filter(Boolean).map((url) => (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl" key={url}>
                    <Image alt={property.title} className="object-cover" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" src={url!} />
                  </div>
                ))}
                {property.videoUrl ? (
                  <a className="rounded-3xl bg-muted p-5 text-sm font-bold text-violet-700" href={property.videoUrl} rel="noreferrer" target="_blank">Open walkthrough video</a>
                ) : null}
                {property.virtualTourUrl ? (
                  <a className="rounded-3xl bg-muted p-5 text-sm font-bold text-violet-700" href={property.virtualTourUrl} rel="noreferrer" target="_blank">Open virtual tour</a>
                ) : null}
                {!property.mediaUrls.length && !property.coverImageUrl ? <p className="text-sm text-muted-foreground">No media uploaded.</p> : null}
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                <FileText className="h-4 w-4" />
                Document Review
              </p>
              <div className="mt-5 grid gap-3">
                {property.documents.map((document) => (
                  <div className="rounded-2xl bg-muted p-4" key={document.id}>
                    <p className="text-sm font-bold">{formatAdminStatus(document.documentType)}</p>
                    <a className="mt-1 block text-sm font-semibold text-violet-700" href={document.fileUrl} rel="noreferrer" target="_blank">
                      {document.fileName}
                    </a>
                    {document.notes ? <p className="mt-2 text-sm text-muted-foreground">{document.notes}</p> : null}
                  </div>
                ))}
                {!property.documents.length ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : null}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                <UserRound className="h-4 w-4" />
                Owner Verification
              </p>
              <h2 className="mt-2 text-2xl font-bold">{property.owner?.fullName ?? property.owner?.user.email ?? "Unknown owner"}</h2>
              {property.owner ? (
                <div className="mt-4">
                  <VerificationBadge entity="broker" status={property.owner.verificationStatus} />
                  <div className="mt-4">
                    <AdminUserPanel
                      profileId={property.owner.id}
                      role={property.owner.role}
                      verificationStatus={property.owner.verificationStatus}
                    />
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="p-6 shadow-sm">
              <p className="text-sm font-bold text-violet-700">Moderation Decision</p>
              <h2 className="mt-2 text-2xl font-bold">Approve, reject, or request changes</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                A moderation note is required for audit history and owner feedback.
              </p>
              <div className="mt-5">
                <AdminModerationPanel propertyId={property.id} />
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <p className="text-sm font-bold text-violet-700">Recent Leads</p>
              <div className="mt-4 space-y-3">
                {property.leads.map((lead) => (
                  <div className="rounded-2xl bg-muted p-4" key={lead.id}>
                    <p className="text-sm font-bold">{lead.name}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{formatAdminStatus(lead.stage)} · {lead.createdAt.toLocaleDateString("en-IN")}</p>
                  </div>
                ))}
                {!property.leads.length ? <p className="text-sm text-muted-foreground">No leads for this listing yet.</p> : null}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
