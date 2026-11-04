"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPublicPropertyRefresh } from "@/lib/properties/public-live-refresh";

/** Mounted only in public property views and the server-confirmed Buyer dashboard. */
export function PropertyLiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const updates = createPublicPropertyRefresh({
      origin: window.location.origin,
      connect: url => new WebSocket(url),
      refresh: () => router.refresh()
    });
    const visibility = () => updates.setVisible(document.visibilityState === "visible");
    const suspended = () => updates.setVisible(false);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", suspended);
    window.addEventListener("pageshow", visibility);
    visibility();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", suspended);
      window.removeEventListener("pageshow", visibility);
      updates.dispose();
    };
  }, [router, pathname]);
  return null;
}
