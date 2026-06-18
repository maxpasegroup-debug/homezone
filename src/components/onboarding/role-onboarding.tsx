"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const roles = [
  {
    value: "USER",
    title: "User / Investor",
    text: "Search, save, analyze, and compare properties.",
    icon: UserRound
  },
  {
    value: "OWNER",
    title: "Property Owner",
    text: "List, market, and manage your property.",
    icon: Home
  },
  {
    value: "BROKER",
    title: "Broker",
    text: "Manage leads, pipeline, and follow-ups.",
    icon: UsersRound
  },
  {
    value: "BUILDER",
    title: "Builder",
    text: "Showcase projects and launch campaigns.",
    icon: Building2
  },
  {
    value: "SERVICE_PROVIDER",
    title: "Service Provider",
    text: "Offer legal, loans, interiors, moving, and more.",
    icon: Wrench
  }
];

export function RoleOnboarding({
  defaultRole,
  email
}: {
  defaultRole?: string;
  email?: string | null;
}) {
  const router = useRouter();
  const [role, setRole] = useState(defaultRole === "BUYER" ? "USER" : defaultRole ?? "USER");
  const [city, setCity] = useState("Kochi");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function saveRole() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role,
        city,
        phone
      })
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not save your profile.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-5xl p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <p className="mt-6 text-sm font-semibold text-violet-700">
        Account setup
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
        Choose how you want to use HomeZone.
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
        This helps HomeZone personalize your dashboard, actions, and AI
        guidance. You can change this later.
      </p>
      {email ? (
        <p className="mt-4 rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">
          Signed in as {email}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {roles.map((item) => {
          const RoleIcon = item.icon;
          const active = role === item.value;
          return (
            <button
              className={`rounded-[1.5rem] border bg-white p-5 text-left transition hover:-translate-y-1 hover:shadow-soft ${
                active ? "border-violet-300 ring-4 ring-violet-100" : "border-border"
              }`}
              key={item.value}
              onClick={() => setRole(item.value)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <RoleIcon className="h-5 w-5" />
                </span>
                {active ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : null}
              </div>
              <h2 className="mt-5 text-lg font-bold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold">City</span>
          <input
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => setCity(event.target.value)}
            value={city}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">WhatsApp number</span>
          <input
            className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+91 98765 43210"
            value={phone}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <Button className="mt-7 w-full sm:w-auto" disabled={loading} onClick={saveRole} size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continue to Dashboard
      </Button>
    </Card>
  );
}
