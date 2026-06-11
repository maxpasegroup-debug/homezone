"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Map,
  MapPin,
  Sparkles,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  lifeAreas,
  lifeQuestions,
  lifeSignals,
  recommendationPaths
} from "@/lib/life-map-data";

export function LifeMap() {
  const [answers, setAnswers] = useState<Record<string, string>>({
    family: "Family with kids",
    work: "Office commute",
    priority: "Schools nearby",
    timeline: "3-6 months"
  });

  const topAreas = useMemo(() => {
    const priority = answers.priority;
    return [...lifeAreas].sort((a, b) => {
      const aBoost =
        priority === "Rental income" && a.bestFor.toLowerCase().includes("rental")
          ? 8
          : priority === "Peaceful living" && a.bestFor.toLowerCase().includes("peaceful")
            ? 8
            : priority === "Future resale" && a.bestFor.toLowerCase().includes("growth")
              ? 8
              : priority === "Schools nearby" && a.bestFor.toLowerCase().includes("school")
                ? 8
                : 0;
      const bBoost =
        priority === "Rental income" && b.bestFor.toLowerCase().includes("rental")
          ? 8
          : priority === "Peaceful living" && b.bestFor.toLowerCase().includes("peaceful")
            ? 8
            : priority === "Future resale" && b.bestFor.toLowerCase().includes("growth")
              ? 8
              : priority === "Schools nearby" && b.bestFor.toLowerCase().includes("school")
                ? 8
                : 0;
      return b.score + bBoost - (a.score + aBoost);
    });
  }, [answers.priority]);

  function updateAnswer(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Heart className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Life Map Questions
              </p>
              <h2 className="text-3xl font-bold">Tell HomeZone your life</h2>
            </div>
          </div>

          <div className="mt-7 space-y-5">
            {lifeQuestions.map((question) => {
              const QuestionIcon = question.icon;
              return (
                <label className="block space-y-2" key={question.key}>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <QuestionIcon className="h-4 w-4 text-violet-700" />
                    {question.label}
                  </span>
                  <select
                    className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                    onChange={(event) =>
                      updateAnswer(question.key, event.target.value)
                    }
                    value={answers[question.key]}
                  >
                    {question.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-violet-50 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <Sparkles className="h-4 w-4" />
              AI life summary
            </p>
            <p className="mt-3 text-lg font-bold leading-8">
              HomeZone will prioritize {answers.priority.toLowerCase()} for a{" "}
              {answers.family.toLowerCase()} with {answers.work.toLowerCase()}{" "}
              and a {answers.timeline.toLowerCase()} timeline.
            </p>
          </div>

          <Button className="mt-6 w-full" size="lg">
            Generate Life Map
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-8 text-white">
            <p className="text-sm font-semibold text-white/62">
              HomeZone Life Score
            </p>
            <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-8xl font-bold tracking-tight">
                  {topAreas[0].score}
                </p>
                <p className="text-lg font-semibold text-white/72">
                  best life match
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-5">
                <p className="flex items-center gap-2 text-sm text-white/65">
                  <MapPin className="h-4 w-4" />
                  {topAreas[0].city}
                </p>
                <h3 className="mt-2 text-2xl font-bold">{topAreas[0].area}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/72">
                  Best for {topAreas[0].bestFor.toLowerCase()}.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:p-8">
            {topAreas.slice(0, 3).map((area) => {
              const AreaIcon = area.icon;
              return (
                <div className="rounded-[1.5rem] border border-border p-5" key={area.area}>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                        <AreaIcon className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="text-xl font-bold">{area.area}</h3>
                        <p className="mt-1 text-sm font-semibold text-muted-foreground">
                          {area.city} · {area.bestFor}
                        </p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold">{area.score}</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {area.propertyTypes.map((type) => (
                      <span className="rounded-full bg-muted px-3 py-2 text-xs font-bold" key={type}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lifeSignals.map((signal) => {
          const SignalIcon = signal.icon;
          return (
            <Card className="p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft" key={signal.title}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <SignalIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-6 text-2xl font-bold">{signal.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {signal.text}
              </p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Map className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">
            Life-Oriented Recommendations
          </p>
          <h2 className="mt-2 text-4xl font-bold">
            Property suggestions based on real life.
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Instead of only matching budget and location, Life Map recommends
            areas and property types based on family stage, kids, work,
            retirement, and investment goals.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {recommendationPaths.map((path) => {
              const PathIcon = path.icon;
              return (
                <div className="rounded-[1.5rem] bg-muted p-5" key={path.title}>
                  <PathIcon className="h-5 w-5 text-violet-700" />
                  <h3 className="mt-4 font-bold">{path.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {path.match}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Why HomeZone recommends this
          </p>
          <h2 className="mt-2 text-3xl font-bold">Decision clarity</h2>
          <div className="mt-6 space-y-4">
            {topAreas[0].reasons.map((reason) => (
              <div className="rounded-[1.5rem] bg-muted p-5" key={reason}>
                <p className="flex items-center gap-3 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  {reason}
                </p>
              </div>
            ))}
          </div>
          <Button className="mt-6 w-full" variant="outline">
            Compare With Other Areas
          </Button>
        </Card>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Target className="h-4 w-4" />
              First-in-India concept layer
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Do not just find property. Find the right life zone.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Life Map turns HomeZone from a listing platform into a property
              companion that understands the person, not only the search query.
            </p>
          </div>
          <Button>
            Save My Life Map
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
