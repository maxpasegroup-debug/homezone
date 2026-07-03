"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, Clock, FileSearch, Heart, Home, LineChart, MapPin, MessagesSquare, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PropertyCardData = {
  id: string;
  location: string;
  priceLabel: string;
  score: number;
  title: string;
  type: string;
};

type AIReportData = {
  createdAt: string;
  id: string;
  reportType: string;
  summary: string;
};

export function AIBuyerDashboard({
  favoriteLocalities,
  recentReports,
  recommendedProperties
}: {
  favoriteLocalities: string[];
  recentReports: AIReportData[];
  recommendedProperties: PropertyCardData[];
}) {
  const [query, setQuery] = useState("I need a 3BHK villa under Rs 1 crore for a family of four near good schools.");
  const [loading, setLoading] = useState(false);
  const [advisor, setAdvisor] = useState("");
  const [matches, setMatches] = useState<PropertyCardData[]>(recommendedProperties);

  async function askAdvisor() {
    setLoading(true);
    const response = await fetch("/api/ai/property-intelligence", {
      body: JSON.stringify({
        action: "advisor",
        query
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setAdvisor(data?.result?.summary ?? "HomeZone AI could not answer right now.");
    setMatches(Array.isArray(data?.result?.matches) ? data.result.matches : recommendedProperties);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-700 p-8 text-white sm:p-10">
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <Brain className="h-4 w-4" />
              AI Property Advisor
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              Tell HomeZone your life situation, not just filters.
            </h2>
            <p className="mt-5 leading-7 text-white/75">
              Family size, work location, schools, maintenance comfort, rental income, and appreciation goals are interpreted together.
            </p>
          </div>
          <div className="p-5 sm:p-8">
            <div className="flex min-h-16 items-center gap-3 rounded-[1.35rem] bg-muted px-5">
              <Search className="h-5 w-5 shrink-0 text-violet-700" />
              <textarea
                className="min-h-24 w-full resize-none bg-transparent py-4 text-base font-semibold outline-none"
                onChange={(event) => setQuery(event.target.value)}
                value={query}
              />
            </div>
            <Button className="mt-4 min-h-12 w-full" onClick={askAdvisor}>
              <Sparkles className="h-4 w-4" />
              {loading ? "Thinking..." : "Ask AI Advisor"}
            </Button>
          </div>
        </div>
      </Card>

      {advisor ? (
        <Card className="p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-violet-700">Advisor response</p>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {advisor}
          </p>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Home, recommendedProperties.length, "Recommended properties"],
          [FileSearch, recentReports.length, "Saved AI reports"],
          [MessagesSquare, "Live", "Conversation history"],
          [Heart, favoriteLocalities.length, "Favorite localities"]
        ].map(([Icon, value, label]) => {
          const MetricIcon = Icon as typeof Home;
          return (
            <Card className="p-5 shadow-sm" key={label as string}>
              <MetricIcon className="h-5 w-5 text-violet-700" />
              <p className="mt-5 text-3xl font-bold">{value as string}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{label as string}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-violet-700">Recommended Properties</p>
          <h2 className="mt-2 text-3xl font-bold">AI-ready matches</h2>
          <div className="mt-6 grid gap-4">
            {matches.slice(0, 5).map((property) => (
              <Link className="rounded-2xl bg-muted p-4 transition hover:bg-violet-50" href={`/properties/${property.id}`} key={property.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">{property.title}</h3>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-violet-700">
                      <MapPin className="h-4 w-4" />
                      {property.location}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-bold">{property.priceLabel}</p>
                    <p className="text-sm font-semibold text-emerald-600">{property.score}/100</p>
                  </div>
                </div>
              </Link>
            ))}
            {!matches.length ? (
              <div className="rounded-2xl bg-muted p-6 text-center">
                <h3 className="text-xl font-bold">No AI matches yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Ask the advisor to generate buyer-focused matches.</p>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Clock className="h-4 w-4" />
              Conversation History
            </p>
            <div className="mt-4 space-y-3">
              {recentReports.filter((report) => report.reportType.includes("ADVISOR") || report.reportType.includes("SEARCH")).slice(0, 4).map((report) => (
                <div className="rounded-2xl bg-muted p-4" key={report.id}>
                  <p className="text-xs font-bold text-muted-foreground">{report.reportType}</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6">{report.summary}</p>
                </div>
              ))}
              {!recentReports.length ? (
                <p className="rounded-2xl bg-muted p-4 text-sm font-semibold text-muted-foreground">Your AI history will appear after you ask HomeZone.</p>
              ) : null}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <LineChart className="h-4 w-4" />
              Favorite Localities
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {favoriteLocalities.map((locality) => (
                <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold" key={locality}>
                  {locality}
                </span>
              ))}
              {!favoriteLocalities.length ? (
                <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold">Browse properties to build locality memory</span>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
