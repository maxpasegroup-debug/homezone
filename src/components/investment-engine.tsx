"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  CheckCircle2,
  LineChart,
  MapPin,
  Radar,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  infrastructureSignals,
  intelligenceFeatures,
  investmentAreas,
  investorProfiles,
  marketSignals,
  priceTrend
} from "@/lib/investment-data";

const budgets = ["₹40L - ₹70L", "₹70L - ₹1Cr", "₹1Cr - ₹2Cr", "₹2Cr+"];

export function InvestmentEngine() {
  const [selectedArea, setSelectedArea] = useState(investmentAreas[0].name);
  const [profile, setProfile] = useState("Rental income");
  const [budget, setBudget] = useState("₹70L - ₹1Cr");

  const area = useMemo(
    () => investmentAreas.find((item) => item.name === selectedArea) ?? investmentAreas[0],
    [selectedArea]
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <TrendingUp className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Investment Intelligence
              </p>
              <h2 className="text-3xl font-bold">Find smarter property bets</h2>
            </div>
          </div>

          <div className="mt-7 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Area</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setSelectedArea(event.target.value)}
                value={selectedArea}
              >
                {investmentAreas.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Investor profile</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setProfile(event.target.value)}
                value={profile}
              >
                {investorProfiles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Budget</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setBudget(event.target.value)}
                value={budget}
              >
                {budgets.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-violet-50 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <Sparkles className="h-4 w-4" />
              AI investor summary
            </p>
            <p className="mt-3 text-lg font-bold leading-8">
              {area.name} is a {area.demand.toLowerCase()} demand market for{" "}
              {profile.toLowerCase()} with {area.growth} recent growth and{" "}
              {area.rentalYield} rental yield signal.
            </p>
          </div>

          <Button className="mt-6 w-full" size="lg">
            Generate Investment Report
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-8 text-white">
            <p className="text-sm font-semibold text-white/62">
              HomeZone Investment Score
            </p>
            <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-8xl font-bold tracking-tight">
                  {area.score}
                </p>
                <p className="text-lg font-semibold text-white/72">out of 100</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-5">
                <p className="flex items-center gap-2 text-sm text-white/65">
                  <MapPin className="h-4 w-4" />
                  {area.city}
                </p>
                <h3 className="mt-2 text-2xl font-bold">{area.name}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/72">
                  Best for {area.bestFor.toLowerCase()}.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            {[
              ["Current Price", area.price, BadgeIndianRupee],
              ["Growth", area.growth, TrendingUp],
              ["Rental Yield", area.rentalYield, BarChart3],
              ["Demand", area.demand, Radar]
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof BadgeIndianRupee;
              return (
                <div className="rounded-[1.5rem] border border-border p-5" key={label as string}>
                  <MetricIcon className="h-5 w-5 text-violet-700" />
                  <p className="mt-4 text-sm font-semibold text-muted-foreground">
                    {label as string}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{value as string}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {marketSignals.map((signal) => {
          const SignalIcon = signal.icon;
          return (
            <Card className="p-6 shadow-sm" key={signal.title}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <SignalIcon className="h-6 w-6" />
              </span>
              <p className="mt-6 text-sm font-semibold text-muted-foreground">
                {signal.title}
              </p>
              <h3 className="mt-1 text-3xl font-bold">{signal.value}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {signal.text}
              </p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Price Trends
              </p>
              <h2 className="mt-1 text-4xl font-bold">Growth direction</h2>
            </div>
            <LineChart className="h-8 w-8 text-violet-700" />
          </div>

          <div className="mt-8 flex h-72 items-end gap-4 rounded-[2rem] bg-muted p-5">
            {priceTrend.map((point) => (
              <div className="flex h-full flex-1 flex-col justify-end gap-3" key={point.year}>
                <div
                  className="rounded-t-2xl bg-gradient-to-t from-violet-700 to-cyan-400"
                  style={{ height: `${point.value - 65}%` }}
                />
                <p className="text-center text-xs font-bold text-muted-foreground">
                  {point.year}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-violet-700">
            Infrastructure Impact
          </p>
          <h2 className="mt-2 text-4xl font-bold">What can lift value?</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {infrastructureSignals.map((signal) => {
              const ImpactIcon = signal.icon;
              return (
                <div className="rounded-[1.5rem] bg-muted p-5" key={signal.title}>
                  <ImpactIcon className="h-5 w-5 text-violet-700" />
                  <p className="mt-4 font-bold">{signal.title}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-600">
                    Est. impact {signal.impact}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {intelligenceFeatures.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <Card className="p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft" key={feature.title}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <FeatureIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {feature.text}
              </p>
            </Card>
          );
        })}
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              Investment disclaimer
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              AI intelligence supports decisions, not guarantees.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Rental yield, price trend, growth, and infrastructure impact are
              estimates. Users should verify documents, market prices, rental
              demand, and legal status before investing.
            </p>
          </div>
          <Button variant="outline">
            <CheckCircle2 className="h-4 w-4" />
            Save Report
          </Button>
        </div>
      </Card>
    </div>
  );
}
