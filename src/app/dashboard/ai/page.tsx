import Link from "next/link";
import { redirect } from "next/navigation";
import { AIBuyerDashboard } from "@/components/ai/ai-buyer-dashboard";
import { Button } from "@/components/ui/button";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMarketplaceProperties } from "@/lib/properties/queries";

export const dynamic = "force-dynamic";

function summaryFromOutput(output: unknown) {
  if (!output || typeof output !== "object" || Array.isArray(output)) return "AI report saved.";
  const record = output as Record<string, unknown>;
  return typeof record.summary === "string"
    ? record.summary
    : typeof record.explanation === "string"
      ? record.explanation
      : typeof record.draft === "string"
        ? record.draft
        : "AI report saved.";
}

export default async function DashboardAIPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/ai");
  }

  const profile = await getOrCreateProfile(user);
  const [reports, saved, viewed, recommendations] = await Promise.all([
    db.aiReport.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 20,
      where: {
        userId: profile.id
      }
    }),
    db.savedProperty.findMany({
      include: {
        property: true
      },
      take: 12,
      where: {
        userId: profile.id
      }
    }),
    db.propertyView.findMany({
      include: {
        property: true
      },
      orderBy: {
        viewedAt: "desc"
      },
      take: 12,
      where: {
        userId: profile.id
      }
    }),
    getMarketplaceProperties({
      city: profile.city ?? undefined
    })
  ]);
  const favoriteLocalities = [
    ...new Set([
      profile.city,
      ...saved.map((item) => item.property.locality ?? item.property.city),
      ...viewed.map((item) => item.property.locality ?? item.property.city)
    ].filter(Boolean) as string[])
  ].slice(0, 8);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm font-bold text-violet-700" href="/dashboard">
              Dashboard
            </Link>
            <p className="mt-8 text-sm font-semibold text-violet-700">AI Buyer Dashboard</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Your property intelligence workspace</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Saved AI reports</Link>
          </Button>
        </div>

        <div className="mt-10">
          <AIBuyerDashboard
            favoriteLocalities={favoriteLocalities}
            recentReports={reports.map((report) => ({
              createdAt: report.createdAt.toISOString(),
              id: report.id,
              reportType: report.reportType,
              summary: summaryFromOutput(report.output)
            }))}
            recommendedProperties={recommendations.slice(0, 8).map((property) => ({
              id: property.id,
              location: property.location,
              priceLabel: property.priceLabel,
              score: property.score,
              title: property.title,
              type: property.type
            }))}
          />
        </div>
      </section>
    </main>
  );
}
