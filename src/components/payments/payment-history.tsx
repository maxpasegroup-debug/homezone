import { Card } from "@/components/ui/card";
import { formatAmountPaise } from "@/lib/payments/catalog";

type PaymentHistoryItem = {
  amount: number;
  createdAt: Date;
  currency: string;
  invoiceNumber: string;
  product: string;
  status: string;
};

export function PaymentHistory({
  payments
}: {
  payments: PaymentHistoryItem[];
}) {
  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div className="rounded-2xl bg-muted p-4" key={payment.invoiceNumber}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-violet-700">
                {payment.product.replaceAll("_", " ")}
              </p>
              <h3 className="mt-1 font-bold">{payment.invoiceNumber}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {payment.createdAt.toLocaleDateString("en-IN")}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-bold">
                {formatAmountPaise(payment.amount)}
              </p>
              <p className="text-xs font-bold text-muted-foreground">
                {payment.status}
              </p>
            </div>
          </div>
        </div>
      ))}
      {!payments.length ? (
        <Card className="p-5 text-sm font-semibold text-muted-foreground">
          No payments yet.
        </Card>
      ) : null}
    </div>
  );
}
