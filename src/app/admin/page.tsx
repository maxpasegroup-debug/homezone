import Link from "next/link";
import { AdminControlCenter } from "@/components/admin/admin-control-center";
import { requireAdminProfile } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminProfile();

  const [
    pendingProperties,
    pendingReels,
    reports,
    propertiesCount,
    reelsCount,
    reportsCount,
    providersCount,
    buildersCount,
    brokersCount
  ] = await Promise.all([
    db.property.findMany({
      where: {
        status: "PENDING_REVIEW"
      },
      select: {
        id: true,
        title: true,
        city: true,
        locality: true,
        status: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.propertyReel.findMany({
      where: {
        status: "PENDING_REVIEW"
      },
      select: {
        id: true,
        title: true,
        status: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.auditLog.findMany({
      where: {
        action: "user_report"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.property.count({
      where: {
        status: "PENDING_REVIEW"
      }
    }),
    db.propertyReel.count({
      where: {
        status: "PENDING_REVIEW"
      }
    }),
    db.auditLog.count({
      where: {
        action: "user_report"
      }
    }),
    db.serviceProvider.count({
      where: {
        verified: false
      }
    }),
    db.builderProject.count({
      where: {
        campaignStatus: "draft"
      }
    }),
    db.profile.count({
      where: {
        role: "BROKER",
        whatsappVerified: false
      }
    })
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          <AdminControlCenter
            counts={{
              builders: buildersCount,
              brokers: brokersCount,
              properties: propertiesCount,
              providers: providersCount,
              reels: reelsCount,
              reports: reportsCount
            }}
            pendingProperties={pendingProperties}
            pendingReels={pendingReels}
            reports={reports}
          />
        </div>
      </section>
    </main>
  );
}
