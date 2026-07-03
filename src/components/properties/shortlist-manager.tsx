"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderHeart, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ShortlistItem = {
  propertyId: string;
  property: {
    id: string;
    title: string;
    city: string;
    locality: string | null;
  };
};

type Shortlist = {
  id: string;
  name: string;
  items: ShortlistItem[];
};

export function ShortlistManager({ initialShortlists }: { initialShortlists: Shortlist[] }) {
  const [shortlists, setShortlists] = useState(initialShortlists);
  const [name, setName] = useState("Kochi Villas");
  const [loading, setLoading] = useState("");
  const [status, setStatus] = useState("");

  async function createShortlist() {
    setLoading("create");
    setStatus("");

    const response = await fetch("/api/shortlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });
    const data = await response.json().catch(() => null);
    setLoading("");

    if (!response.ok) {
      setStatus(data?.error ?? "Could not create shortlist.");
      return;
    }

    setShortlists((current) => [{ ...data.shortlist, items: [] }, ...current]);
    setStatus("Shortlist created.");
  }

  async function renameShortlist(id: string, currentName: string) {
    const nextName = window.prompt("Rename shortlist", currentName);
    if (!nextName) return;

    setLoading(id);
    const response = await fetch(`/api/shortlists/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: nextName })
    });
    const data = await response.json().catch(() => null);
    setLoading("");

    if (!response.ok) {
      setStatus(data?.error ?? "Could not rename shortlist.");
      return;
    }

    setShortlists((current) =>
      current.map((shortlist) =>
        shortlist.id === id ? { ...shortlist, name: data.shortlist.name } : shortlist
      )
    );
  }

  async function deleteShortlist(id: string) {
    setLoading(id);
    const response = await fetch(`/api/shortlists/${id}`, {
      method: "DELETE"
    });
    setLoading("");

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not delete shortlist.");
      return;
    }

    setShortlists((current) => current.filter((shortlist) => shortlist.id !== id));
  }

  async function removeProperty(shortlistId: string, propertyId: string) {
    setLoading(`${shortlistId}-${propertyId}`);
    const response = await fetch(`/api/shortlists/${shortlistId}/properties`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ propertyId })
    });
    setLoading("");

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not remove property.");
      return;
    }

    setShortlists((current) =>
      current.map((shortlist) =>
        shortlist.id === shortlistId
          ? {
              ...shortlist,
              items: shortlist.items.filter((item) => item.propertyId !== propertyId)
            }
          : shortlist
      )
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 shadow-sm sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="h-12 rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <Button disabled={loading === "create"} onClick={createShortlist}>
            {loading === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderHeart className="h-4 w-4" />}
            Create shortlist
          </Button>
        </div>
        {status ? (
          <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">
            {status}
          </p>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {shortlists.map((shortlist) => (
          <Card className="p-5 shadow-sm sm:p-6" key={shortlist.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">{shortlist.name}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {shortlist.items.length} properties
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={loading === shortlist.id}
                  onClick={() => renameShortlist(shortlist.id, shortlist.name)}
                  size="icon"
                  title="Rename shortlist"
                  variant="outline"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  disabled={loading === shortlist.id}
                  onClick={() => deleteShortlist(shortlist.id)}
                  size="icon"
                  title="Delete shortlist"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {shortlist.items.map((item) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted p-4" key={item.propertyId}>
                  <div>
                    <Link className="font-bold text-violet-700" href={`/properties/${item.property.id}`}>
                      {item.property.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[item.property.locality, item.property.city].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <Button
                    disabled={loading === `${shortlist.id}-${item.propertyId}`}
                    onClick={() => removeProperty(shortlist.id, item.propertyId)}
                    size="icon"
                    title="Remove from shortlist"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!shortlist.items.length ? (
                <p className="rounded-2xl bg-muted p-4 text-sm font-semibold text-muted-foreground">
                  Add properties from any property card or detail page.
                </p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
