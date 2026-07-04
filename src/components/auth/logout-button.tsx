"use client";

import { signOut } from "next-auth/react";
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
  return (
    <Button
      onClick={() =>
        signOut({
          callbackUrl
        })
      }
      size={label ? "sm" : "icon"}
      title="Logout"
      variant={variant}
    >
      <LogOut className="h-4 w-4" />
      {label ? <span>{label}</span> : null}
    </Button>
  );
}
