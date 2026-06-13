"use client";

import { useState } from "react";
import { CheckCircle2, ImagePlus, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MediaUploadField } from "@/components/media/media-upload-field";

export function PropertyMediaManager({ propertyId }: { propertyId: string }) {
  const [status, setStatus] = useState("");

  async function attachMedia(result: { url: string; resourceType: string }) {
    const mediaType = result.resourceType === "video" ? "video" : "image";
    const response = await fetch(`/api/properties/${propertyId}/media`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mediaUrl: result.url,
        mediaType
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not attach media.");
      return;
    }

    setStatus(`${mediaType === "video" ? "Video" : "Image"} attached to property.`);
  }

  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <ImagePlus className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-violet-700">Property Media</p>
          <h1 className="text-3xl font-bold">Upload photos or video</h1>
        </div>
      </div>

      <div className="mt-6">
        <MediaUploadField
          folder="homezone/property-media"
          onUploaded={attachMedia}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-muted p-4">
          <ImagePlus className="h-5 w-5 text-violet-700" />
          <p className="mt-3 text-sm font-bold">Photos go into property gallery.</p>
        </div>
        <div className="rounded-2xl bg-muted p-4">
          <Video className="h-5 w-5 text-violet-700" />
          <p className="mt-3 text-sm font-bold">Videos become walkthrough media.</p>
        </div>
      </div>

      {status ? (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {status}
        </p>
      ) : null}
    </Card>
  );
}
