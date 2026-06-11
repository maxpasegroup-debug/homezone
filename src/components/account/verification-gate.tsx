import { LockKeyhole, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function VerificationGate({ action }: { action: string }) {
  return (
    <Card className="p-6 shadow-soft sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <LockKeyhole className="h-7 w-7" />
      </div>
      <h2 className="mt-6 text-3xl font-bold">Verify to {action}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
        HomeZone keeps browsing open, but important actions require a
        WhatsApp/mobile verified account for trust, lead quality, and safety.
      </p>
      <Button asChild className="mt-6" size="lg">
        <a href="/auth">
          <MessageCircle className="h-4 w-4" />
          Verify Account
        </a>
      </Button>
    </Card>
  );
}
