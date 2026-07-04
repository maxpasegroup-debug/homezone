import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessAIDashboard } from "@/components/ai/business/business-ai-dashboard";
import { Button } from "@/components/ui/button";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { getBusinessAIDashboard } from "@/lib/ai/business/tools";

export const dynamic = "force-dynamic";

function summaryFromOutput(output: unknown) {
  if (!output || typeof output !== "object" || Array.isArray(output)) return "Business AI report saved.";
  const record = output as Record<string, unknown>;
  return typeof record.summary === "string" ? record.summary : "Business AI report saved.";
}

export default async function BusinessAIPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth?next=/dashboard/business-ai");

  const profile = await getOrCreateProfile(user);
  const data = await getBusinessAIDashboard(profile.id, profile.role);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm font-bold text-violet-700" href="/dashboard">
              Dashboard
            </Link>
            <p className="mt-8 text-sm font-semibold text-violet-700">Business AI</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">Professional copilots</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">AI Reports</Link>
          </Button>
        </div>
        <div className="mt-10">
          <BusinessAIDashboard
            productivity={data.productivity}
            recentReports={data.reports.map((report) => ({
              createdAt: report.createdAt.toISOString(),
              id: report.id,
              reportType: report.reportType,
              summary: summaryFromOutput(report.output)
            }))}
            recommendedActions={data.recommendedActions}
            role={profile.role}
          />
        </div>
      </section>
    </main>
  );
}
