"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileImage,
  MapPin,
  MessageCircle,
  Play,
  Upload,
  Wand2,
  Youtube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  creativeOutputs,
  studioPackages,
  studioServices
} from "@/lib/studio-data";

const propertyTypes = ["Villa", "Apartment", "Land", "Commercial", "Builder Project"];
const campaignGoals = ["Sell faster", "Generate leads", "Launch project", "Find tenants"];

export function StudioDashboard() {
  const [selectedService, setSelectedService] = useState("Photography");
  const [propertyType, setPropertyType] = useState("Villa");
  const [goal, setGoal] = useState("Sell faster");
  const [location, setLocation] = useState("Kochi");

  const aiPreview = useMemo(() => {
    return `${propertyType} in ${location}: premium visuals, short reels, and WhatsApp-ready copy focused on "${goal.toLowerCase()}".`;
  }, [goal, location, propertyType]);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {studioServices.map((service) => {
          const ServiceIcon = service.icon;
          const active = selectedService === service.title;
          return (
            <button
              className={`rounded-[1.5rem] border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-soft ${
                active ? "border-violet-300 ring-4 ring-violet-100" : "border-border"
              }`}
              key={service.title}
              onClick={() => setSelectedService(service.title)}
            >
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <ServiceIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-6 text-2xl font-bold">{service.title}</h2>
              <p className="mt-2 text-sm font-semibold text-violet-700">
                {service.price}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {service.text}
              </p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Studio Order
              </p>
              <h2 className="text-3xl font-bold">Book a property service</h2>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Selected service</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setSelectedService(event.target.value)}
                value={selectedService}
              >
                {studioServices.map((service) => (
                  <option key={service.title}>{service.title}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Property type</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setPropertyType(event.target.value)}
                value={propertyType}
              >
                {propertyTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Location</span>
              <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-white px-4">
                <MapPin className="h-4 w-4 text-violet-700" />
                <input
                  className="w-full bg-transparent font-semibold outline-none"
                  onChange={(event) => setLocation(event.target.value)}
                  value={location}
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Campaign goal</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => setGoal(event.target.value)}
                value={goal}
              >
                {campaignGoals.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-dashed border-violet-200 bg-violet-50/70 p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                  <Upload className="h-4 w-4" />
                  Upload property photos
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Phase 3 UI is ready for Supabase Storage integration.
                </p>
              </div>
              <Button variant="outline">
                <FileImage className="h-4 w-4" />
                Add Photos
              </Button>
            </div>
          </div>

          <Button className="mt-6 w-full" size="lg">
            Request Studio Booking
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-violet-700 to-fuchsia-500 p-7 text-white sm:p-8">
            <p className="text-sm font-semibold text-white/70">
              AI Creative Generator
            </p>
            <h2 className="mt-2 text-4xl font-bold">
              Generate marketing assets instantly.
            </h2>
            <p className="mt-4 leading-7 text-white/76">{aiPreview}</p>
          </div>

          <div className="grid gap-4 p-6 sm:p-8">
            {creativeOutputs.map((output) => {
              const OutputIcon = output.icon;
              return (
                <div
                  className="rounded-[1.5rem] border border-border bg-white p-5"
                  key={output.title}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <OutputIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-bold">{output.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {output.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button size="lg" variant="secondary">
              <Wand2 className="h-4 w-4" />
              Generate Preview
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Youtube className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-violet-700">
            HomeZone Media
          </p>
          <h2 className="mt-2 text-4xl font-bold">
            Request a property spotlight.
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Owners, brokers, and builders can request YouTube features, builder
            spotlights, and campaign support from the HomeZone media team.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["YouTube Feature", "Builder Spotlight", "Lead Campaign"].map(
              (item) => (
                <span
                  className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold"
                  key={item}
                >
                  {item}
                </span>
              )
            )}
          </div>
          <Button className="mt-6" size="lg">
            <Play className="h-4 w-4" />
            Request Promotion
          </Button>
        </Card>

        <div className="grid gap-4">
          {studioPackages.map((pack) => (
            <Card className="p-6 shadow-sm" key={pack.name}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">{pack.name}</h3>
                  <p className="mt-1 text-lg font-bold text-violet-700">
                    {pack.price}
                  </p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="mt-5 space-y-3">
                {pack.items.map((item) => (
                  <p
                    className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
                    key={item}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {item}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="grid gap-5 md:grid-cols-4">
          {[
            ["1", "Create request"],
            ["2", "Verify WhatsApp"],
            ["3", "Studio team confirms"],
            ["4", "Assets delivered"]
          ].map(([step, label]) => (
            <div className="rounded-[1.5rem] bg-muted p-5" key={step}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white">
                {step}
              </span>
              <p className="mt-4 font-bold">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            WhatsApp verification is required before confirming paid studio work.
          </p>
          <Button variant="outline">Verify Account</Button>
        </div>
      </Card>
    </div>
  );
}
