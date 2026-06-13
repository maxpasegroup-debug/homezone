"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AuthForm() {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("demo@homezone.ai");
  const [password, setPassword] = useState("HomeZone@123");
  const [status, setStatus] = useState("");

  async function sendOtp() {
    if (mode === "email") {
      setStatus(
        `Email login for ${email} is ready to connect through Auth.js email provider. Use Google now, or add SMTP variables for magic links.`
      );
      return;
    }

    setStatus(
      `WhatsApp OTP request prepared for ${phone}. Connect WHATSAPP_OTP_PROVIDER and WHATSAPP_OTP_API_KEY to send real OTP messages.`
    );
  }

  async function loginWithGoogle() {
    await signIn("google", {
      callbackUrl: "/dashboard"
    });
  }

  async function loginWithDemo() {
    setStatus("Signing in with demo account...");
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard"
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

      <div className="mt-7 rounded-[1.5rem] border border-violet-100 bg-violet-50 p-5">
        <p className="text-sm font-bold text-violet-700">
          Demo dashboard login
        </p>
        <div className="mt-4 grid gap-3">
          <input
            className="h-12 rounded-2xl border border-violet-100 bg-white px-4 text-sm font-semibold outline-none"
            onChange={(event) => setEmail(event.target.value)}
            value={email}
          />
          <input
            className="h-12 rounded-2xl border border-violet-100 bg-white px-4 text-sm font-semibold outline-none"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <Button onClick={loginWithDemo}>
            Login with Demo Account
          </Button>
        </div>
      </div>

      {status ? (
        <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-semibold text-violet-700">
          {status}
        </p>
      ) : null}
    </Card>
  );
}
