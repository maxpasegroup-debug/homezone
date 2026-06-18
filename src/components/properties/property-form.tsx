"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VoiceInputButton } from "@/components/voice/voice-input-button";

const categories = ["RESIDENTIAL", "COMMERCIAL", "LAND", "INDUSTRIAL", "AGRICULTURAL", "HOSPITALITY", "LUXURY"];
const currencies = ["INR", "AED", "USD", "GBP", "EUR"];
const intents = ["BUY", "RENT", "LEASE", "INVEST"];
const propertyTypes = ["Villa", "House", "Apartment", "Flat", "Land", "Office", "Shop", "Warehouse", "Farm Land", "Hotel", "Luxury"];

export function PropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "3BHK Premium Villa in Kakkanad",
    description: "A calm family villa with covered parking, easy Infopark access, and strong long-term living potential.",
    intent: "BUY",
    category: "RESIDENTIAL",
    propertyType: "Villa",
    country: "India",
    state: "Kerala",
    city: "Kochi",
    locality: "Kakkanad",
    latitude: "",
    longitude: "",
    timezone: "Asia/Kolkata",
    price: "7800000",
    currency: "INR",
    areaValue: "1850",
    areaUnit: "sqft",
    bedrooms: "3",
    bathrooms: "3",
    amenities: "Covered parking, Near Infopark, Gated community"
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitProperty() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/properties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
        price: form.price || undefined,
        areaValue: form.areaValue || undefined,
        bedrooms: form.bedrooms || undefined,
        bathrooms: form.bathrooms || undefined,
        amenities: form.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not create property.");
      return;
    }

    router.push("/dashboard/listings");
    router.refresh();
  }

  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Plus className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        Add a property
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
        Create a listing in simple language. It will go to admin review before
        becoming public.
      </p>

      <div className="mt-6 rounded-[1.5rem] bg-violet-50 p-5">
        <p className="text-sm font-bold text-violet-700">
          Voice-first listing
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Speak property details. HomeZone will place the transcript into the
          description so you can edit before submitting.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(["English", "Malayalam", "Hindi"] as const).map((language) => (
            <VoiceInputButton
              key={language}
              language={language}
              onTranscript={(text) =>
                setForm((current) => ({
                  ...current,
                  description: text
                }))
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Title</span>
          <input
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => updateField("title", event.target.value)}
            value={form.title}
          />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Description</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-border bg-white p-4 font-semibold outline-none"
            onChange={(event) => updateField("description", event.target.value)}
            value={form.description}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Intent</span>
          <select
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold capitalize outline-none"
            onChange={(event) => updateField("intent", event.target.value)}
            value={form.intent}
          >
            {intents.map((intent) => (
              <option key={intent}>{intent}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Category</span>
          <select
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => updateField("category", event.target.value)}
            value={form.category}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Property type</span>
          <select
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => updateField("propertyType", event.target.value)}
            value={form.propertyType}
          >
            {propertyTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Currency</span>
          <select
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => updateField("currency", event.target.value)}
            value={form.currency}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
        {(["country", "state", "city", "locality", "timezone", "latitude", "longitude", "price", "areaValue", "areaUnit", "bedrooms", "bathrooms"] as const).map((field) => (
          <label className="space-y-2" key={field}>
            <span className="text-sm font-semibold capitalize">{field}</span>
            <input
              className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
              onChange={(event) => updateField(field, event.target.value)}
              value={form[field]}
            />
          </label>
        ))}
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Amenities</span>
          <input
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => updateField("amenities", event.target.value)}
            value={form.amenities}
          />
        </label>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-violet-50 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
          <Sparkles className="h-4 w-4" />
          Next: media upload and AI description generation
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Phase C will add Cloudinary image/video uploads and property reels.
        </p>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <Button className="mt-7 w-full sm:w-auto" disabled={loading} onClick={submitProperty} size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit for Review
      </Button>
    </Card>
  );
}
