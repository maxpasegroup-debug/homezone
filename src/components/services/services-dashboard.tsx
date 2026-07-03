"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, IndianRupee, MessageSquareQuote, Star, Wrench } from "lucide-react";
import { PaymentButton } from "@/components/payments/payment-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type ServicesDashboardData = {
  providerDashboard: null | {
    analytics: {
      activeJobs: number;
      averageRating: number;
      completedJobs: number;
      conversionRate: number;
      pendingPayments: number;
      quoteRequests: number;
      repeatCustomers: number;
      revenue: number;
      reviews: number;
    };
    provider: {
      businessName: string;
      category: string;
      city: string | null;
      verified: boolean;
    };
    quoteRequests: {
      budget: string | null;
      category: string;
      city: string;
      id: string;
      message: string | null;
    }[];
  };
  providerExists: boolean;
  requests: {
    budget: string | null;
    booking: null | {
      id: string;
      status: string;
      amount: number;
      providerName: string;
    };
    category: string;
    city: string;
    id: string;
    message: string | null;
    quotes: {
      amount: number;
      id: string;
      message: string;
      providerName: string;
      revision: number;
      status: string;
    }[];
    status: string;
  }[];
};

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(value);
}

export function ServicesDashboard({ data }: { data: ServicesDashboardData }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("25000");

  async function sendQuote(requestId: string) {
    setLoading(`quote-${requestId}`);
    await fetch("/api/service-quotes", {
      body: JSON.stringify({ amount: Number(quoteAmount), currency: "INR", message: "We can complete this service with verified HomeZone workflow.", requestId }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setLoading("");
    router.refresh();
  }

  async function acceptQuote(quoteId: string) {
    setLoading(`accept-${quoteId}`);
    await fetch(`/api/service-quotes/${quoteId}`, {
      body: JSON.stringify({ action: "ACCEPT" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading("");
    router.refresh();
  }

  async function bookingAction(bookingId: string, action: "START" | "COMPLETE" | "CANCEL") {
    setLoading(`${action}-${bookingId}`);
    await fetch(`/api/service-bookings/${bookingId}`, {
      body: JSON.stringify({ action }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setLoading("");
    router.refresh();
  }

  async function review(bookingId: string) {
    const comment = window.prompt("Review comment", "Excellent service and professional execution.");
    setLoading(`review-${bookingId}`);
    const response = await fetch(`/api/service-bookings/${bookingId}/reviews`, {
      body: JSON.stringify({ comment, rating: 5 }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setLoading("");
    setMessage(response.ok ? "Review submitted." : "Review can be submitted only after completed booking.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {message ? <p className="rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-700">{message}</p> : null}

      {data.providerDashboard ? (
        <section className="space-y-5">
          <Card className="p-6 shadow-soft sm:p-8">
            <p className="text-sm font-bold text-violet-700">Provider Dashboard</p>
            <h2 className="mt-2 text-4xl font-bold">{data.providerDashboard.provider.businessName}</h2>
            <p className="mt-2 text-muted-foreground">
              {data.providerDashboard.provider.category} / {data.providerDashboard.provider.city ?? "Service areas pending"} / {data.providerDashboard.provider.verified ? "Verified" : "Pending verification"}
            </p>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={MessageSquareQuote} label="New Quote Requests" value={data.providerDashboard.analytics.quoteRequests} />
            <Metric icon={Wrench} label="Active Jobs" value={data.providerDashboard.analytics.activeJobs} />
            <Metric icon={CheckCircle2} label="Completed Jobs" value={data.providerDashboard.analytics.completedJobs} />
            <Metric icon={IndianRupee} label="Revenue" value={rupees(data.providerDashboard.analytics.revenue)} />
            <Metric icon={IndianRupee} label="Pending Payments" value={rupees(data.providerDashboard.analytics.pendingPayments)} />
            <Metric icon={Star} label="Average Rating" value={data.providerDashboard.analytics.averageRating.toFixed(1)} />
            <Metric icon={CalendarDays} label="Conversion" value={`${data.providerDashboard.analytics.conversionRate}%`} />
            <Metric icon={Star} label="Reviews" value={data.providerDashboard.analytics.reviews} />
          </div>
          <Card className="p-6 shadow-sm">
            <p className="text-sm font-bold text-violet-700">Quote Requests</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {data.providerDashboard.quoteRequests.map((request) => (
                <div className="rounded-[1.5rem] border bg-white p-5" key={request.id}>
                  <h3 className="text-xl font-bold">{request.category}</h3>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">{request.city} / {request.budget ?? "Budget open"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{request.message}</p>
                  <div className="mt-4 flex gap-2">
                    <input className="h-10 w-32 rounded-xl border px-3 text-sm" onChange={(event) => setQuoteAmount(event.target.value)} value={quoteAmount} />
                    <Button disabled={loading === `quote-${request.id}`} onClick={() => sendQuote(request.id)} size="sm">Send Quote</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      <Card className="p-6 shadow-sm">
        <p className="text-sm font-bold text-violet-700">Customer Service Requests</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {data.requests.map((request) => (
            <div className="rounded-[1.5rem] border bg-white p-5" key={request.id}>
              <p className="text-xs font-bold text-violet-700">{request.status}</p>
              <h3 className="mt-2 text-2xl font-bold">{request.category}</h3>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{request.city} / {request.budget ?? "Budget open"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{request.message}</p>
              <div className="mt-4 space-y-3">
                {request.quotes.map((quote) => (
                  <div className="rounded-2xl bg-muted p-4" key={quote.id}>
                    <p className="font-bold">{quote.providerName} / {rupees(quote.amount)}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">Revision {quote.revision} / {quote.status}</p>
                    <Button className="mt-3" disabled={quote.status === "accepted"} onClick={() => acceptQuote(quote.id)} size="sm" variant="outline">Accept Quote</Button>
                  </div>
                ))}
              </div>
              {request.booking ? (
                <div className="mt-4 rounded-2xl border bg-white p-4">
                  <p className="font-bold">Booking: {request.booking.status}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{request.booking.providerName} / {rupees(request.booking.amount)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PaymentButton label="Pay Deposit" product="SERVICE_BOOKING_DEPOSIT" serviceBookingId={request.booking.id} variant="outline" />
                    <PaymentButton label="Final Payment" product="SERVICE_FINAL_PAYMENT" serviceBookingId={request.booking.id} variant="outline" />
                    <Button onClick={() => bookingAction(request.booking!.id, "START")} size="sm" variant="outline">Start</Button>
                    <Button onClick={() => bookingAction(request.booking!.id, "COMPLETE")} size="sm" variant="outline">Complete</Button>
                    <Button onClick={() => review(request.booking!.id)} size="sm">Review</Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {!data.requests.length ? <p className="rounded-[1.5rem] border border-dashed p-6 text-center text-sm font-semibold text-muted-foreground">No service requests yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Wrench; label: string; value: number | string }) {
  return (
    <Card className="p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Icon className="h-5 w-5" /></span>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}
