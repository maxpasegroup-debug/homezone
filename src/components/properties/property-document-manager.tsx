"use client";

import { useState } from "react";
import { FileCheck2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaUploadField } from "@/components/media/media-upload-field";

type DocumentItem = {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  notes?: string | null;
};

const documentTypes = [
  "SALE_DEED",
  "ENCUMBRANCE_CERTIFICATE",
  "TAX_RECEIPT",
  "APPROVAL_DOCUMENT",
  "FLOOR_PLAN",
  "OWNERSHIP_PROOF",
  "OTHER"
];

export function PropertyDocumentManager({
  documents,
  propertyId
}: {
  documents: DocumentItem[];
  propertyId: string;
}) {
  const [items, setItems] = useState(documents);
  const [documentType, setDocumentType] = useState("SALE_DEED");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  async function attachDocument(result: { url: string; resourceType: string; fileName?: string }) {
    setStatus("");
    const response = await fetch(`/api/properties/${propertyId}/documents`, {
      body: JSON.stringify({
        documentType,
        fileName: result.fileName ?? result.url.split("/").pop() ?? "Property document",
        fileUrl: result.url,
        notes: notes || undefined
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(data?.error ?? "Could not save document.");
      return;
    }

    setItems((current) => [data.document, ...current]);
    setNotes("");
    setStatus("Document uploaded securely.");
  }

  async function removeDocument(id: string) {
    const response = await fetch(`/api/properties/${propertyId}/documents/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not remove document.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setStatus("Document removed.");
  }

  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <FileCheck2 className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-violet-700">Secure Documents</p>
          <h1 className="text-3xl font-bold">Upload verification documents</h1>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[16rem_1fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Document type</span>
          <select
            className="h-12 w-full rounded-2xl border bg-white px-4 text-sm font-bold outline-none"
            onChange={(event) => setDocumentType(event.target.value)}
            value={documentType}
          >
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Notes for verification team</span>
          <input
            className="h-12 w-full rounded-2xl border bg-white px-4 text-sm font-semibold outline-none"
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>
      </div>

      <div className="mt-5">
        <MediaUploadField
          folder="homezone/property-documents"
          label="Upload Document"
          onUploaded={attachDocument}
        />
      </div>

      <div className="mt-8 grid gap-3">
        {items.map((item) => (
          <div className="flex flex-col gap-3 rounded-3xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <p className="text-sm font-bold">{item.documentType.replaceAll("_", " ")}</p>
              <a className="mt-1 block text-sm font-semibold text-violet-700" href={item.fileUrl} rel="noreferrer" target="_blank">
                {item.fileName}
              </a>
              {item.notes ? <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p> : null}
            </div>
            <Button onClick={() => removeDocument(item.id)} size="sm" variant="outline">
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ))}
        {!items.length ? (
          <div className="rounded-3xl border border-dashed bg-white p-6 text-center">
            <p className="text-sm font-bold">No documents uploaded yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add ownership proof and approvals before submitting for faster verification.
            </p>
          </div>
        ) : null}
      </div>

      {status ? <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-700">{status}</p> : null}
    </Card>
  );
}
