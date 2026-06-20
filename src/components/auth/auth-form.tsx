"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AuthFormProps = {
  authError?: string;
  emailEnabled: boolean;
  googleEnabled: boolean;
  initialFlow?: "signin" | "signup";
};

export function AuthForm({
  authError,
  emailEnabled,
  googleEnabled,
  initialFlow = "signin"
}: AuthFormProps) {
  const [flow, setFlow] = useState<"signin" | "signup">(initialFlow);
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const demoLoginVisible = process.env.NODE_ENV !== "production";
  const [email, setEmail] = useState(demoLoginVisible ? "demo@homezone.ai" : "");
  const [password, setPassword] = useState(demoLoginVisible ? "HomeZone@123" : "");
  const [status, setStatus] = useState(authError ?? "");

  async function sendOtp() {
    if (mode === "email") {
      if (!emailEnabled) {
        setStatus(
          "Email magic-link sign in needs SMTP variables in Railway. Please use Google or contact HomeZone support."
        );
        return;
      }

      setStatus(`Sending a secure sign-in link to ${email}...`);
      const result = await signIn("nodemailer", {
        callbackUrl: "/onboarding",
        email,
        redirect: false
      });

      if (result?.error) {
        setStatus("Could not send the sign-in link. Please try again later.");
        return;
      }

      setStatus(`Check ${email} for your secure HomeZone sign-in link.`);
      return;
    }

    const response = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone })
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(data?.error ?? "Could not send OTP.");
      return;
    }

    setStatus(
      data?.devCode
        ? `Development OTP for ${phone}: ${data.devCode}`
        : "OTP request recorded. Connect a WhatsApp/SMS provider to deliver codes."
    );
  }

  async function verifyOtp() {
    if (otpCode.trim().length === 4) {
      setStatus("Signing in with demo mobile OTP...");
      const result = await signIn("mobile-demo", {
        callbackUrl: "/onboarding",
        code: otpCode.trim(),
        phone,
        redirect: false
      });

      if (result?.error) {
        setStatus("Demo mobile login is not enabled or the OTP is invalid.");
        return;
      }

      window.location.href = result?.url ?? "/onboarding";
      return;
    }

    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: otpCode,
        phone
      })
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(data?.error ?? "Could not verify OTP.");
      return;
    }

    setStatus("Phone verified. Continue to onboarding.");
  }

  async function loginWithGoogle() {
    if (!googleEnabled) {
      setStatus("Google login is not configured yet. Please contact HomeZone support.");
      return;
    }

    await signIn("google", {
      callbackUrl: "/onboarding"
    });
  }

  async function loginWithDemo() {
    setStatus("Signing in with demo account...");
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/onboarding"
    });
  }

  return (
    <Card className="mx-auto max-w-xl p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
        <button
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            flow === "signin" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => setFlow("signin")}
        >
          Sign in
        </button>
        <button
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            flow === "signup" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => setFlow("signup")}
        >
          Sign up
        </button>
      </div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        {flow === "signup" ? "Create your HomeZone account" : "Sign in to HomeZone"}
      </h1>
      <p className="mt-3 leading-7 text-muted-foreground">
        {flow === "signup"
          ? "Create an account to save properties, contact owners, publish listings, and access your dashboard."
          : "Access your saved properties, listings, inquiries, dashboards, Studio, services, and Pro tools."}
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
          <div className="space-y-4">
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
            <label className="block space-y-2">
              <span className="text-sm font-semibold">OTP code</span>
              <input
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                inputMode="numeric"
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="6-digit code"
                value={otpCode}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
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
            {!emailEnabled ? (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Email magic-link login needs SMTP variables in Railway.
              </p>
            ) : null}
          </div>
        )}

        <Button
          className="w-full"
          disabled={mode === "email" && !emailEnabled}
          onClick={sendOtp}
          size="lg"
        >
          <MessageCircle className="h-4 w-4" />
          {mode === "email" ? "Send magic link" : "Send OTP"}
        </Button>
        {mode === "phone" ? (
          <Button className="w-full" onClick={verifyOtp} size="lg" variant="outline">
            Verify OTP
          </Button>
        ) : null}
        {googleEnabled ? (
          <Button className="w-full" onClick={loginWithGoogle} size="lg" variant="outline">
            {flow === "signup" ? "Sign up with Google" : "Continue with Google"}
          </Button>
        ) : (
          <Button className="w-full" disabled size="lg" variant="outline">
            Google login not configured
          </Button>
        )}
      </div>

      {demoLoginVisible ? (
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
      ) : null}

      {status ? (
        <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-semibold text-violet-700">
          {status}
        </p>
      ) : null}
    </Card>
  );
}
