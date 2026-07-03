"use client";

import { useState } from "react";
import type { StudioOrderStatus } from "@prisma/client";
import { CheckCircle2, FileUp, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const statuses: StudioOrderStatus[] = [
  "PAID",
  "ASSIGNED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "DELIVERED",
  "CUSTOMER_APPROVED",
  "COMPLETED",
  "CANCELLED"
];

const roles = ["PHOTOGRAPHER", "VIDEOGRAPHER", "DRONE_OPERATOR", "EDITOR", "DESIGNER"];
const fileTypes = ["PHOTO", "VIDEO", "BROCHURE", "CREATIVE", "OTHER"];

export function StudioAdminActions({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<StudioOrderStatus>("IN_PRODUCTION");
  const [statusNote, setStatusNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [role, setRole] = useState("PHOTOGRAPHER");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("PHOTO");
  const [loading, setLoading] = useState("");

  async function submit(path: string, payload: Record<string, unknown>, method = "POST") {
    setLoading(path);
    setMessage("");
    const response = await fetch(path, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      },
      method
    });
    setLoading("");
    setMessage(response.ok ? "Studio order updated. Refreshing..." : "Could not update Studio order.");
    if (response.ok) window.location.reload();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="rounded-[1.5rem] border bg-white p-5">
        <p className="font-bold">Production Status</p>
        <select className="mt-3 h-11 w-full rounded-xl border px-3 text-sm font-semibold" onChange={(event) => setStatus(event.target.value as StudioOrderStatus)} value={status}>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          className="mt-3 h-11 w-full rounded-xl border px-3 text-sm"
          onChange={(event) => setScheduledAt(event.target.value)}
          type="datetime-local"
          value={scheduledAt}
        />
        <textarea
          className="mt-3 min-h-24 w-full rounded-xl border p-3 text-sm"
          onChange={(event) => setStatusNote(event.target.value)}
          placeholder="Customer-facing status note"
          value={statusNote}
        />
        <Button className="mt-3 w-full" disabled={loading !== ""} onClick={() => submit(`/api/studio-requests/${orderId}`, {
          message: statusNote || `Studio order moved to ${status}.`,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          status
        }, "PATCH")}>
          <CheckCircle2 className="h-4 w-4" />
          Update Status
        </Button>
      </div>

      <div className="rounded-[1.5rem] border bg-white p-5">
        <p className="font-bold">Assign Team</p>
        <select className="mt-3 h-11 w-full rounded-xl border px-3 text-sm font-semibold" onChange={(event) => setRole(event.target.value)} value={role}>
          {roles.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          className="mt-3 h-11 w-full rounded-xl border px-3 text-sm"
          onChange={(event) => setAssigneeId(event.target.value)}
          placeholder="Profile ID of team member"
          value={assigneeId}
        />
        <Button className="mt-3 w-full" disabled={loading !== "" || !assigneeId} onClick={() => submit(`/api/studio-requests/${orderId}/assignments`, {
          assigneeId,
          notes: "Assigned from Studio operations.",
          role
        })}>
          <UserPlus className="h-4 w-4" />
          Assign
        </Button>
      </div>

      <div className="rounded-[1.5rem] border bg-white p-5">
        <p className="font-bold">Deliver File</p>
        <select className="mt-3 h-11 w-full rounded-xl border px-3 text-sm font-semibold" onChange={(event) => setFileType(event.target.value)} value={fileType}>
          {fileTypes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          className="mt-3 h-11 w-full rounded-xl border px-3 text-sm"
          onChange={(event) => setFileName(event.target.value)}
          placeholder="File name"
          value={fileName}
        />
        <input
          className="mt-3 h-11 w-full rounded-xl border px-3 text-sm"
          onChange={(event) => setFileUrl(event.target.value)}
          placeholder="Cloudinary or delivery URL"
          value={fileUrl}
        />
        <Button className="mt-3 w-full" disabled={loading !== "" || !fileName || !fileUrl} onClick={() => submit(`/api/studio-requests/${orderId}/files`, {
          fileName,
          fileType,
          fileUrl,
          notes: "Final delivery uploaded by HomeZone Studio."
        })}>
          <FileUp className="h-4 w-4" />
          Upload Delivery
        </Button>
      </div>

      {message ? <p className="rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-700 xl:col-span-3">{message}</p> : null}
    </div>
  );
}
