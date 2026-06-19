import type { PaymentProduct, UserRole } from "@prisma/client";

export type PaymentProductConfig = {
  amount: number;
  currency: "INR";
  description: string;
  durationDays?: number;
  allowedRoles: UserRole[];
  requiresProperty?: boolean;
  createsStudioRequest?: boolean;
  subscription?: boolean;
};

export const paymentProducts: Record<PaymentProduct, PaymentProductConfig> = {
  FEATURED_LISTING: {
    allowedRoles: ["OWNER", "BROKER", "BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 199900,
    currency: "INR",
    description: "Featured listing placement for 30 days",
    durationDays: 30,
    requiresProperty: true
  },
  PREMIUM_LISTING: {
    allowedRoles: ["OWNER", "BROKER", "BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 499900,
    currency: "INR",
    description: "Premium listing placement for 30 days",
    durationDays: 30,
    requiresProperty: true
  },
  BROKER_MONTHLY: {
    allowedRoles: ["BROKER", "ADMIN", "SUPER_ADMIN"],
    amount: 199900,
    currency: "INR",
    description: "Broker monthly plan",
    durationDays: 30,
    subscription: true
  },
  BROKER_YEARLY: {
    allowedRoles: ["BROKER", "ADMIN", "SUPER_ADMIN"],
    amount: 1999900,
    currency: "INR",
    description: "Broker yearly plan",
    durationDays: 365,
    subscription: true
  },
  BUILDER_MONTHLY: {
    allowedRoles: ["BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 999900,
    currency: "INR",
    description: "Builder monthly plan",
    durationDays: 30,
    subscription: true
  },
  BUILDER_YEARLY: {
    allowedRoles: ["BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 9999900,
    currency: "INR",
    description: "Builder yearly plan",
    durationDays: 365,
    subscription: true
  },
  STUDIO_PHOTOGRAPHY: {
    allowedRoles: ["USER", "OWNER", "BROKER", "BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 299900,
    createsStudioRequest: true,
    currency: "INR",
    description: "Studio photography service"
  },
  STUDIO_VIDEOGRAPHY: {
    allowedRoles: ["USER", "OWNER", "BROKER", "BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 599900,
    createsStudioRequest: true,
    currency: "INR",
    description: "Studio videography service"
  },
  STUDIO_DRONE: {
    allowedRoles: ["USER", "OWNER", "BROKER", "BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 799900,
    createsStudioRequest: true,
    currency: "INR",
    description: "Studio drone shoot service"
  },
  STUDIO_REELS: {
    allowedRoles: ["USER", "OWNER", "BROKER", "BUILDER", "ADMIN", "SUPER_ADMIN"],
    amount: 149900,
    createsStudioRequest: true,
    currency: "INR",
    description: "Studio reels creation service"
  }
};

export function getPaymentProduct(product: PaymentProduct) {
  return paymentProducts[product];
}

export function createInvoiceNumber(date = new Date()) {
  const stamp = date
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HZ-${stamp}-${random}`;
}

export function isAllowedForRole({
  product,
  role
}: {
  product: PaymentProduct;
  role: UserRole;
}) {
  return getPaymentProduct(product).allowedRoles.includes(role);
}

export function formatAmountPaise(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    style: "currency"
  }).format(amount / 100);
}
