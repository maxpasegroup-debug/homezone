"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AuthFlow = "forgot" | "reset" | "signin" | "signup";

type AuthFormProps = {
  authError?: string;
  callbackUrl?: string;
  initialFlow?: AuthFlow;
  resetToken?: string;
};

function passwordHelp(password: string) {
  if (!password) return "";
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Add one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Add one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Add one number.";
  return "";
}

export function AuthForm({
  authError,
  callbackUrl = "/onboarding",
  initialFlow = "signin",
  resetToken
}: AuthFormProps) {
  const [flow, setFlow] = useState<AuthFlow>(initialFlow);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(authError ?? "");
  const [loading, setLoading] = useState(false);
  const help = passwordHelp(password);

  async function signInWithPassword(targetEmail = email, targetPassword = password) {
    const result = await signIn("password", {
      callbackUrl,
      email: targetEmail.trim().toLowerCase(),
      password: targetPassword,
      redirect: false
    });

    if (result?.error) {
      setStatus("Invalid email or password.");
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  async function handleSignIn() {
    setLoading(true);
    setStatus("");
    await signInWithPassword();
    setLoading(false);
  }

  async function handleSignUp() {
    setLoading(true);
    setStatus("");
    const response = await fetch("/api/auth/password/signup", {
      body: JSON.stringify({
        email,
        name,
        password
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(data?.error ?? "Could not create your account.");
      setLoading(false);
      return;
    }

    await signInWithPassword(email, password);
    setLoading(false);
  }

  async function handleForgotPassword() {
    setLoading(true);
    setStatus("");
    const response = await fetch("/api/auth/password/forgot", {
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setStatus(data?.message ?? "If an account exists for this email, a reset link has been sent.");
    setLoading(false);
  }

  async function handleResetPassword() {
    setLoading(true);
    setStatus("");
    const response = await fetch("/api/auth/password/reset", {
      body: JSON.stringify({
        password,
        token: resetToken
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(data?.error ?? "Could not reset your password.");
      setLoading(false);
      return;
    }

    setStatus("Password reset successfully. Sign in with your new password.");
    setPassword("");
    setFlow("signin");
    setLoading(false);
  }

  const primaryAction =
    flow === "signup"
      ? handleSignUp
      : flow === "forgot"
        ? handleForgotPassword
        : flow === "reset"
          ? handleResetPassword
          : handleSignIn;
  const primaryLabel =
    flow === "signup"
      ? "Create Account"
      : flow === "forgot"
        ? "Send Reset Link"
        : flow === "reset"
          ? "Reset Password"
          : "Sign In";
  const passwordVisible = flow !== "forgot";
  const canSubmit =
    flow === "forgot"
      ? Boolean(email)
      : flow === "reset"
        ? Boolean(resetToken && password && !help)
        : Boolean(email && password && !help);

  return (
    <Card className="mx-auto max-w-xl p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <ShieldCheck className="h-7 w-7" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
        <button
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            flow === "signin" || flow === "forgot" || flow === "reset" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => {
            setFlow("signin");
            setStatus("");
          }}
        >
          Sign in
        </button>
        <button
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            flow === "signup" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => {
            setFlow("signup");
            setStatus("");
          }}
        >
          Sign up
        </button>
      </div>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        {flow === "signup"
          ? "Create your HomeZone account"
          : flow === "forgot"
            ? "Reset your password"
            : flow === "reset"
              ? "Create a new password"
              : "Sign in to HomeZone"}
      </h1>
      <p className="mt-3 leading-7 text-muted-foreground">
        {flow === "signup"
          ? "Save properties, contact owners, publish listings, and access your dashboard."
          : flow === "forgot"
            ? "Enter your email and HomeZone will send a secure password reset link."
            : flow === "reset"
              ? "Choose a strong password to continue using your HomeZone account."
              : "Access your saved properties, listings, inquiries, AI tools, Studio, services, and Pro dashboards."}
      </p>

      <div className="mt-7 space-y-4">
        {flow === "signup" ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Name</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-white px-4">
              <UserRound className="h-5 w-5 text-violet-700" />
              <input
                className="w-full bg-transparent font-semibold outline-none"
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                value={name}
              />
            </div>
          </label>
        ) : null}

        {flow !== "reset" ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Email address</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-white px-4">
              <Mail className="h-5 w-5 text-violet-700" />
              <input
                autoComplete="email"
                className="w-full bg-transparent font-semibold outline-none"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </div>
          </label>
        ) : null}

        {passwordVisible ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Password</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-white px-4">
              <LockKeyhole className="h-5 w-5 text-violet-700" />
              <input
                autoComplete={flow === "signup" || flow === "reset" ? "new-password" : "current-password"}
                className="w-full bg-transparent font-semibold outline-none"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                className="text-muted-foreground"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {help ? (
              <p className="text-sm font-semibold text-amber-700">{help}</p>
            ) : null}
          </label>
        ) : null}

        {flow === "signin" ? (
          <button
            className="text-sm font-bold text-violet-700"
            onClick={() => {
              setFlow("forgot");
              setStatus("");
            }}
            type="button"
          >
            Forgot password?
          </button>
        ) : null}

        <Button
          className="w-full"
          disabled={!canSubmit || loading}
          onClick={primaryAction}
          size="lg"
        >
          {loading ? "Please wait..." : primaryLabel}
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
