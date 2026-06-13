"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaUploadField } from "@/components/media/media-upload-field";

export function ReelForm({ properties }: { properties: { id: string; title: string }[] }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [title, setTitle] = useState("Premium property walkthrough reel");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createReel() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/reels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        propertyId: propertyId || undefined,
        title,
        videoUrl
      })
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not create reel.");
      return;
    }

    router.push("/dashboard/reels");
    router.refresh();
  }

  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Play className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">Create a property reel</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
        Upload a vertical walkthrough video. It will enter moderation before going public.
      </p>

      <div className="mt-7">
        <MediaUploadField
          folder="homezone/property-reels"
          onUploaded={(result) => setVideoUrl(result.url)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Reel title</span>
          <input
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Attach property</span>
          <select
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => setPropertyId(event.target.value)}
            value={propertyId}
          >
            <option value="">No property selected</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Video URL</span>
          <input
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => setVideoUrl(event.target.value)}
            value={videoUrl}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <Button className="mt-7 w-full sm:w-auto" disabled={loading || !videoUrl} onClick={createReel} size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Submit Reel
      </Button>
    </Card>
  );
}
