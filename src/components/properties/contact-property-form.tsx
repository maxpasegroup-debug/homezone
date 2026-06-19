"use client";

import { useState } from "react";
import { Loader2, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactPropertyForm({ propertyId }: { propertyId: string }) {
  const [name, setName] = useState("HomeZone Demo User");
  const [phone, setPhone] = useState("+91 99999 99999");
  const [message, setMessage] = useState("I am interested in this property. Please contact me.");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLead(contactAction: "CALL" | "INQUIRY" | "WHATSAPP") {
    setLoading(true);
    setStatus("");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        propertyId,
        name,
        phone,
        message,
        source: "PROPERTY",
        contactAction
      })
    });

    setLoading(false);

    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Could not send inquiry.");
      return;
    }

    setStatus(
      contactAction === "CALL"
        ? "Call request saved. It will appear in your dashboard."
        : contactAction === "WHATSAPP"
          ? "WhatsApp request saved. It will appear in your dashboard."
          : "Inquiry sent. It will appear in your dashboard."
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <input
        className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm font-semibold outline-none"
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <input
        className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm font-semibold outline-none"
        onChange={(event) => setPhone(event.target.value)}
        value={phone}
      />
      <textarea
        className="min-h-24 w-full rounded-2xl border border-border bg-white p-4 text-sm font-semibold outline-none"
        onChange={(event) => setMessage(event.target.value)}
        value={message}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <Button disabled={loading} onClick={() => submitLead("CALL")} size="lg" variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
          Call
        </Button>
        <Button disabled={loading} onClick={() => submitLead("WHATSAPP")} size="lg" variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          WhatsApp
        </Button>
        <Button disabled={loading} onClick={() => submitLead("INQUIRY")} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Inquiry
        </Button>
      </div>
      {status ? (
        <p className="rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">
          {status}
        </p>
      ) : null}
    </div>
  );
}
