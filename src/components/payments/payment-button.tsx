"use client";

import { useState } from "react";
import type { PaymentProduct } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckoutResponse = {
  amount: number;
  currency: string;
  description: string | null;
  keyId: string;
  orderId: string;
  product: PaymentProduct;
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  amount: number;
  currency: string;
  description?: string | null;
  handler: (response: RazorpaySuccess) => void;
  key: string;
  name: string;
  order_id: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentButton({
  city,
  label,
  notes,
  product,
  propertyId,
  studioRequestId,
  variant = "default"
}: {
  city?: string;
  label: string;
  notes?: string;
  product: PaymentProduct;
  propertyId?: string;
  studioRequestId?: string;
  variant?: "default" | "outline";
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function startCheckout() {
    setLoading(true);
    setStatus("");

    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded || !window.Razorpay) {
      setLoading(false);
      setStatus("Razorpay checkout could not load.");
      return;
    }

    const checkoutResponse = await fetch("/api/payments/checkout", {
      body: JSON.stringify({
        city,
        notes,
        product,
        propertyId,
        studioRequestId
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!checkoutResponse.ok) {
      const data = await checkoutResponse.json().catch(() => null);
      setLoading(false);
      setStatus(data?.error ?? "Unable to start payment.");
      return;
    }

    const checkout = (await checkoutResponse.json()) as CheckoutResponse;

    const razorpay = new window.Razorpay({
      amount: checkout.amount,
      currency: checkout.currency,
      description: checkout.description,
      handler: async (response) => {
        const verifyResponse = await fetch("/api/payments/verify", {
          body: JSON.stringify(response),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });

        setLoading(false);
        setStatus(
          verifyResponse.ok
            ? "Payment verified successfully."
            : "Payment verification failed."
        );
      },
      key: checkout.keyId,
      name: "HomeZone",
      order_id: checkout.orderId
    });

    razorpay.open();
  }

  return (
    <div className="space-y-2">
      <Button disabled={loading} onClick={startCheckout} size="sm" variant={variant}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
      {status ? (
        <p className="text-xs font-semibold text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}
