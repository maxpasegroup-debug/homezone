"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OwnerListingActions({
  propertyId,
  status
}: {
  propertyId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function update(statusValue: "PENDING_REVIEW" | "ARCHIVED" | "PUBLISHED") {
    setLoading(statusValue);
    setMessage("");
    const response = await fetch(`/api/properties/${propertyId}`, {
      body: JSON.stringify({
        status: statusValue
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    });
    setLoading(null);
    setMessage(response.ok ? "Listing updated." : "Could not update listing.");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this listing permanently?")) return;
    setLoading("delete");
    const response = await fetch(`/api/properties/${propertyId}`, {
      method: "DELETE"
    });
    setLoading(null);
    if (response.ok) {
      router.refresh();
    } else {
      setMessage("Could not delete listing.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" || status === "REJECTED" ? (
          <Button onClick={() => update("PENDING_REVIEW")} size="sm">
            {loading === "PENDING_REVIEW" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit
          </Button>
        ) : null}
        {status === "ARCHIVED" ? (
          <Button onClick={() => update("PUBLISHED")} size="sm">
            Republish
          </Button>
        ) : (
          <Button onClick={() => update("ARCHIVED")} size="sm" variant="outline">
            {loading === "ARCHIVED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Archive
          </Button>
        )}
        <Button onClick={remove} size="sm" variant="outline">
          {loading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete
        </Button>
      </div>
      {message ? <p className="text-xs font-semibold text-muted-foreground">{message}</p> : null}
    </div>
  );
}
