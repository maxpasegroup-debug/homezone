"use client";

import { useState } from "react";
import { FileCheck2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PrivateDocumentUpload } from "@/components/documents/private-document-upload";

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

  async function refreshDocuments(){
    try{const response=await fetch(`/api/properties/${propertyId}/documents`,{cache:"no-store"});const data=await response.json();
      if(response.ok&&Array.isArray(data.documents)){setItems(data.documents);setStatus("Private document stored. Notes can be edited using the existing document controls.");}
      else setStatus("Upload returned; refresh documents to confirm the current state.");
    }catch{setStatus("Refresh documents to confirm the current state.");}
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
        <PrivateDocumentUpload scope="property" parent={propertyId} documentType={documentType} notes={notes} onUploaded={refreshDocuments} />
      </div>

      <div className="mt-8 grid gap-3">
        {items.map((item) => (
          <div className="flex flex-col gap-3 rounded-3xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <p className="text-sm font-bold">{item.documentType.replaceAll("_", " ")}</p>
              <a className="mt-1 block text-sm font-semibold text-violet-700" href={/^\/api\/private-files\/[a-f0-9-]{36}$/.test(item.fileUrl)?item.fileUrl:undefined} rel="noreferrer" target="_blank">
                {item.fileName}
              </a>
              {!/^\/api\/private-files\/[a-f0-9-]{36}$/.test(item.fileUrl)?<p className="text-sm">Legacy external reference requires privacy review; no download is offered.</p>:null}
              {item.notes ? <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p> : null}
            </div>
            <Button disabled={item.fileUrl.startsWith("/api/private-files/")} title="Managed file removal awaits the approved retention workflow" onClick={() => removeDocument(item.id)} size="sm" variant="outline">
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
