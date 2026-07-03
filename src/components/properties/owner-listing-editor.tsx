"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { CheckCircle2, Loader2, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VoiceInputButton } from "@/components/voice/voice-input-button";

type ListingDraft = {
  id?: string;
  title: string;
  description: string;
  intent: string;
  category: string;
  propertyType: string;
  country: string;
  state: string;
  city: string;
  locality: string;
  address: string;
  latitude: string;
  longitude: string;
  timezone: string;
  price: string;
  currency: string;
  areaValue: string;
  areaUnit: string;
  bedrooms: string;
  bathrooms: string;
  amenities: string;
  coverImageUrl: string;
  videoUrl: string;
  virtualTourUrl: string;
};

type ListingValue = Omit<Partial<ListingDraft>, "amenities"> & {
  amenities?: string[];
  status?: string;
};

const categories = ["RESIDENTIAL", "COMMERCIAL", "LAND", "INDUSTRIAL", "AGRICULTURAL", "HOSPITALITY", "LUXURY"];
const currencies = ["INR", "AED", "USD", "GBP", "EUR"];
const intents = ["BUY", "RENT", "LEASE", "INVEST"];
const propertyTypes = ["Villa", "House", "Apartment", "Flat", "Land", "Office", "Shop", "Warehouse", "Farm Land", "Hotel", "Luxury"];

function toFormData(property?: ListingValue) {
  return {
    id: property?.id,
    title: property?.title ?? "",
    description: property?.description ?? "",
    intent: property?.intent ?? "BUY",
    category: property?.category ?? "RESIDENTIAL",
    propertyType: property?.propertyType ?? "Villa",
    country: property?.country ?? "India",
    state: property?.state ?? "Kerala",
    city: property?.city ?? "Kochi",
    locality: property?.locality ?? "",
    address: property?.address ?? "",
    latitude: property?.latitude ?? "",
    longitude: property?.longitude ?? "",
    timezone: property?.timezone ?? "Asia/Kolkata",
    price: property?.price ?? "",
    currency: property?.currency ?? "INR",
    areaValue: property?.areaValue ?? "",
    areaUnit: property?.areaUnit ?? "sqft",
    bedrooms: property?.bedrooms ?? "",
    bathrooms: property?.bathrooms ?? "",
    amenities: Array.isArray(property?.amenities) ? property.amenities.join(", ") : property?.amenities ?? "",
    coverImageUrl: property?.coverImageUrl ?? "",
    videoUrl: property?.videoUrl ?? "",
    virtualTourUrl: property?.virtualTourUrl ?? ""
  };
}

function payloadFor(form: ListingDraft, status: "DRAFT" | "PENDING_REVIEW") {
  const isDraft = status === "DRAFT";

  return {
    ...form,
    city: isDraft && !form.city ? "Location pending" : form.city,
    description:
      isDraft && !form.description
        ? "Owner draft saved for completion before verification."
        : form.description,
    title: isDraft && !form.title ? "Untitled property draft" : form.title,
    address: form.address || undefined,
    areaValue: form.areaValue || undefined,
    bathrooms: form.bathrooms || undefined,
    bedrooms: form.bedrooms || undefined,
    coverImageUrl: form.coverImageUrl || undefined,
    latitude: form.latitude || undefined,
    longitude: form.longitude || undefined,
    price: form.price || undefined,
    videoUrl: form.videoUrl || undefined,
    virtualTourUrl: form.virtualTourUrl || undefined,
    amenities: form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    status
  };
}

export function OwnerListingEditor({
  property
}: {
  property?: ListingValue;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ListingDraft>(() => toFormData(property));
  const [loadingAction, setLoadingAction] = useState<"draft" | "submit" | "autosave" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const hasExisting = Boolean(property?.id);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpoint = hasExisting ? `/api/properties/${property?.id}` : "/api/properties";

  const completion = useMemo(() => {
    const required = [
      form.title,
      form.description,
      form.propertyType,
      form.city,
      form.price,
      form.areaValue
    ];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [form]);

  function updateField(field: keyof ListingDraft, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function save(status: "DRAFT" | "PENDING_REVIEW", mode: "draft" | "submit" | "autosave" = "draft") {
    setLoadingAction(mode);
    setError("");
    setMessage("");

    const response = await fetch(endpoint, {
      body: JSON.stringify(payloadFor(form, status)),
      headers: {
        "Content-Type": "application/json"
      },
      method: hasExisting ? "PATCH" : "POST"
    });

    setLoadingAction(null);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not save listing.");
      return;
    }

    const data = await response.json();
    setMessage(status === "DRAFT" ? "Draft saved." : "Submitted for HomeZone verification.");

    if (!hasExisting && data?.property?.id) {
      router.push(`/dashboard/listings/${data.property.id}/edit` as Route);
      return;
    }

    router.refresh();
  }

  useEffect(() => {
    if (!hasExisting) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save("DRAFT", "autosave");
    }, 1800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <p className="text-sm font-bold text-violet-700">Owner Listing Workspace</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            {hasExisting ? "Edit your property" : "Create a property listing"}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Save drafts, preview the listing, upload media and documents, then submit for HomeZone verification.
          </p>
        </div>
        <div className="rounded-3xl bg-violet-50 p-5">
          <p className="text-sm font-bold text-violet-700">Listing readiness</p>
          <p className="mt-3 text-4xl font-bold">{completion}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete the key fields before submitting for verification.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-violet-50 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
          <Sparkles className="h-4 w-4" />
          Voice-first listing
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(["English", "Malayalam", "Hindi"] as const).map((language) => (
            <VoiceInputButton
              key={language}
              language={language}
              onTranscript={(text) => updateField("description", text)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Title" name="title" onChange={updateField} value={form.title} />
        <TextArea className="sm:col-span-2" label="Description" name="description" onChange={updateField} value={form.description} />
        <Select label="Intent" name="intent" onChange={updateField} options={intents} value={form.intent} />
        <Select label="Category" name="category" onChange={updateField} options={categories} value={form.category} />
        <Select label="Property Type" name="propertyType" onChange={updateField} options={propertyTypes} value={form.propertyType} />
        <Select label="Currency" name="currency" onChange={updateField} options={currencies} value={form.currency} />
        {(["country", "state", "city", "locality", "address", "timezone", "latitude", "longitude", "price", "areaValue", "areaUnit", "bedrooms", "bathrooms", "coverImageUrl", "videoUrl", "virtualTourUrl"] as const).map((field) => (
          <Field key={field} label={field.replace(/([A-Z])/g, " $1")} name={field} onChange={updateField} value={form[field]} />
        ))}
        <Field className="sm:col-span-2" label="Amenities" name="amenities" onChange={updateField} value={form.amenities} />
      </div>

      {error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
      {message ? (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button disabled={Boolean(loadingAction)} onClick={() => save("DRAFT")} size="lg" variant="outline">
          {loadingAction === "draft" || loadingAction === "autosave" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </Button>
        <Button disabled={Boolean(loadingAction)} onClick={() => save("PENDING_REVIEW", "submit")} size="lg">
          {loadingAction === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit for Verification
        </Button>
      </div>
    </Card>
  );
}

function Field({
  className = "",
  label,
  name,
  onChange,
  value
}: {
  className?: string;
  label: string;
  name: keyof ListingDraft;
  onChange: (name: keyof ListingDraft, value: string) => void;
  value: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-semibold capitalize">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none focus:border-violet-400"
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
      />
    </label>
  );
}

function TextArea({
  className = "",
  label,
  name,
  onChange,
  value
}: {
  className?: string;
  label: string;
  name: keyof ListingDraft;
  onChange: (name: keyof ListingDraft, value: string) => void;
  value: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-semibold">{label}</span>
      <textarea
        className="min-h-36 w-full rounded-2xl border border-border bg-white p-4 font-semibold outline-none focus:border-violet-400"
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
      />
    </label>
  );
}

function Select({
  label,
  name,
  onChange,
  options,
  value
}: {
  label: string;
  name: keyof ListingDraft;
  onChange: (name: keyof ListingDraft, value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <select
        className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none focus:border-violet-400"
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
