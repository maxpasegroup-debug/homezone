"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { registrationChallenge, registrationRetry } from "@/lib/auth/registration-feedback";
import { passwordSignUpSchema } from "@/lib/api/validation";

const registrationSchema = passwordSignUpSchema.extend({
  email: z.string().trim().toLowerCase().max(254).email(),
  name: z.string().trim().min(2).max(120)
});

type AuthFlow = "forgot" | "reset" | "signin" | "signup" | "verify";

type AuthFormProps = {
  authError?: string;
  callbackUrl?: string;
  initialFlow?: AuthFlow;
  resetToken?: string;
};

function passwordHelp(password: string) {
  if (!password) return "";
  if (password.length > 128) return "Use no more than 128 characters.";
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
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const [retryUnknown, setRetryUnknown] = useState(false);
  const [now, setNow] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const help = flow === "signup" || flow === "reset" ? passwordHelp(password) : "";
  const registration = registrationSchema.safeParse({ email, name, password });
  const registrationHelp = flow === "signup" && !registration.success
    ? registration.error.issues.find((issue) =>
        issue.path[0] === "name" ? name.length > 0 : issue.path[0] === "email" && email.length > 0)?.message
    : undefined;
  function rateLimit(response: Response) {
    const deadline = registrationRetry(response.headers.get("Retry-After"));
    if (deadline === null) {
      setRetryUnknown(true);
      setStatus("Too many attempts. The wait time could not be confirmed. Please try later.");
    } else {
      setRetryAt((previous) => Math.max(previous, deadline));
      setResendAt((previous) => Math.max(previous, deadline));
      setStatus("Too many attempts. Wait for the server retry timer before trying again.");
    }
  }
  function acceptChallenge(data: unknown) {
    const challenge = registrationChallenge(data);
    if (!challenge) return false;
    setChallengeId(challenge.challengeId);
    setExpiresAt(challenge.expiresAt);
    setResendAt(challenge.resendAt);
    setCode("");
    return true;
  }

  async function signInWithPassword(targetEmail = email, targetPassword = password) {
    const result = await signIn("password", {
      callbackUrl,
      email: targetEmail.trim().toLowerCase(),
      password: targetPassword,
      redirect: false
    });

    if (!result || result.error || !result.ok) {
      setStatus("Invalid email or password.");
      return;
    }

    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await sessionResponse.json().catch(() => null);
    if (!sessionResponse.ok || typeof session?.user?.id !== "string" ||
        !session.user.id || !Number.isFinite(Date.parse(session.expires)) || Date.parse(session.expires) <= Date.now()) {
      setStatus("Unable to verify your session. Please sign in again.");
      return;
    }
    setPassword("");

    // The server validates callbacks; also constrain browser navigation to this origin.
    try {
      const destination = new URL(result?.url ?? "/", window.location.origin);
      window.location.href = destination.origin === window.location.origin &&
        !destination.username && !destination.password ? destination.href : "/";
    } catch {
      window.location.href = "/";
    }
  }

  async function handleSignIn() {
    setLoading(true);
    setStatus("");
    await signInWithPassword();
    setLoading(false);
  }

  async function handleSignUp() {
    if (retryUnknown || Date.now() < retryAt) return;
    if (!registration.success) {
      setStatus(registration.error.issues[0]?.message ?? "Check your registration details.");
      return;
    }
    setLoading(true);
    setStatus("");
    const response = await fetch("/api/auth/password/signup", {
      body: JSON.stringify(registration.data),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 429) { rateLimit(response); setLoading(false); return; }
      setStatus(data?.error ?? "Could not create your account.");
      setLoading(false);
      return;
    }

    if (!acceptChallenge(data)) {
      setStatus("Registration could not be confirmed. Please retry.");
      setLoading(false);
      return;
    }
    setEmailVerified(false);
    setStatus("Check your email for a six-digit code, valid for 10 minutes. Existing accounts can use sign-in or recovery.");
    setFlow("verify");
    setLoading(false);
  }

  async function handleVerify() {
    if (retryUnknown || Date.now() < retryAt || (!emailVerified && Date.now() >= expiresAt)) return;
    setLoading(true);
    if (!emailVerified) {
      const response = await fetch("/api/auth/password/signup/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId, code }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.verified !== true) {
        if (response.status === 429) rateLimit(response);
        else setStatus("Code incorrect, expired or exhausted. Request a new code after the cooldown, or restart registration.");
        setLoading(false);
        return;
      }
      setEmailVerified(true);
      setCode("");
    }
    await signInWithPassword();
    setLoading(false);
  }
  async function handleResend() {
    if (loading || retryUnknown || Date.now() < retryAt || Date.now() < resendAt || Date.now() >= expiresAt) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password/signup/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId }) });
      const data = await response.json().catch(() => null);
      if (response.status === 429) { rateLimit(response); return; }
      if (!response.ok || !acceptChallenge(data)) {
        setStatus("Code delivery could not be confirmed. Restart registration; an old challenge is not restored.");
        return;
      }
      setStatus("A new code was accepted for delivery. Use the newest code; the previous challenge is invalid.");
    } catch { setStatus("Unable to connect. Please try again."); }
    finally { setLoading(false); }
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
    setStatus(response.ok
      ? data?.message ?? "If an account exists and delivery is available, you will receive password reset instructions."
      : data?.error ?? "Could not request password recovery. Please retry.");
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
    flow === "verify" ? handleVerify : flow === "signup"
      ? handleSignUp
      : flow === "forgot"
        ? handleForgotPassword
        : flow === "reset"
          ? handleResetPassword
          : handleSignIn;
  const primaryLabel =
    flow === "verify" ? (emailVerified ? "Retry secure sign-in" : "Verify and continue") : flow === "signup"
      ? "Create Account"
      : flow === "forgot"
        ? "Send Reset Link"
        : flow === "reset"
          ? "Reset Password"
          : "Sign In";
  const passwordVisible = flow !== "forgot" && flow !== "verify";
  const canSubmit =
    flow === "verify" ? (emailVerified || /^\d{6}$/.test(code)) : flow === "forgot"
      ? Boolean(email)
      : flow === "reset"
        ? Boolean(resetToken && password && !help)
        : flow === "signup"
          ? registration.success
          : Boolean(email.trim() && password);

  return (
    <Card className="mx-auto max-w-xl p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <ShieldCheck className="h-7 w-7" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
        <button
          disabled={loading}
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            flow === "signin" || flow === "forgot" || flow === "reset" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => {
            setFlow("signin");
            setPassword(""); setCode(""); setChallengeId(""); setEmailVerified(false);
            setStatus("");
          }}
        >
          Sign in
        </button>
        <button
          disabled={loading}
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            flow === "signup" ? "bg-white text-violet-700 shadow-sm" : ""
          }`}
          onClick={() => {
            setFlow("signup");
            setPassword(""); setCode(""); setChallengeId(""); setEmailVerified(false);
            setStatus("");
          }}
        >
          Sign up
        </button>
      </div>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        {flow === "verify" ? "Verify your email" : flow === "signup"
          ? "Create your HomeZone account"
          : flow === "forgot"
            ? "Reset your password"
            : flow === "reset"
              ? "Create a new password"
              : "Sign in to HomeZone"}
      </h1>
      <p className="mt-3 leading-7 text-muted-foreground">
        {flow === "verify" ? "Enter the code from your HOMEZONE email. Profile completion can wait until later." : flow === "signup"
          ? "Save properties, contact owners, publish listings, and access your dashboard."
          : flow === "forgot"
            ? "Enter your email and HomeZone will send a secure password reset link."
            : flow === "reset"
              ? "Choose a strong password to continue using your HomeZone account."
              : "Access your saved properties, listings, inquiries, AI tools, Studio, services, and Pro dashboards."}
      </p>

      <div className="mt-7 space-y-4">
        {flow === "verify" && !emailVerified ? <>
          <label className="block space-y-2"><span>Verification code</span><input aria-label="Verification code" className="w-full rounded-2xl border p-4" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} disabled={loading} /></label>
          <p>{now >= expiresAt ? "Code expired. Restart registration." : "Use the newest code before it expires. The server enforces expiry and attempts."}</p>
          <button type="button" disabled={loading || retryUnknown || now < retryAt || now < resendAt || now >= expiresAt} onClick={handleResend}>Resend code {now < resendAt ? `in ${Math.ceil((resendAt - now) / 1000)}s` : ""}</button>
        </> : null}
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

        {flow !== "reset" && flow !== "verify" ? (
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
          disabled={!canSubmit || loading || ((flow === "signup" || flow === "verify") &&
            (retryUnknown || now < retryAt || (flow === "verify" && !emailVerified && now >= expiresAt)))}
          onClick={async () => {
            if (loading || !canSubmit) return;
            try { await primaryAction(); }
            catch { setStatus("Unable to complete the request. Please retry."); }
            finally { setLoading(false); }
          }}
          size="lg"
        >
          {loading ? "Please wait..." : primaryLabel}
        </Button>
      </div>

      {registrationHelp ? (
        <p className="mt-3 text-sm font-semibold text-amber-700">{registrationHelp}</p>
      ) : null}
      {status ? (
        <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-semibold text-violet-700">
          {status}
        </p>
      ) : null}
      {(flow === "signup" || flow === "verify") && now < retryAt ?
        <p role="status">Try again in {Math.ceil((retryAt - now) / 1000)}s</p> : null}
    </Card>
  );
}
