"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      onClick={() =>
        signOut({
          callbackUrl: "/"
        })
      }
      size="icon"
      title="Logout"
      variant="ghost"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
