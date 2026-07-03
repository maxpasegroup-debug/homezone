"use client";

import { useState } from "react";
import { CheckCircle2, ImagePlus, Trash2, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaUploadField } from "@/components/media/media-upload-field";

export function PropertyMediaManager({
  coverImageUrl,
  mediaUrls,
  propertyId,
  videoUrl,
  virtualTourUrl
}: {
  coverImageUrl?: string | null;
  mediaUrls: string[];
  propertyId: string;
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
}) {
  const [cover, setCover] = useState(coverImageUrl ?? "");
  const [gallery, setGallery] = useState(mediaUrls);
  const [video, setVideo] = useState(videoUrl ?? "");
  const [tour, setTour] = useState(virtualTourUrl ?? "");
  const [status, setStatus] = useState("");

  async function updateMedia(body: Record<string, unknown>, success: string) {
    setStatus("");
    const response = await fetch(`/api/properties/${propertyId}/media`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not update media.");
      return false;
    }

    setStatus(success);
    return true;
  }

  async function attachMedia(result: { url: string; resourceType: string }) {
    const mediaType = result.resourceType === "video" ? "video" : "image";
    const ok = await updateMedia(
      {
        action: "add",
        mediaType,
        mediaUrl: result.url
      },
      `${mediaType === "video" ? "Video" : "Image"} attached to property.`
    );

    if (ok) {
      if (mediaType === "video") setVideo(result.url);
      else setGallery((current) => [...current, result.url]);
    }
  }

  async function setCoverImage(url: string) {
    const ok = await updateMedia(
      {
        action: "add",
        mediaType: "cover",
        mediaUrl: url
      },
      "Cover image updated."
    );
    if (ok) setCover(url);
  }

  async function removeImage(url: string) {
    const ok = await updateMedia(
      {
        action: "remove",
        mediaUrl: url
      },
      "Image removed."
    );
    if (ok) {
      setGallery((current) => current.filter((item) => item !== url));
      if (cover === url) setCover("");
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const next = [...gallery];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const ok = await updateMedia(
      {
        action: "reorder",
        mediaUrls: next
      },
      "Gallery order saved."
    );
    if (ok) setGallery(next);
  }

  async function saveVideo() {
    await updateMedia(
      {
        action: "replace-video",
        videoUrl: video || undefined
      },
      "Walkthrough video updated."
    );
  }

  async function saveTour() {
    await updateMedia(
      {
        action: "set-virtual-tour",
        virtualTourUrl: tour || undefined
      },
      "Virtual tour updated."
    );
  }

  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <ImagePlus className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-violet-700">Property Media</p>
          <h1 className="text-3xl font-bold">Manage photos, video and tours</h1>
        </div>
      </div>

      <div className="mt-6">
        <MediaUploadField
          folder="homezone/property-media"
          onUploaded={attachMedia}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gallery.map((url, index) => (
          <div className="overflow-hidden rounded-3xl border bg-white" key={url}>
            <div className="aspect-[4/3] bg-muted">
              <img alt="Property media" className="h-full w-full object-cover" src={url} />
            </div>
            <div className="space-y-2 p-3">
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setCoverImage(url)} size="sm" variant={cover === url ? "default" : "outline"}>
                  {cover === url ? "Cover" : "Set Cover"}
                </Button>
                <Button onClick={() => removeImage(url)} size="sm" variant="outline">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={index === 0} onClick={() => moveImage(index, -1)} size="sm" variant="outline">
                  Move Up
                </Button>
                <Button disabled={index === gallery.length - 1} onClick={() => moveImage(index, 1)} size="sm" variant="outline">
                  Move Down
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!gallery.length ? (
          <div className="rounded-3xl border border-dashed bg-white p-6 text-center text-sm font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3">
            Upload your first cover photo to make the listing feel premium.
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 rounded-3xl bg-muted p-4">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Video className="h-4 w-4 text-violet-700" />
            Walkthrough video URL
          </span>
          <input className="h-12 w-full rounded-2xl border bg-white px-4 text-sm font-semibold outline-none" onChange={(event) => setVideo(event.target.value)} value={video} />
          <Button onClick={saveVideo} size="sm">Save Video</Button>
        </label>
        <label className="space-y-2 rounded-3xl bg-muted p-4">
          <span className="text-sm font-bold">Virtual tour URL</span>
          <input className="h-12 w-full rounded-2xl border bg-white px-4 text-sm font-semibold outline-none" onChange={(event) => setTour(event.target.value)} value={tour} />
          <Button onClick={saveTour} size="sm">Save Tour</Button>
        </label>
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
