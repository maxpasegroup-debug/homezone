"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModerationActions({
  id,
  type
}: {
  id: string;
  type: "properties" | "reels";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function moderate(status: "PUBLISHED" | "REJECTED") {
    setLoading(status);
    setError("");

    const response = await fetch(`/api/admin/${type}/${id}/moderate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status
      })
    });

    setLoading(null);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Moderation failed.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={Boolean(loading)}
          onClick={() => moderate("PUBLISHED")}
          size="sm"
        >
          {loading === "PUBLISHED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve
        </Button>
        <Button
          className="flex-1"
          disabled={Boolean(loading)}
          onClick={() => moderate("REJECTED")}
          size="sm"
          variant="outline"
        >
          {loading === "REJECTED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Reject
        </Button>
      </div>
      {error ? (
        <p className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
