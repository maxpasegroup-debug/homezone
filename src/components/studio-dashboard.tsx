"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, FileImage, MapPin, PackageCheck, Sparkles } from "lucide-react";
import type { PaymentProduct } from "@prisma/client";
import { PaymentButton } from "@/components/payments/payment-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { studioServices } from "@/lib/studio-data";

const propertyTypes = ["Villa", "Apartment", "Land", "Commercial", "Builder Project"];
const campaignGoals = ["Sell faster", "Generate leads", "Launch project", "Find tenants"];

type StudioResponse = {
  studioRequest?: {
    id: string;
  };
};

export function StudioDashboard() {
  const [selectedService, setSelectedService] = useState(studioServices[0]);
  const [propertyType, setPropertyType] = useState("Villa");
  const [goal, setGoal] = useState("Sell faster");
  const [location, setLocation] = useState("Kochi");
  const [status, setStatus] = useState("");
  const [loadingAction, setLoadingAction] = useState<"DRAFT" | "SUBMITTED" | "">("");
  const [studioRequestId, setStudioRequestId] = useState("");

  const aiPreview = useMemo(() => {
    return `${selectedService.title} for a ${propertyType.toLowerCase()} in ${location}. Goal: ${goal.toLowerCase()}.`;
  }, [goal, location, propertyType, selectedService.title]);

  async function createStudioOrder(orderStatus: "DRAFT" | "SUBMITTED") {
    setLoadingAction(orderStatus);
    setStatus("");

    const response = await fetch("/api/studio-requests", {
      body: JSON.stringify({
        budget: selectedService.price,
        city: location,
        notes: aiPreview,
        orderValue: selectedService.priceAmount,
        serviceType: selectedService.title,
        status: orderStatus
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    setLoadingAction("");

    if (response.status === 401) {
      window.location.href = "/auth?next=/studio";
      return;
    }

    const data = (await response.json().catch(() => null)) as StudioResponse | { error?: string } | null;
    if (!response.ok || !data || !("studioRequest" in data) || !data.studioRequest) {
      setStatus((data && "error" in data ? data.error : null) ?? "Could not create Studio order.");
      return;
    }

    setStudioRequestId(data.studioRequest.id);
    setStatus(
      orderStatus === "DRAFT"
        ? "Draft saved. You can resume it from the Studio dashboard."
        : "Order submitted. Complete payment to start assignment and production."
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {studioServices.map((service) => {
          const ServiceIcon = service.icon;
          const active = selectedService.title === service.title;
          return (
            <button
              className={`rounded-[1.5rem] border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-soft ${
                active ? "border-violet-300 ring-4 ring-violet-100" : "border-border"
              }`}
              key={service.title}
              onClick={() => setSelectedService(service)}
            >
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <ServiceIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-6 text-2xl font-bold">{service.title}</h2>
              <p className="mt-2 text-sm font-semibold text-violet-700">{service.price}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{service.description}</p>
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Clock className="h-4 w-4" />
                {service.deliveryTime}
              </div>
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
              <p className="text-sm font-semibold text-violet-700">Studio Order</p>
              <h2 className="text-3xl font-bold">Create a property marketing order</h2>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Selected service</span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) => {
                  const next = studioServices.find((service) => service.title === event.target.value);
                  if (next) setSelectedService(next);
                }}
                value={selectedService.title}
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
            <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
              <FileImage className="h-4 w-4" />
              Media intake
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              After submission, the Studio team collects existing photos, documents, and shoot instructions from the order dashboard.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button disabled={loadingAction !== ""} onClick={() => createStudioOrder("DRAFT")} size="lg" variant="outline">
              Save Draft
            </Button>
            <Button disabled={loadingAction !== ""} onClick={() => createStudioOrder("SUBMITTED")} size="lg">
              Submit Order
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {studioRequestId ? (
            <div className="mt-5 rounded-[1.5rem] border bg-white p-5">
              <p className="text-sm font-bold">Order ready for payment</p>
              <p className="mt-1 text-sm text-muted-foreground">Payment moves the order into paid production workflow.</p>
              <div className="mt-4">
                <PaymentButton
                  city={location}
                  label="Pay for Studio Booking"
                  notes={aiPreview}
                  product={selectedService.product as PaymentProduct}
                  studioRequestId={studioRequestId}
                />
              </div>
            </div>
          ) : null}

          {status ? <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-700">{status}</p> : null}
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-violet-800 via-purple-700 to-fuchsia-500 p-7 text-white sm:p-8">
            <p className="text-sm font-semibold text-white/70">Selected Package</p>
            <h2 className="mt-2 text-4xl font-bold">{selectedService.title}</h2>
            <p className="mt-4 leading-7 text-white/80">{selectedService.description}</p>
          </div>
          <div className="grid gap-5 p-6 sm:p-8">
            <InfoBlock title="Delivery time" items={[selectedService.deliveryTime]} />
            <InfoBlock title="Sample outputs" items={selectedService.samples} />
            <InfoBlock title="Available add-ons" items={selectedService.addOns} />
            <div className="rounded-[1.5rem] bg-muted p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                <Sparkles className="h-4 w-4" />
                Order summary
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{aiPreview}</p>
            </div>
          </div>
        </Card>
      </section>

      <Card className="p-6 shadow-soft sm:p-8">
        <div className="grid gap-5 md:grid-cols-5">
          {["Draft", "Payment", "Assignment", "Production", "Delivery"].map((label, index) => (
            <div className="rounded-[1.5rem] bg-muted p-5" key={label}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-4 font-bold">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <PackageCheck className="h-4 w-4 text-emerald-600" />
            Track assignments, shoots, delivered files, revisions, and approvals from the Studio dashboard.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard/studio">
              Open Dashboard
              <CheckCircle2 className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function InfoBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-[1.5rem] border bg-white p-5">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground" key={item}>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
