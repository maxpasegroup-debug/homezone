"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportButton({
  entityId,
  entityType
}: {
  entityId: string;
  entityType: "property" | "reel" | "provider" | "builder";
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function report() {
    const reason = window.prompt("Why are you reporting this?");

    if (!reason) {
      return;
    }

    setLoading(true);
    setStatus("");

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        entityId,
        entityType,
        reason
      })
    });

    setLoading(false);

    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not submit report.");
      return;
    }

    setStatus("Report submitted for admin review.");
  }

  return (
    <div>
      <Button disabled={loading} onClick={report} size="lg" variant="outline">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
        Report
      </Button>
      {status ? (
        <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">
          {status}
        </p>
      ) : null}
    </div>
  );
}
