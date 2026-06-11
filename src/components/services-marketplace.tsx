"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  aiServiceSuggestions,
  featuredProviders,
  serviceCategories,
  serviceMoments,
  trustSignals
} from "@/lib/services-data";

const userNeeds = [
  "I just bought a flat",
  "I need legal verification",
  "I am moving next week",
  "I want to renovate my house"
];

const budgets = ["Under ₹10K", "₹10K - ₹50K", "₹50K - ₹2L", "₹2L+"];

export function ServicesMarketplace() {
  const [selectedCategory, setSelectedCategory] = useState("Interior Design");
  const [need, setNeed] = useState(userNeeds[0]);
  const [city, setCity] = useState("Kochi");
  const [budget, setBudget] = useState("₹50K - ₹2L");

  const matchingProviders = useMemo(() => {
    const exact = featuredProviders.filter(
      (provider) => provider.category === selectedCategory
    );
    return exact.length ? exact : featuredProviders;
  }, [selectedCategory]);

  return (
    <div className="space-y-8">
      <Card className="p-4 shadow-soft sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.75fr_0.55fr]">
          <div className="flex min-h-16 items-center gap-3 rounded-[1.35rem] bg-muted px-5">
            <Search className="h-5 w-5 shrink-0 text-violet-700" />
            <select
              className="w-full bg-transparent text-base font-bold outline-none"
              onChange={(event) => setNeed(event.target.value)}
              value={need}
            >
              {userNeeds.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="flex min-h-16 items-center gap-3 rounded-[1.35rem] bg-muted px-5">
            <MapPin className="h-5 w-5 shrink-0 text-violet-700" />
            <input
              className="w-full bg-transparent text-base font-bold outline-none"
              onChange={(event) => setCity(event.target.value)}
              value={city}
            />
          </div>
          <Button className="min-h-16" size="lg">
            <Wand2 className="h-5 w-5" />
            Match Services
          </Button>
        </div>
      </Card>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {serviceCategories.map((category) => {
          const CategoryIcon = category.icon;
          const active = selectedCategory === category.title;
          return (
            <button
              className={`rounded-[1.5rem] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-soft ${
                active ? "border-violet-300 ring-4 ring-violet-100" : "border-border"
              }`}
              key={category.title}
              onClick={() => setSelectedCategory(category.title)}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <CategoryIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-xl font-bold">{category.title}</h2>
              <p className="mt-1 text-xs font-bold text-violet-700">
                {category.demand}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {category.text}
              </p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Featured Providers
              </p>
              <h2 className="mt-1 text-4xl font-bold">
                Verified help for {selectedCategory.toLowerCase()}.
              </h2>
            </div>
            <Button variant="outline">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-7 grid gap-4">
            {matchingProviders.map((provider) => (
              <div
                className="rounded-[1.5rem] border border-border bg-white p-5"
                key={provider.name}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold">{provider.name}</h3>
                      {provider.verified ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      {provider.category} · {provider.city}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-bold text-amber-600">
                      <Star className="h-4 w-4 fill-amber-400" />
                      {provider.rating} · {provider.jobs} completed jobs
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-2xl font-bold">{provider.price}</p>
                    <p className="mt-1 text-sm font-semibold text-violet-700">
                      {provider.response}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    WhatsApp quote after account verification
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Save
                    </Button>
                    <Button size="sm">
                      Request Quote
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-7 text-white">
            <p className="text-sm font-semibold text-white/62">
              AI Service Companion
            </p>
            <h2 className="mt-2 text-4xl font-bold">
              Know what service you need next.
            </h2>
            <p className="mt-4 leading-7 text-white/72">
              HomeZone can recommend services based on buyer stage, property
              type, documents, city, and move-in timeline.
            </p>
          </div>
          <div className="grid gap-4 p-6">
            {aiServiceSuggestions.map((suggestion) => {
              const SuggestionIcon = suggestion.icon;
              return (
                <div className="rounded-[1.5rem] bg-muted p-5" key={suggestion.title}>
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700">
                      <SuggestionIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-bold">{suggestion.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {suggestion.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <CalendarDays className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">
            Service Request
          </p>
          <h2 className="mt-2 text-4xl font-bold">
            Tell HomeZone what you need.
          </h2>

          <div className="mt-7 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Selected category</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setSelectedCategory(event.target.value)}
                value={selectedCategory}
              >
                {serviceCategories.map((category) => (
                  <option key={category.title}>{category.title}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Budget comfort</span>
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
              AI request summary
            </p>
            <p className="mt-3 text-lg font-bold leading-8">
              User needs {selectedCategory.toLowerCase()} support in {city} with
              a {budget} budget. HomeZone should match verified providers and
              request WhatsApp confirmation.
            </p>
          </div>

          <Button className="mt-6 w-full" size="lg">
            Request Service
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {serviceMoments.map((moment) => {
            const MomentIcon = moment.icon;
            return (
              <Card className="p-6 shadow-sm" key={moment.title}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <MomentIcon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-2xl font-bold">{moment.title}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {moment.services.map((service) => (
                    <span
                      className="rounded-full bg-muted px-3 py-2 text-xs font-bold"
                      key={service}
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="grid gap-5 md:grid-cols-4">
          {trustSignals.map((signal) => {
            const SignalIcon = signal.icon;
            return (
              <div className="rounded-[1.5rem] bg-muted p-5" key={signal.title}>
                <SignalIcon className="h-6 w-6 text-violet-700" />
                <p className="mt-4 font-bold">{signal.title}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Users browse services freely. Quotes, booking, and provider contact
            require WhatsApp-verified account creation.
          </p>
          <Button variant="outline">Verify Account</Button>
        </div>
      </Card>
    </div>
  );
}
