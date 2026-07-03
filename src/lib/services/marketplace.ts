import { Prisma } from "@prisma/client";
import { forbidden, notFound } from "@/lib/api/response";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export const serviceCategoryTitles = [
  "Interior Design",
  "Architecture",
  "Construction",
  "Renovation",
  "Painting",
  "Cleaning",
  "Home Automation",
  "Solar",
  "Electrical",
  "Plumbing",
  "Landscaping",
  "Furniture",
  "Legal",
  "Loan Assistance",
  "Insurance",
  "Packers & Movers"
];

export const serviceProviderInclude = {
  bookings: {
    include: {
      customer: true,
      request: true,
      review: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  },
  profile: true,
  quotes: {
    include: {
      request: true
    },
    orderBy: {
      createdAt: "desc"
    }
  },
  reviews: {
    include: {
      reviewer: true
    },
    orderBy: {
      createdAt: "desc"
    }
  }
} satisfies Prisma.ServiceProviderInclude;

export async function requireServiceRequestAccess(requestId: string, profile: { id: string; role: string }) {
  const request = await db.serviceRequest.findUnique({
    include: {
      booking: true,
      provider: true,
      quotes: {
        include: {
          provider: true
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      requester: true
    },
    where: {
      id: requestId
    }
  });

  if (!request) return { error: notFound("Service request not found") } as const;
  const providerProfileIds = request.quotes.map((quote) => quote.provider?.profileId).filter(Boolean);
  const allowed =
    isAdminRole(profile.role) ||
    request.requesterId === profile.id ||
    request.provider?.profileId === profile.id ||
    providerProfileIds.includes(profile.id);
  if (!allowed) return { error: forbidden() } as const;
  return { request } as const;
}

export async function requireServiceBookingAccess(bookingId: string, profile: { id: string; role: string }) {
  const booking = await db.serviceBooking.findUnique({
    include: {
      customer: true,
      payments: true,
      provider: true,
      quote: true,
      request: true,
      review: true
    },
    where: {
      id: bookingId
    }
  });
  if (!booking) return { error: notFound("Service booking not found") } as const;
  if (
    !isAdminRole(profile.role) &&
    booking.customerId !== profile.id &&
    booking.provider.profileId !== profile.id
  ) {
    return { error: forbidden() } as const;
  }
  return { booking } as const;
}

export async function recalculateProviderRating(providerId: string) {
  const aggregate = await db.serviceReview.aggregate({
    _avg: {
      rating: true
    },
    _count: {
      _all: true
    },
    where: {
      providerId,
      status: "PUBLISHED"
    }
  });

  return db.serviceProvider.update({
    data: {
      rating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count._all
    },
    where: {
      id: providerId
    }
  });
}

export async function getProviderDashboardData(profileId: string) {
  const provider = await db.serviceProvider.findFirst({
    include: serviceProviderInclude,
    where: {
      profileId
    }
  });
  if (!provider) return null;

  const quoteRequests = await db.serviceRequest.findMany({
    include: {
      quotes: true
    },
    orderBy: {
      createdAt: "desc"
    },
    where: {
      category: provider.category,
      city: provider.city ?? undefined
    },
    take: 50
  });

  const completedJobs = provider.bookings.filter((booking) => booking.status === "COMPLETED");
  const revenue = provider.bookings.reduce((sum, booking) => sum + Number(booking.amount ?? 0), 0);
  const pendingPayments = provider.bookings
    .filter((booking) => booking.status !== "COMPLETED")
    .reduce((sum, booking) => sum + Number(booking.amount ?? 0), 0);
  const acceptedQuotes = provider.quotes.filter((quote) => quote.status === "accepted").length;

  return {
    analytics: {
      acceptedQuotes,
      activeJobs: provider.bookings.filter((booking) => ["UPCOMING", "IN_PROGRESS"].includes(booking.status)).length,
      averageRating: Number(provider.rating),
      completedJobs: completedJobs.length,
      conversionRate: provider.quotes.length ? Math.round((acceptedQuotes / provider.quotes.length) * 100) : 0,
      pendingPayments,
      quoteRequests: quoteRequests.length,
      repeatCustomers: new Set(provider.bookings.map((booking) => booking.customerId).filter(Boolean)).size,
      responseTime: "Same day",
      revenue,
      reviews: provider.reviewCount
    },
    provider,
    quoteRequests
  };
}
