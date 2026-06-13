"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MediaUploadField({
  folder,
  onUploaded
}: {
  folder: string;
  onUploaded: (result: { url: string; resourceType: string }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setLoading(true);
    setError("");

    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: form
    });

    setLoading(false);

    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setError(data?.error ?? "Upload failed.");
      return;
    }

    onUploaded({
      url: data.url,
      resourceType: data.resourceType
    });
  }

  return (
    <div className="rounded-[1.5rem] border border-dashed border-violet-200 bg-violet-50/70 p-5">
      <input
        className="w-full text-sm font-semibold"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        type="file"
      />
      <Button className="mt-4 w-full" disabled={loading} onClick={upload}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload Media
      </Button>
      {error ? (
        <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
