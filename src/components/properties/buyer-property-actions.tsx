"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, FolderPlus, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

type Shortlist = {
  id: string;
  name: string;
  items?: {
    propertyId: string;
  }[];
};

const compareKey = "homezone_compare_properties";

function readCompareIds() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(compareKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function BuyerPropertyActions({
  propertyId,
  initialSaved = false,
  compact = false
}: {
  compact?: boolean;
  initialSaved?: boolean;
  propertyId: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [shortlistName, setShortlistName] = useState("My Dream Home");
  const [openShortlists, setOpenShortlists] = useState(false);

  useEffect(() => {
    setCompareIds(readCompareIds());
  }, []);

  const compareHref = useMemo(() => {
    const ids = compareIds.join(",");
    return ids ? `/properties/compare?ids=${encodeURIComponent(ids)}` : "/properties/compare";
  }, [compareIds]);

  async function toggleSaved() {
    setBusy("save");
    setStatus("");

    const response = await fetch(`/api/properties/${propertyId}/save`, {
      method: saved ? "DELETE" : "POST"
    });

    setBusy("");

    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }

    if (!response.ok) {
      setStatus("Could not update saved property.");
      return;
    }

    setSaved(!saved);
    setStatus(saved ? "Removed from saved properties." : "Saved to your dashboard.");
  }

  async function toggleCompare() {
    const current = readCompareIds();
    const next = current.includes(propertyId)
      ? current.filter((id) => id !== propertyId)
      : [propertyId, ...current].slice(0, 4);

    window.localStorage.setItem(compareKey, JSON.stringify(next));
    setCompareIds(next);
    setStatus(next.includes(propertyId) ? "Added to comparison." : "Removed from comparison.");

    if (next.includes(propertyId) && next.length >= 2) {
      await fetch("/api/properties/compare", {
        body: JSON.stringify({
          propertyIds: next
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      }).catch(() => undefined);
    }
  }

  async function loadShortlists() {
    setOpenShortlists((current) => !current);

    if (shortlists.length) return;

    const response = await fetch("/api/shortlists");

    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }

    const data = await response.json().catch(() => null);
    setShortlists(data?.shortlists ?? []);
  }

  async function createShortlist() {
    setBusy("shortlist");
    setStatus("");

    const response = await fetch("/api/shortlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: shortlistName
      })
    });

    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setBusy("");
      setStatus(data?.error ?? "Could not create shortlist.");
      return;
    }

    setShortlists((current) => [data.shortlist, ...current]);
    await addToShortlist(data.shortlist.id);
  }

  async function addToShortlist(shortlistId: string) {
    setBusy("shortlist");
    setStatus("");

    const response = await fetch(`/api/shortlists/${shortlistId}/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        propertyId
      })
    });

    setBusy("");

    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not add property to shortlist.");
      return;
    }

    setStatus("Added to shortlist.");
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "flex gap-2" : "grid gap-3 sm:grid-cols-3"}>
        <Button disabled={busy === "save"} onClick={toggleSaved} size={compact ? "sm" : "lg"} title={saved ? "Remove saved property" : "Save property"} variant="outline">
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
          {compact ? "" : saved ? "Saved" : "Save"}
        </Button>
        <Button onClick={toggleCompare} size={compact ? "sm" : "lg"} title="Compare property" variant="outline">
          <Scale className="h-4 w-4" />
          {compact ? "" : compareIds.includes(propertyId) ? "Comparing" : "Compare"}
        </Button>
        <Button disabled={busy === "shortlist"} onClick={loadShortlists} size={compact ? "sm" : "lg"} title="Add to shortlist" variant="outline">
          {busy === "shortlist" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
          {compact ? "" : "Shortlist"}
        </Button>
      </div>

      {compareIds.length >= 2 ? (
        <Button className="w-full" onClick={() => window.location.assign(compareHref)} size={compact ? "sm" : "lg"}>
          Compare {compareIds.length} properties
        </Button>
      ) : null}

      {openShortlists ? (
        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
          <div className="grid gap-2">
            {shortlists.map((shortlist) => (
              <Button
                key={shortlist.id}
                onClick={() => addToShortlist(shortlist.id)}
                size="sm"
                type="button"
                variant="outline"
              >
                {shortlist.name}
              </Button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="h-10 rounded-xl border border-border px-3 text-sm font-semibold outline-none"
              onChange={(event) => setShortlistName(event.target.value)}
              value={shortlistName}
            />
            <Button disabled={busy === "shortlist"} onClick={createShortlist} size="sm">
              Create
            </Button>
          </div>
        </div>
      ) : null}

      {status ? (
        <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
          {status}
        </p>
      ) : null}
    </div>
  );
}
