"use client";

import { useState } from "react";
import type { PaymentProduct, StudioOrderStatus } from "@prisma/client";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { PaymentButton } from "@/components/payments/payment-button";
import { Button } from "@/components/ui/button";

export function StudioCustomerActions({
  city,
  orderId,
  paymentStatus,
  product,
  status
}: {
  city?: string | null;
  orderId: string;
  paymentStatus: string;
  product: PaymentProduct;
  status: StudioOrderStatus;
}) {
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState("");

  async function postAction(action: "approve" | "cancel", body: Record<string, unknown> = {}) {
    setLoading(action);
    setMessage("");
    const response = await fetch(`/api/studio-requests/${orderId}`, {
      body: JSON.stringify({ action, ...body }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    });
    setLoading("");
    setMessage(response.ok ? "Order updated successfully. Refreshing..." : "Could not update this Studio order.");
    if (response.ok) window.location.reload();
  }

  async function requestRevision() {
    if (revision.trim().length < 3) {
      setMessage("Please add clear revision comments.");
      return;
    }

    setLoading("revision");
    setMessage("");
    const response = await fetch(`/api/studio-requests/${orderId}/revisions`, {
      body: JSON.stringify({ comments: revision }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    setLoading("");
    setMessage(response.ok ? "Revision requested. Refreshing..." : "Could not request revision.");
    if (response.ok) window.location.reload();
  }

  const canCancel = !["IN_PRODUCTION", "QUALITY_CHECK", "DELIVERED", "CUSTOMER_APPROVED", "COMPLETED", "CANCELLED"].includes(status);
  const canApprove = status === "DELIVERED" || status === "CUSTOMER_APPROVED";

  return (
    <div className="space-y-5">
      {paymentStatus !== "PAID" && status !== "DRAFT" ? (
        <div className="rounded-[1.5rem] border bg-white p-5">
          <p className="font-bold">Complete payment</p>
          <p className="mt-1 text-sm text-muted-foreground">Payment starts assignment and production.</p>
          <div className="mt-4">
            <PaymentButton city={city ?? undefined} label="Pay Now" product={product} studioRequestId={orderId} />
          </div>
        </div>
      ) : null}

      {canApprove ? (
        <div className="rounded-[1.5rem] border bg-white p-5">
          <p className="font-bold">Approve delivery</p>
          <p className="mt-1 text-sm text-muted-foreground">Approve once the delivered photos, videos, or creatives are final.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm font-semibold">
              Rating
              <select
                className="ml-3 h-10 rounded-xl border px-3"
                onChange={(event) => setRating(Number(event.target.value))}
                value={rating}
              >
                {[5, 4, 3, 2, 1].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <Button disabled={loading === "approve"} onClick={() => postAction("approve", { customerRating: rating })}>
              <CheckCircle2 className="h-4 w-4" />
              Approve Final Delivery
            </Button>
          </div>
        </div>
      ) : null}

      {status === "DELIVERED" || status === "REVISION_REQUESTED" ? (
        <div className="rounded-[1.5rem] border bg-white p-5">
          <p className="font-bold">Request revision</p>
          <textarea
            className="mt-3 min-h-28 w-full rounded-2xl border bg-white p-4 text-sm outline-none"
            onChange={(event) => setRevision(event.target.value)}
            placeholder="Tell the Studio team exactly what should change."
            value={revision}
          />
          <Button className="mt-3" disabled={loading === "revision"} onClick={requestRevision} variant="outline">
            <RotateCcw className="h-4 w-4" />
            Send Revision Request
          </Button>
        </div>
      ) : null}

      {canCancel ? (
        <Button disabled={loading === "cancel"} onClick={() => postAction("cancel")} variant="outline">
          <XCircle className="h-4 w-4" />
          Cancel Before Production
        </Button>
      ) : null}

      {message ? <p className="rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-700">{message}</p> : null}
    </div>
  );
}
