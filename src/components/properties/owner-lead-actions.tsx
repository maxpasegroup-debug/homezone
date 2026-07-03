"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OwnerLeadActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function markContacted() {
    setLoading("contacted");
    const response = await fetch(`/api/owner/leads/${leadId}`, {
      body: JSON.stringify({
        stage: "CONTACTED",
        nextAction: "Owner contacted buyer"
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    });
    setLoading("");
    setMessage(response.ok ? "Marked contacted." : "Could not update lead.");
    router.refresh();
  }

  async function archive() {
    setLoading("archive");
    const response = await fetch(`/api/owner/leads/${leadId}`, {
      body: JSON.stringify({
        stage: "ARCHIVED",
        nextAction: "Archived by owner"
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    });
    setLoading("");
    setMessage(response.ok ? "Lead archived." : "Could not archive lead.");
    router.refresh();
  }

  async function addNote() {
    if (!note.trim()) return;
    setLoading("note");
    const response = await fetch(`/api/owner/leads/${leadId}/notes`, {
      body: JSON.stringify({
        note
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    setLoading("");
    setMessage(response.ok ? "Note added." : "Could not add note.");
    if (response.ok) setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={markContacted} size="sm">
          {loading === "contacted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Mark Contacted
        </Button>
        <Button onClick={archive} size="sm" variant="outline">
          Archive
        </Button>
      </div>
      <div className="flex gap-2">
        <input
          className="h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm font-semibold outline-none"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add private note"
          value={note}
        />
        <Button onClick={addNote} size="sm" variant="outline">
          {loading === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>
      {message ? <p className="text-xs font-semibold text-muted-foreground">{message}</p> : null}
    </div>
  );
}
