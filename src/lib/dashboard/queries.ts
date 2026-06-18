import { db } from "@/lib/db";

const recentTake = 5;

export async function getUserDashboardData(profileId: string) {
  const [
    profile,
    savedProperties,
    inquiries,
    listings,
    ownedReels,
    recentActivity
  ] = await Promise.all([
    db.profile.findUnique({
      where: {
        id: profileId
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    }),
    db.savedProperty.findMany({
      where: {
        userId: profileId
      },
      include: {
        property: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: recentTake
    }),
    db.lead.findMany({
      where: {
        userId: profileId
      },
      include: {
        property: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: recentTake
    }),
    db.property.findMany({
      where: {
        ownerId: profileId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: recentTake
    }),
    db.propertyReel.findMany({
      where: {
        ownerId: profileId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: recentTake
    }),
    db.auditLog.findMany({
      where: {
        actorId: profileId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: recentTake
    })
  ]);

  return {
    counts: {
      inquiries: inquiries.length,
      listings: listings.length,
      ownedReels: ownedReels.length,
      savedProperties: savedProperties.length,
      savedReels: 0
    },
    inquiries,
    listings,
    ownedReels,
    profile,
    recentActivity,
    savedProperties,
    savedReels: []
  };
}

export async function getBrokerDashboardData(profileId: string) {
  const leadWhere = {
    OR: [
      {
        assignedTo: profileId
      },
      {
        property: {
          ownerId: profileId
        }
      }
    ]
  };

  const [
    profile,
    listings,
    leads,
    leadCount,
    listingCount,
    publishedCount,
    pendingCount
  ] =
    await Promise.all([
      db.profile.findUnique({
        where: {
          id: profileId
        },
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      }),
      db.property.findMany({
        where: {
          ownerId: profileId
        },
        include: {
          _count: {
            select: {
              leads: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.lead.findMany({
        where: leadWhere,
        include: {
          property: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.lead.count({
        where: leadWhere
      }),
      db.property.count({
        where: {
          ownerId: profileId
        }
      }),
      db.property.count({
        where: {
          ownerId: profileId,
          status: "PUBLISHED"
        }
      }),
      db.property.count({
        where: {
          ownerId: profileId,
          status: "PENDING_REVIEW"
        }
      })
    ]);

  return {
    analytics: {
      leadCount,
      pendingCount,
      publishedCount,
      savedLeadCount: 0,
      totalListings: listingCount
    },
    leads,
    listings,
    profile,
    savedLeads: []
  };
}

export async function getBuilderDashboardData(profileId: string) {
  const leadWhere = {
    OR: [
      {
        assignedTo: profileId
      },
      {
        property: {
          ownerId: profileId
        }
      }
    ]
  };

  const [
    profile,
    projects,
    inventory,
    leads,
    reels,
    inventoryCount,
    leadCount,
    mediaCount,
    projectCount
  ] =
    await Promise.all([
      db.profile.findUnique({
        where: {
          id: profileId
        },
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      }),
      db.builderProject.findMany({
        where: {
          builderId: profileId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.property.findMany({
        where: {
          ownerId: profileId
        },
        include: {
          _count: {
            select: {
              leads: true,
              reels: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.lead.findMany({
        where: leadWhere,
        include: {
          property: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.propertyReel.findMany({
        where: {
          ownerId: profileId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.property.count({
        where: {
          ownerId: profileId
        }
      }),
      db.lead.count({
        where: leadWhere
      }),
      db.property.count({
        where: {
          ownerId: profileId,
          OR: [
            {
              mediaUrls: {
                isEmpty: false
              }
            },
            {
              videoUrl: {
                not: null
              }
            }
          ]
        }
      }),
      db.builderProject.count({
        where: {
          builderId: profileId
        }
      })
    ]);

  return {
    analytics: {
      inventoryCount,
      leadCount,
      mediaCount,
      projectCount,
      reelCount: reels.length
    },
    inventory,
    leads,
    media: reels,
    profile,
    projects
  };
}

export async function getAdminDashboardData() {
  const [
    usersCount,
    brokersCount,
    buildersCount,
    propertiesCount,
    pendingProperties,
    pendingReels,
    reports,
    reportsCount,
    unverifiedBrokers,
    unverifiedBuilders,
    publishedProperties,
    leadsCount,
    reelsCount
  ] = await Promise.all([
    db.profile.count(),
    db.profile.count({
      where: {
        role: "BROKER"
      }
    }),
    db.profile.count({
      where: {
        role: "BUILDER"
      }
    }),
    db.property.count(),
    db.property.findMany({
      where: {
        status: "PENDING_REVIEW"
      },
      select: {
        city: true,
        id: true,
        locality: true,
        status: true,
        title: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.propertyReel.findMany({
      where: {
        status: "PENDING_REVIEW"
      },
      select: {
        id: true,
        status: true,
        title: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.auditLog.findMany({
      where: {
        action: "user_report"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.auditLog.count({
      where: {
        action: "user_report"
      }
    }),
    db.profile.count({
      where: {
        role: "BROKER",
        whatsappVerified: false
      }
    }),
    db.profile.count({
      where: {
        role: "BUILDER",
        whatsappVerified: false
      }
    }),
    db.property.count({
      where: {
        status: "PUBLISHED"
      }
    }),
    db.lead.count(),
    db.propertyReel.count()
  ]);

  return {
    analytics: {
      leads: leadsCount,
      publishedProperties,
      reels: reelsCount
    },
    counts: {
      brokers: brokersCount,
      builders: buildersCount,
      properties: propertiesCount,
      reports: reportsCount,
      users: usersCount,
      verificationQueue: unverifiedBrokers + unverifiedBuilders
    },
    pendingProperties,
    pendingReels,
    reports
  };
}
