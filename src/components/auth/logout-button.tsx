"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  callbackUrl = "/",
  label,
  variant = "ghost"
}: {
  callbackUrl?: string;
  label?: string;
  variant?: "default" | "ghost" | "outline";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setLoading(true);
    setError("");
    try {
      const result = await signOut({ callbackUrl, redirect: false }) as { url?: string; error?: string };
      if (result.error || !result.url) {
        setError("Could not sign out securely. Please retry.");
        return;
      }
      const destination = new URL(result.url, window.location.origin);
      window.location.href = destination.origin === window.location.origin ? destination.href : "/";
    } catch {
      setError("Could not sign out securely. Please retry.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <span>
      <Button
        onClick={logout}
        disabled={loading}
        size={label ? "sm" : "icon"}
        title="Logout"
        variant={variant}
      >
        <LogOut className="h-4 w-4" />
        {label ? <span>{label}</span> : null}
      </Button>
      {error && <span className="block text-xs text-red-700" role="alert">{error}</span>}
    </span>
  );
}
