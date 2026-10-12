import Link from "next/link";
import type { Route } from "next";
import type { Prisma } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { buyerEnquirySelect } from "@/lib/leads/access";

type Enquiry = Prisma.LeadGetPayload<{ select: typeof buyerEnquirySelect }>;

// Receives only the buyer projection; internal CRM relations cannot be rendered.
export function BuyerEnquiries({ enquiries }: { enquiries: Enquiry[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Your enquiries</h2>
      <p className="text-sm text-muted-foreground">Track your submitted enquiries and their current status.</p>
      {enquiries.map((enquiry) => (
        <Card className="p-5" key={enquiry.id}>
          <Link className="font-bold text-violet-700" href={`/dashboard/leads/${enquiry.id}` as Route}>
            {enquiry.property?.title ?? "Property enquiry"}
          </Link>
          <p className="mt-2 text-sm font-semibold">{enquiry.stage.replaceAll("_", " ")}</p>
          <p className="mt-2 text-sm">{enquiry.message}</p>
          <p className="mt-2 text-sm text-muted-foreground">{enquiry.name} {enquiry.phone}</p>
          <p className="mt-2 text-xs text-muted-foreground">Submitted {enquiry.createdAt.toLocaleDateString("en-IN")}</p>
        </Card>
      ))}
      {!enquiries.length && <Card className="p-5">No enquiries yet.</Card>}
    </section>
  );
}
