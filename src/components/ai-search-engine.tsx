"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Languages,
  MapPin,
  Mic,
  Search,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { explainSearch, getPropertyMatches, parsePropertySearch } from "@/lib/ai-search";
import { VoiceInputButton } from "@/components/voice/voice-input-button";

const examples = [
  "I need a villa under 80 lakh in Kochi",
  "എനിക്ക് കൊച്ചിയിൽ 50 ലക്ഷത്തിന് വീട് വേണം",
  "Mujhe Dubai mein investment apartment chahiye",
  "I want land near highway for future growth"
];

type SearchMatch = {
  area: string;
  bedrooms?: number | null;
  highlights: string[];
  id: string;
  location: string;
  priceLabel: string;
  score: number;
  title: string;
  type: string;
};

export function AISearchEngine() {
  const [query, setQuery] = useState(examples[0]);
  const [familySize, setFamilySize] = useState("Family of 4");
  const [goal, setGoal] = useState("Live with family");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiSource, setAiSource] = useState("");
  const [serverMatches, setServerMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"English" | "Malayalam" | "Hindi">("English");
  const [recommendationText, setRecommendationText] = useState("");
  const [areaText, setAreaText] = useState("");
  const [comparisonText, setComparisonText] = useState("");
  const [leadDraft, setLeadDraft] = useState("");

  const parsed = useMemo(() => parsePropertySearch(query), [query]);
  const localMatches = useMemo(() => getPropertyMatches(parsed), [parsed]);
  const matches = serverMatches.length ? serverMatches : localMatches;

  async function runSearch() {
    setLoading(true);
    const response = await fetch("/api/ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query
      })
    });
    setLoading(false);

    if (!response.ok) {
      setAiExplanation("HomeZone could not run AI search right now.");
      setAiSource("error");
      return;
    }

    const data = await response.json();
    setAiExplanation(data.explanation);
    setAiSource(data.source);
    setServerMatches(Array.isArray(data.matches) ? data.matches : []);
<<<<<<< HEAD
  }

  async function runAIAction(endpoint: string, body: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  async function loadRecommendations() {
    const data = await runAIAction("/api/ai/recommendations", {
      language: language === "Malayalam" ? "MALAYALAM" : "AUTO"
    });
    setRecommendationText(data?.explanation ?? "No recommendations available yet.");
  }

  async function loadAreaAdvice() {
    const data = await runAIAction("/api/ai/areas", {
      language: language === "Malayalam" ? "MALAYALAM" : "AUTO",
      query
    });
    setAreaText(data?.explanation ?? "No area data available yet.");
  }

  async function compareVisibleProperties() {
    const propertyIds = matches.slice(0, 4).map((item) => item.id);
    const data = await runAIAction("/api/ai/compare", {
      language: language === "Malayalam" ? "MALAYALAM" : "AUTO",
      propertyIds
    });
    setComparisonText(data?.summary ?? "Comparison is available after database matches are loaded.");
  }

  async function draftInquiry() {
    const data = await runAIAction("/api/ai/lead-assistant", {
      context: query,
      language: language === "Malayalam" ? "MALAYALAM" : "AUTO",
      mode: "INQUIRY",
      propertyId: matches[0]?.id
    });
    setLeadDraft(data?.draft ?? "Draft unavailable right now.");
=======
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
  }

  return (
    <div className="space-y-8">
      <Card className="p-4 shadow-soft sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex min-h-16 flex-1 items-center gap-3 rounded-[1.35rem] bg-muted px-5">
            <Search className="h-5 w-5 shrink-0 text-violet-700" />
            <input
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground sm:text-lg"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Say or type what you need..."
              value={query}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_auto]">
            <select
              className="min-h-16 rounded-full border border-border bg-white px-4 text-sm font-bold outline-none"
              onChange={(event) =>
                setLanguage(event.target.value as "English" | "Malayalam" | "Hindi")
              }
              value={language}
            >
              <option>English</option>
              <option>Malayalam</option>
              <option>Hindi</option>
            </select>
            <VoiceInputButton
              language={language}
              onTranscript={(text) => {
                setQuery(text);
                setAiExplanation("");
              }}
            />
          </div>
          <Button className="min-h-16" onClick={runSearch} size="lg">
            <Mic className="h-5 w-5" />
            {loading ? "Thinking..." : "AI Search"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              className="rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
              key={example}
              onClick={() => setQuery(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-violet-700">AI parsed search</p>
              <h2 className="text-2xl font-bold">No filters needed</h2>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            {aiExplanation || explainSearch(parsed)}
          </p>
          {aiSource ? (
            <p className="mt-3 rounded-full bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700">
              Source: {aiSource}
            </p>
          ) : null}

          <div className="mt-6 grid gap-3">
            {[
              ["Intent", parsed.intent],
              ["Language", parsed.language],
              ["Location", parsed.location ?? "Open"],
              ["Type", parsed.propertyType ?? "Any"],
              ["Budget", parsed.budgetLakhs ? `Rs ${parsed.budgetLakhs}L` : "Flexible"],
              ["Bedrooms", parsed.bedrooms ? `${parsed.bedrooms}BHK` : "Any"]
            ].map(([label, value]) => (
              <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3" key={label}>
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <span className="text-sm font-bold capitalize">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          {matches.map((listing) => (
            <Card className="p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft" key={listing.id}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                    <MapPin className="h-4 w-4" />
                    {listing.location}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">{listing.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {listing.type} - {listing.area} - {listing.bedrooms ? `${listing.bedrooms}BHK` : "Plot"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-3xl font-bold">{listing.priceLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-600">
                    Score {listing.score}/100
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {listing.highlights.map((highlight) => (
                  <span className="rounded-full bg-muted px-3 py-2 text-xs font-semibold" key={highlight}>
                    {highlight}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button>
                  Ask AI about this
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline">Save Match</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-gradient-to-br from-violet-700 to-fuchsia-500 p-8 text-white sm:p-10">
            <p className="text-sm font-semibold text-white/75">AI Matchmaker</p>
            <h2 className="mt-2 text-4xl font-bold">HomeZone asks like a real advisor.</h2>
            <p className="mt-5 leading-7 text-white/78">
              The next layer learns family size, lifestyle, budget comfort, work location, and investment goals before recommending a property.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Family size</span>
                <select
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                  onChange={(event) => setFamilySize(event.target.value)}
                  value={familySize}
                >
                  <option>Single buyer</option>
                  <option>Couple</option>
                  <option>Family of 4</option>
                  <option>Joint family</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">Goal</span>
                <select
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                  onChange={(event) => setGoal(event.target.value)}
                  value={goal}
                >
                  <option>Live with family</option>
                  <option>Rental income</option>
                  <option>Future resale</option>
                  <option>Retirement plan</option>
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-muted p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <Sparkles className="h-4 w-4" />
                Matchmaker recommendation
              </p>
              <p className="mt-3 text-lg font-bold">
                For {familySize.toLowerCase()} and {goal.toLowerCase()}, HomeZone will prioritize commute, safety, resale demand, and budget comfort before showing listings.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [Languages, "Malayalam, English, Hindi"],
                [SlidersHorizontal, "AI replaces filters"],
                [CheckCircle2, "3-5 best matches"]
              ].map(([Icon, label]) => {
                const FeatureIcon = Icon as typeof Languages;
                return (
                  <div className="rounded-2xl border border-border p-4 text-sm font-bold" key={label as string}>
                    <FeatureIcon className="mb-3 h-5 w-5 text-violet-700" />
                    {label as string}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-violet-700">
          AI Property Companion
        </p>
        <h2 className="mt-2 text-3xl font-bold">Search, recommend, compare, and draft</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={loadRecommendations} variant="outline">
            Recommendations
          </Button>
          <Button onClick={loadAreaAdvice} variant="outline">
            Area advice
          </Button>
          <Button onClick={compareVisibleProperties} variant="outline">
            Compare matches
          </Button>
          <Button onClick={draftInquiry} variant="outline">
            Draft inquiry
          </Button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {[
            ["Recommendations", recommendationText],
            ["Area advice", areaText],
            ["Comparison", comparisonText],
            ["Lead draft", leadDraft]
          ].map(([title, text]) => (
            text ? (
              <div className="rounded-2xl bg-muted p-4 text-sm leading-6" key={title}>
                <p className="font-bold">{title}</p>
                <p className="mt-2 text-muted-foreground">{text}</p>
              </div>
            ) : null
          ))}
        </div>
      </Card>
    </div>
  );
}
