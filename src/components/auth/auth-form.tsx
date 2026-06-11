"use client";

import { useState } from "react";
import { Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function sendOtp() {
    setStatus("Sending verification link...");
    const supabase = createClient();

    if (mode === "email") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      setStatus(error ? error.message : "Check your email for the login link.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone
    });
    setStatus(
      error
        ? error.message
        : "OTP sent. Supabase phone auth can be wired to SMS now and WhatsApp provider next."
    );
  }

  async function loginWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
  }

  return (
    <Card className="mx-auto max-w-xl p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        Verify your HomeZone account
      </h1>
      <p className="mt-3 leading-7 text-muted-foreground">
        Browse freely. Contacting, saving, listing, dashboards, Studio,
        services, and Pro tools require a verified account.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
        <button
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            mode === "phone" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => setMode("phone")}
        >
          WhatsApp / Mobile
        </button>
        <button
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            mode === "email" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => setMode("email")}
        >
          Email
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {mode === "phone" ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Phone number</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-white px-4">
              <Phone className="h-5 w-5 text-violet-700" />
              <input
                className="w-full bg-transparent font-semibold outline-none"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91 98765 43210"
                value={phone}
              />
            </div>
          </label>
        ) : (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Email address</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-white px-4">
              <Mail className="h-5 w-5 text-violet-700" />
              <input
                className="w-full bg-transparent font-semibold outline-none"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </div>
          </label>
        )}

        <Button className="w-full" onClick={sendOtp} size="lg">
          <MessageCircle className="h-4 w-4" />
          Send OTP
        </Button>
        <Button className="w-full" onClick={loginWithGoogle} size="lg" variant="outline">
          Continue with Google
        </Button>
      </div>

      {status ? (
        <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-semibold text-violet-700">
          {status}
        </p>
      ) : null}
    </Card>
  );
}
