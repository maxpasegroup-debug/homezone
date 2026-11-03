"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OwnerListingActions({
  propertyId,
  status,
  verificationStatus,
  directPublication = false
}: {
  propertyId: string;
  status: string;
  verificationStatus?: string;
  directPublication?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const restricted = directPublication && (["REJECTED", "ARCHIVED"].includes(status) ||
    ["REJECTED", "NEEDS_CHANGES", "EXPIRED"].includes(verificationStatus ?? ""));

  async function update(statusValue: "PENDING_REVIEW" | "ARCHIVED" | "PUBLISHED") {
    if (busy.current || (restricted && statusValue !== "ARCHIVED")) return;
    busy.current = true;
    setLoading(statusValue);
    setMessage("");
    try {
    const response = await fetch(`/api/properties/${propertyId}`, {
      body: JSON.stringify({
        status: statusValue
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.property?.id !== propertyId || data?.property?.status !== statusValue) {
      setMessage("The requested listing status was not confirmed. Refresh My Listings before trying again.");
      return;
    }
    setMessage(statusValue === "PUBLISHED" ? "Listing published and available to buyers." : "Listing updated.");
    router.refresh();
    } catch {
      setMessage("Confirmation was not received. Refresh My Listings to check the current status before trying again.");
    } finally {
      busy.current = false;
      setLoading(null);
    }
  }

  async function remove() {
    if (busy.current) return;
    if (!window.confirm("Delete this listing permanently?")) return;
    busy.current = true;
    setLoading("delete");
    setMessage("");
    try {
    const response = await fetch(`/api/properties/${propertyId}`, {
      method: "DELETE"
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.deleted === true) {
      router.refresh();
    } else {
      setMessage("Could not delete listing.");
    }
    } catch {
      setMessage("Deletion confirmation was not received. Refresh My Listings before trying again.");
    } finally {
      busy.current = false;
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(directPublication ? !restricted && (status === "DRAFT" || status === "PENDING_REVIEW") : status === "DRAFT" || status === "REJECTED") ? (
          <Button disabled={Boolean(loading)} onClick={() => update(directPublication ? "PUBLISHED" : "PENDING_REVIEW")} size="sm">
            {loading === "PENDING_REVIEW" || loading === "PUBLISHED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {directPublication ? "Publish listing" : "Submit"}
          </Button>
        ) : null}
        {status === "ARCHIVED" ? !restricted ? (
          <Button disabled={Boolean(loading)} onClick={() => update("PUBLISHED")} size="sm">
            Republish
          </Button>
        ) : null : (
          <Button disabled={Boolean(loading)} onClick={() => update("ARCHIVED")} size="sm" variant="outline">
            {loading === "ARCHIVED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Archive
          </Button>
        )}
        <Button disabled={Boolean(loading)} onClick={remove} size="sm" variant="outline">
          {loading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete
        </Button>
      </div>
      {restricted ? <p className="text-xs font-semibold text-muted-foreground">Publishing is restricted. Contact HomeZone support before republishing.</p> : null}
      {message ? <p className="text-xs font-semibold text-muted-foreground">{message}</p> : null}
    </div>
  );
}
