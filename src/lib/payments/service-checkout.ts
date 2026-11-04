import type { Payment, PaymentProduct, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createInvoiceNumber, getPaymentProduct } from "@/lib/payments/catalog";
import { invoiceMetadata } from "@/lib/payments/service";

const serviceProducts = ["SERVICE_BOOKING_DEPOSIT", "SERVICE_FINAL_PAYMENT"] as const;
export function isServicePayment(product: PaymentProduct) {
  return serviceProducts.some(value => value === product);
}

// Bookings/quotes store major currency units; Payment and Razorpay store minor
// units. Reject unsupported precision rather than silently rounding a charge.
export function serviceAmountInPaise(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= 2_147_483_647 ? amount : null;
}

type Actor = { id: string; role: string };
type CheckoutError = { error: string; status: 403 | 409 };
type ReservedPayment = Pick<Payment, "id" | "amount" | "currency" | "status" | "product" | "payerId" |
  "description" | "invoiceNumber" | "razorpayOrderId">;

export async function reserveServicePayment({ bookingId, product, actor }: {
  bookingId: string; product: PaymentProduct; actor: Actor;
}): Promise<CheckoutError | { payment: ReservedPayment; reuse: boolean }> {
  return db.$transaction(async tx => {
    // Keep role/suspension admission stable through reservation. SHARE permits
    // audit foreign-key reads while preventing a concurrent account downgrade.
    await tx.$queryRaw`SELECT id FROM "Profile" WHERE id = ${actor.id} FOR SHARE`;
    const currentActor = await tx.profile.findUnique({
      where: { id: actor.id }, select: { role: true, verificationStatus: true }
    });
    if (!currentActor || currentActor.role !== actor.role || currentActor.verificationStatus === "SUSPENDED") {
      return { error: "Your account changed. Sign in again before making a payment.", status: 403 } satisfies CheckoutError;
    }
    // Serializes deposits/final checkouts across all application instances.
    // Never hold this lock across an external payment-provider request.
    await tx.$queryRaw`SELECT id FROM "ServiceBooking" WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.serviceBooking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, amount: true, depositAmount: true, currency: true, status: true }
    });
    if (!booking || (booking.customerId !== actor.id && !["ADMIN", "SUPER_ADMIN"].includes(currentActor.role))) {
      return { error: "You can only pay for your own service bookings", status: 403 } satisfies CheckoutError;
    }
    const total = serviceAmountInPaise(booking.amount), deposit = serviceAmountInPaise(booking.depositAmount);
    if (booking.currency !== "INR" || total === null || total <= 0 || deposit === null || deposit > total) {
      return { error: "Booking payment details need review before payment", status: 409 } satisfies CheckoutError;
    }
    const isDeposit = product === "SERVICE_BOOKING_DEPOSIT";
    if (!isServicePayment(product) || (isDeposit ? booking.status !== "UPCOMING" : !["IN_PROGRESS", "COMPLETED"].includes(booking.status))) {
      return { error: "This payment is not available at the current booking stage", status: 409 } satisfies CheckoutError;
    }
    const payments = await tx.payment.findMany({
      where: { serviceBookingId: bookingId, product: { in: [...serviceProducts] } },
      select: { id: true, amount: true, currency: true, status: true, product: true, payerId: true,
        description: true, invoiceNumber: true, razorpayOrderId: true }
    });
    // Refunds and failed/uncertain provider orders need reconciliation. Creating
    // another payable order here can race a delayed capture of the first order.
    if (payments.some(payment => ["REFUNDED", "FAILED"].includes(payment.status) ||
      (payment.status === "CANCELLED" && payment.razorpayOrderId))) {
      return { error: "A previous payment needs review before another payment", status: 409 } satisfies CheckoutError;
    }
    const paid = payments.filter(payment => payment.status === "PAID");
    if (paid.some(payment => payment.currency !== booking.currency || !Number.isInteger(payment.amount) || payment.amount <= 0)) {
      return { error: "Booking payments need review before another payment", status: 409 } satisfies CheckoutError;
    }
    const paidAmount = paid.reduce((sum, payment) => sum + payment.amount, 0);
    const amount = (isDeposit ? deposit : total) - paidAmount;
    if (!Number.isSafeInteger(paidAmount) || paidAmount > total || amount <= 0 || (!isDeposit && paidAmount < deposit)) {
      return { error: "No payment is due for this stage, or the deposit must be paid first", status: 409 } satisfies CheckoutError;
    }
    const active = payments.filter(payment => ["CREATED", "PENDING"].includes(payment.status));
    if (active.length) {
      const previous = active[0];
      if (active.length === 1 && previous.status === "PENDING" && previous.razorpayOrderId &&
        previous.product === product && previous.payerId === actor.id && previous.amount === amount && previous.currency === booking.currency) {
        return { payment: previous, reuse: true } as const;
      }
      return { error: "A payment is already being prepared or needs confirmation. Check Payments before trying again.", status: 409 } satisfies CheckoutError;
    }
    const config = getPaymentProduct(product);
    const payment = await tx.payment.create({ data: {
      amount, currency: booking.currency, product, payerId: actor.id, serviceBookingId: bookingId,
      description: config.description, status: "CREATED", invoiceNumber: createInvoiceNumber(),
      invoiceMetadata: invoiceMetadata({ amount, currency: booking.currency, product }) as Prisma.InputJsonValue
    } });
    return { payment, reuse: false } as const;
  });
}
