"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, ShieldAlert, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = ["USER", "OWNER", "BROKER", "BUILDER", "SERVICE_PROVIDER", "ADMIN", "SUPER_ADMIN"];
const profileStatuses = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];
const reportActions = ["RESOLVED", "DISMISSED", "ESCALATED"];

export function AdminModerationPanel({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function moderate(status: "PUBLISHED" | "REJECTED" | "NEEDS_CHANGES") {
    if (note.trim().length < 3) {
      setMessage("Moderation note is required.");
      return;
    }

    setLoading(status);
    const response = await fetch(`/api/admin/properties/${propertyId}/moderate`, {
      body: JSON.stringify({ note, status }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading("");
    setMessage(response.ok ? "Moderation saved." : "Moderation failed.");
    if (response.ok) {
      setNote("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-24 w-full rounded-2xl border bg-white p-3 text-sm font-semibold outline-none"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Required moderation note"
        value={note}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <Button disabled={Boolean(loading)} onClick={() => moderate("PUBLISHED")} size="sm">
          {loading === "PUBLISHED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
          Approve
        </Button>
        <Button disabled={Boolean(loading)} onClick={() => moderate("NEEDS_CHANGES")} size="sm" variant="outline">
          Request Changes
        </Button>
        <Button disabled={Boolean(loading)} onClick={() => moderate("REJECTED")} size="sm" variant="outline">
          Reject
        </Button>
      </div>
      {message ? <p className="text-xs font-bold text-muted-foreground">{message}</p> : null}
    </div>
  );
}

export function AdminUserPanel({
  profileId,
  role,
  verificationStatus
}: {
  profileId: string;
  role: string;
  verificationStatus: string;
}) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState(role);
  const [nextStatus, setNextStatus] = useState(verificationStatus);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setLoading(true);
    const response = await fetch(`/api/admin/users/${profileId}`, {
      body: JSON.stringify({
        note: note || "Admin profile update",
        role: nextRole,
        verificationStatus: nextStatus
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading(false);
    setMessage(response.ok ? "Profile updated." : "Profile update failed.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="h-10 rounded-xl border bg-white px-3 text-xs font-bold" onChange={(event) => setNextRole(event.target.value)} value={nextRole}>
          {roles.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="h-10 rounded-xl border bg-white px-3 text-xs font-bold" onChange={(event) => setNextStatus(event.target.value)} value={nextStatus}>
          {profileStatuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <input className="h-10 w-full rounded-xl border bg-white px-3 text-xs font-semibold" onChange={(event) => setNote(event.target.value)} placeholder="Admin note" value={note} />
      <Button disabled={loading} onClick={save} size="sm" variant="outline">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
        Save
      </Button>
      {message ? <p className="text-xs font-bold text-muted-foreground">{message}</p> : null}
    </div>
  );
}

export function AdminReportPanel({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [action, setAction] = useState("RESOLVED");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (note.trim().length < 3) {
      setMessage("Resolution note is required.");
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/admin/reports/${reportId}`, {
      body: JSON.stringify({ action, note }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading(false);
    setMessage(response.ok ? "Report updated." : "Report update failed.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <select className="h-10 w-full rounded-xl border bg-white px-3 text-xs font-bold" onChange={(event) => setAction(event.target.value)} value={action}>
        {reportActions.map((item) => <option key={item}>{item}</option>)}
      </select>
      <input className="h-10 w-full rounded-xl border bg-white px-3 text-xs font-semibold" onChange={(event) => setNote(event.target.value)} placeholder="Resolution note" value={note} />
      <Button disabled={loading} onClick={save} size="sm" variant="outline">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
        Save Report Action
      </Button>
      {message ? <p className="text-xs font-bold text-muted-foreground">{message}</p> : null}
    </div>
  );
}
