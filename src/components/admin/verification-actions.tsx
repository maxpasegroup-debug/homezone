"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type VerificationTarget = "property" | "broker" | "builder";
type PropertyStatus = "VERIFIED" | "REJECTED" | "EXPIRED";
type ProfileStatus = "VERIFIED" | "REJECTED" | "SUSPENDED";

export function VerificationActions({
  id,
  target
}: {
  id: string;
  target: VerificationTarget;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const endpoint =
    target === "property"
      ? `/api/admin/properties/${id}/verify`
      : `/api/admin/profiles/${id}/verify`;

  async function verify(status: PropertyStatus | ProfileStatus) {
    setLoading(status);
    setError("");

    const response = await fetch(endpoint, {
      body: JSON.stringify({
        note: note.trim() || undefined,
        status
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    });

    setLoading(null);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Verification action failed.");
      return;
    }

    setNote("");
    router.refresh();
  }

  const actions =
    target === "property"
      ? [
          { icon: BadgeCheck, label: "Approve", status: "VERIFIED" as const },
          { icon: XCircle, label: "Reject", status: "REJECTED" as const },
          { icon: Clock, label: "Expire", status: "EXPIRED" as const }
        ]
      : [
          { icon: BadgeCheck, label: "Approve", status: "VERIFIED" as const },
          { icon: XCircle, label: "Reject", status: "REJECTED" as const },
          { icon: Ban, label: "Suspend", status: "SUSPENDED" as const }
        ];

  return (
    <div className="mt-5 space-y-3">
      <textarea
        className="min-h-20 w-full rounded-2xl border border-border bg-white p-3 text-sm font-semibold outline-none"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Verification notes"
        value={note}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <Button
              disabled={Boolean(loading)}
              key={action.status}
              onClick={() => verify(action.status)}
              size="sm"
              variant={action.status === "VERIFIED" ? "default" : "outline"}
            >
              {loading === action.status ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ActionIcon className="h-4 w-4" />
              )}
              {action.label}
            </Button>
          );
        })}
      </div>
      {error ? (
        <p className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
