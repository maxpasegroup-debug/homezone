import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, LineChart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardReportsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/dashboard/reports");
  }

  const profile = await getOrCreateProfile(user);
  const reports = await db.aiReport.findMany({
    where: {
      userId: profile.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/dashboard">
          Dashboard
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              AI Reports
            </p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Saved property intelligence
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/analyzer">
                <FileSearch className="h-4 w-4" />
                Analyzer
              </Link>
            </Button>
            <Button asChild>
              <Link href="/invest">
                <LineChart className="h-4 w-4" />
                Investment
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-5">
          {reports.map((report) => {
            const output = report.output as {
              summary?: string;
              propertyScore?: number;
              investmentScore?: number;
              riskLevel?: string;
            };

            return (
              <Card className="p-6 shadow-sm" key={report.id}>
                <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {report.reportType.replace("_", " ")} / {report.createdAt.toLocaleDateString()}
                </p>
                <h2 className="mt-5 flex items-center gap-2 text-2xl font-bold">
                  <Sparkles className="h-5 w-5 text-violet-700" />
                  {report.reportType === "investment_engine"
                    ? `Investment Score ${output.investmentScore ?? "--"}`
                    : `Property Score ${output.propertyScore ?? "--"}`}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {output.summary ?? "Report summary unavailable."}
                </p>
              </Card>
            );
          })}
          {!reports.length ? (
            <Card className="p-8 text-center shadow-sm">
              <h2 className="text-2xl font-bold">No AI reports yet</h2>
              <p className="mt-3 text-muted-foreground">
                Generate reports from the Analyzer or Investment Engine.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
