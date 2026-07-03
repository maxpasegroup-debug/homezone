import type { Prisma, StudioOrderStatus } from "@prisma/client";
import { forbidden, notFound } from "@/lib/api/response";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export const studioStatuses: StudioOrderStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "PAYMENT_PENDING",
  "PAID",
  "ASSIGNED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "DELIVERED",
  "CUSTOMER_APPROVED",
  "COMPLETED"
];

export function studioLabel(status?: string | null) {
  if (!status) return "Draft";
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export const studioOrderInclude = {
  assignments: {
    include: {
      assignee: {
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  },
  files: {
    orderBy: {
      createdAt: "desc"
    }
  },
  notifications: {
    orderBy: {
      createdAt: "desc"
    }
  },
  payments: {
    orderBy: {
      createdAt: "desc"
    }
  },
  property: true,
  requester: {
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  },
  revisions: {
    orderBy: {
      createdAt: "desc"
    }
  },
  timeline: {
    orderBy: {
      createdAt: "desc"
    }
  }
} satisfies Prisma.StudioRequestInclude;

export async function requireStudioOrderAccess(orderId: string, profile: {
  id: string;
  role: string;
}) {
  const order = await db.studioRequest.findUnique({
    include: studioOrderInclude,
    where: {
      id: orderId
    }
  });

  if (!order) {
    return { error: notFound("Studio order not found") } as const;
  }

  if (order.requesterId !== profile.id && !isAdminRole(profile.role)) {
    return { error: forbidden() } as const;
  }

  return { order } as const;
}

export async function addStudioTimeline({
  actorId,
  eventType,
  message,
  metadata = {},
  studioRequestId
}: {
  actorId?: string | null;
  eventType: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  studioRequestId: string;
}) {
  return db.studioTimelineEvent.create({
    data: {
      actorId,
      eventType,
      message,
      metadata,
      studioRequestId
    }
  });
}

export async function createStudioNotification({
  message,
  recipientId,
  studioRequestId,
  title,
  type
}: {
  message: string;
  recipientId?: string | null;
  studioRequestId: string;
  title: string;
  type: string;
}) {
  if (!recipientId) return null;

  return db.studioNotification.create({
    data: {
      message,
      recipientId,
      studioRequestId,
      title,
      type
    }
  });
}

export async function getStudioDashboardData(profileId: string) {
  const [orders, revenue, completed, repeatCustomers] = await Promise.all([
    db.studioRequest.findMany({
      include: studioOrderInclude,
      orderBy: {
        updatedAt: "desc"
      },
      where: {
        requesterId: profileId
      }
    }),
    db.payment.aggregate({
      _sum: {
        amount: true
      },
      where: {
        payerId: profileId,
        studioRequestId: {
          not: null
        },
        status: "PAID"
      }
    }),
    db.studioRequest.findMany({
      select: {
        completedAt: true,
        createdAt: true
      },
      where: {
        completedAt: {
          not: null
        },
        requesterId: profileId
      }
    }),
    db.studioRequest.groupBy({
      by: ["requesterId"],
      where: {
        requesterId: profileId
      },
      _count: {
        _all: true
      }
    })
  ]);

  const deliveryDurations = completed
    .filter((order) => order.completedAt)
    .map((order) => order.completedAt!.getTime() - order.createdAt.getTime());

  return {
    analytics: {
      averageDeliveryDays: deliveryDurations.length
        ? Math.round(
            deliveryDurations.reduce((sum, item) => sum + item, 0) /
              deliveryDurations.length /
              86_400_000
          )
        : 0,
      completedOrders: orders.filter((order) => order.status === "COMPLETED").length,
      draftRequests: orders.filter((order) => order.status === "DRAFT").length,
      pendingOrders: orders.filter((order) =>
        ["SUBMITTED", "PAYMENT_PENDING", "PAID", "ASSIGNED", "IN_PRODUCTION", "QUALITY_CHECK"].includes(order.status)
      ).length,
      repeatCustomers: repeatCustomers.filter((item) => item._count._all > 1).length,
      revenue: revenue._sum.amount ?? 0
    },
    orders
  };
}

export async function getAdminStudioOperationsData() {
  const [orders, revenue, completed, satisfaction, pendingWork, repeatCustomers] =
    await Promise.all([
      db.studioRequest.findMany({
        include: studioOrderInclude,
        orderBy: {
          updatedAt: "desc"
        },
        take: 100
      }),
      db.payment.aggregate({
        _sum: {
          amount: true
        },
        where: {
          studioRequestId: {
            not: null
          },
          status: "PAID"
        }
      }),
      db.studioRequest.findMany({
        select: {
          completedAt: true,
          createdAt: true
        },
        where: {
          completedAt: {
            not: null
          }
        }
      }),
      db.studioRequest.aggregate({
        _avg: {
          customerRating: true
        },
        where: {
          customerRating: {
            not: null
          }
        }
      }),
      db.studioRequest.count({
        where: {
          status: {
            in: ["PAID", "ASSIGNED", "IN_PRODUCTION", "QUALITY_CHECK", "REVISION_REQUESTED"]
          }
        }
      }),
      db.studioRequest.groupBy({
        by: ["requesterId"],
        where: {
          requesterId: {
            not: null
          }
        },
        _count: {
          _all: true
        }
      })
    ]);

  const deliveryDurations = completed
    .filter((order) => order.completedAt)
    .map((order) => order.completedAt!.getTime() - order.createdAt.getTime());

  return {
    analytics: {
      averageDeliveryDays: deliveryDurations.length
        ? Math.round(
            deliveryDurations.reduce((sum, item) => sum + item, 0) /
              deliveryDurations.length /
              86_400_000
          )
        : 0,
      customerSatisfaction: Math.round((satisfaction._avg.customerRating ?? 0) * 10) / 10,
      orders: orders.length,
      pendingWork,
      repeatCustomers: repeatCustomers.filter((item) => item._count._all > 1).length,
      revenue: revenue._sum.amount ?? 0
    },
    orders
  };
}
