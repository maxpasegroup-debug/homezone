"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeadStageButton({
  leadId,
  stage
}: {
  leadId: string;
  stage: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function move() {
    setLoading(true);
    await fetch(`/api/leads/${leadId}`, {
      body: JSON.stringify({ stage }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button onClick={move} size="sm" variant="outline">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Move
    </Button>
  );
}
