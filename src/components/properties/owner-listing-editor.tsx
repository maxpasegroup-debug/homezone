"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { CheckCircle2, ImagePlus, Loader2, Save, Send, Sparkles, UploadCloud, Video } from "lucide-react";
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
  mediaUrls: string;
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
    mediaUrls: Array.isArray(property?.mediaUrls) ? property.mediaUrls.join("\n") : property?.mediaUrls ?? "",
    videoUrl: property?.videoUrl ?? "",
    virtualTourUrl: property?.virtualTourUrl ?? ""
  };
}

function optionalText(value: string, minLength = 1) {
  const trimmed = value.trim();
  return trimmed.length >= minLength ? trimmed : undefined;
}

function payloadFor(form: ListingDraft, status: "DRAFT" | "PENDING_REVIEW") {
  const isDraft = status === "DRAFT";

  return {
    ...form,
    city: isDraft && !form.city ? "Location pending" : form.city,
    description:
      isDraft && !form.description
        ? "Owner draft saved for completion before verification."
        : form.description.trim(),
    title: isDraft && !form.title ? "Untitled property draft" : form.title.trim(),
    address: optionalText(form.address),
    areaValue: optionalText(form.areaValue),
    bathrooms: optionalText(form.bathrooms),
    bedrooms: optionalText(form.bedrooms),
    coverImageUrl: optionalText(form.coverImageUrl),
    latitude: optionalText(form.latitude),
    locality: optionalText(form.locality, 2),
    longitude: optionalText(form.longitude),
    mediaUrls: form.mediaUrls
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
    price: optionalText(form.price),
    state: optionalText(form.state, 2),
    timezone: optionalText(form.timezone, 2),
    videoUrl: optionalText(form.videoUrl),
    virtualTourUrl: optionalText(form.virtualTourUrl),
    amenities: form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    status
  };
}

function validateBeforeSubmit(form: ListingDraft, status: "DRAFT" | "PENDING_REVIEW") {
  if (status === "DRAFT") return "";

  const missing = [
    [form.title.trim().length < 3, "title"],
    [form.description.trim().length < 10, "description"],
    [form.propertyType.trim().length < 2, "property type"],
    [form.country.trim().length < 2, "country"],
    [form.city.trim().length < 2, "city"]
  ]
    .filter(([invalid]) => invalid)
    .map(([, label]) => label);

  return missing.length ? `Please complete ${missing.join(", ")} before submitting for verification.` : "";
}

function apiMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const body = data as { details?: { fieldErrors?: Record<string, string[]> }; error?: string };
  const fieldErrors = body.details?.fieldErrors;

  if (fieldErrors) {
    const first = Object.entries(fieldErrors).find(([, messages]) => messages.length);
    if (first) {
      return `${first[0]}: ${first[1][0]}`;
    }
  }

  return body.error ?? fallback;
}

export function OwnerListingEditor({
  property
}: {
  property?: ListingValue;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ListingDraft>(() => toFormData(property));
  const [loadingAction, setLoadingAction] = useState<"draft" | "submit" | "autosave" | null>(null);
  const [uploading, setUploading] = useState<"cover" | "gallery" | "tour" | "video" | null>(null);
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

  async function uploadFile(file: File, target: "cover" | "gallery" | "tour" | "video") {
    setUploading(target);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "homezone/property-media");

    const response = await fetch("/api/media/upload", {
      body: formData,
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setUploading(null);

    if (!response.ok || !data?.url) {
      setError(data?.error ?? "Upload failed. Check Cloudinary settings and file size.");
      return;
    }

    setForm((current) => {
      if (target === "cover") {
        return { ...current, coverImageUrl: data.url };
      }
      if (target === "video") {
        return { ...current, videoUrl: data.url };
      }
      if (target === "tour") {
        return { ...current, virtualTourUrl: data.url };
      }
      const urls = current.mediaUrls
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      return { ...current, mediaUrls: [...urls, data.url].join("\n") };
    });
    setMessage("Media uploaded and attached to this listing.");
  }

  async function save(status: "DRAFT" | "PENDING_REVIEW", mode: "draft" | "submit" | "autosave" = "draft") {
    const validationMessage = validateBeforeSubmit(form, status);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

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
      setError(apiMessage(data, "Could not save listing."));
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
        {(["country", "state", "city", "locality", "address", "timezone", "latitude", "longitude", "price", "areaValue", "areaUnit", "bedrooms", "bathrooms"] as const).map((field) => (
          <Field key={field} label={field.replace(/([A-Z])/g, " $1")} name={field} onChange={updateField} value={form[field]} />
        ))}
        <Field className="sm:col-span-2" label="Amenities" name="amenities" onChange={updateField} value={form.amenities} />
      </div>

      <div className="mt-8 rounded-[1.5rem] border bg-white p-5">
        <p className="text-sm font-bold text-violet-700">Property Media</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload files directly or paste hosted URLs. Uploaded files are attached automatically.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <MediaUpload
            accept="image/*"
            icon={<ImagePlus className="h-4 w-4" />}
            label="Cover image file"
            loading={uploading === "cover"}
            onFile={(file) => uploadFile(file, "cover")}
          />
          <Field label="Cover image URL" name="coverImageUrl" onChange={updateField} value={form.coverImageUrl} />

          <MediaUpload
            accept="image/*"
            icon={<ImagePlus className="h-4 w-4" />}
            label="Gallery image file"
            loading={uploading === "gallery"}
            onFile={(file) => uploadFile(file, "gallery")}
          />
          <TextArea label="Gallery image URLs" name="mediaUrls" onChange={updateField} value={form.mediaUrls} />

          <MediaUpload
            accept="video/mp4,video/quicktime,video/webm"
            icon={<Video className="h-4 w-4" />}
            label="Property video file"
            loading={uploading === "video"}
            onFile={(file) => uploadFile(file, "video")}
          />
          <Field label="Property video URL" name="videoUrl" onChange={updateField} value={form.videoUrl} />

          <MediaUpload
            accept="image/*,video/mp4,video/quicktime,video/webm"
            icon={<UploadCloud className="h-4 w-4" />}
            label="Virtual tour file"
            loading={uploading === "tour"}
            onFile={(file) => uploadFile(file, "tour")}
          />
          <Field label="Virtual tour URL" name="virtualTourUrl" onChange={updateField} value={form.virtualTourUrl} />
        </div>
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

function MediaUpload({
  accept,
  icon,
  label,
  loading,
  onFile
}: {
  accept: string;
  icon: ReactNode;
  label: string;
  loading: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-4 transition hover:border-violet-400 hover:bg-violet-50">
      <span className="flex items-center gap-2 text-sm font-bold text-violet-700">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </span>
      <span className="mt-2 text-xs font-semibold text-muted-foreground">
        Choose a file from your device.
      </span>
      <input
        accept={accept}
        className="sr-only"
        disabled={loading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
        type="file"
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
