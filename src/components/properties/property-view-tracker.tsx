"use client";

import { useEffect } from "react";

export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/properties/${propertyId}/view`, {
      method: "POST",
      signal: controller.signal
    }).catch(() => {
      // View tracking should never interrupt property browsing.
    });

    return () => controller.abort();
  }, [propertyId]);

  return null;
}
