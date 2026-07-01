"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ProviderOnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: "ClearTitle Legal",
    category: "Legal",
    city: "Kochi",
    priceLabel: "From ₹2,999"
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitProvider() {
    setLoading(true);
    await fetch("/api/service-providers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Store className="h-7 w-7" />
      </div>
      <h2 className="mt-6 text-4xl font-bold">Provider onboarding</h2>
      <p className="mt-3 text-muted-foreground">
        Submit your provider profile for HomeZone verification.
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {(["businessName", "category", "city", "priceLabel"] as const).map((field) => (
          <label className="space-y-2" key={field}>
            <span className="text-sm font-semibold capitalize">{field}</span>
            <input
              className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
              onChange={(event) => updateField(field, event.target.value)}
              value={form[field]}
            />
          </label>
        ))}
      </div>
      <Button className="mt-6" disabled={loading} onClick={submitProvider} size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit Provider Profile
      </Button>
    </Card>
  );
}
