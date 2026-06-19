import { db } from "@/lib/db";
import { getLaunchReadinessSummary } from "@/lib/launch/readiness";

const recentTake = 5;
const recentWindowMs = 30 * 24 * 60 * 60 * 1000;

function recentSince() {
  return new Date(Date.now() - recentWindowMs);
}

export async function getUserDashboardData(profileId: string) {
  const [
    profile,
    savedProperties,
    savedReels,
    inquiries,
    listings,
    ownedReels,
    payments,
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
    db.savedReel.findMany({
      where: {
        userId: profileId
      },
      include: {
        reel: {
          include: {
            property: true
          }
        }
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
    db.payment.findMany({
      where: {
        payerId: profileId
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
      savedReels: savedReels.length
    },
    inquiries,
    listings,
    ownedReels,
    payments,
    profile,
    recentActivity,
    savedProperties,
    savedReels
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
    pendingCount,
    payments,
    followerCount,
    leadsBySource,
    reelLeadCount,
    propertyLeadCount,
    reelPerformance,
    followersGained,
    reportedReels,
    reelEngagement,
    propertyPerformance,
    propertyViews
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
      }),
      db.payment.findMany({
        where: {
          payerId: profileId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.profileFollow.count({
        where: {
          targetId: profileId
        }
      }),
      db.lead.groupBy({
        by: ["source"],
        where: leadWhere,
        _count: {
          _all: true
        }
      }),
      db.lead.count({
        where: {
          ...leadWhere,
          source: "REEL"
        }
      }),
      db.lead.count({
        where: {
          ...leadWhere,
          source: "PROPERTY"
        }
      }),
      db.propertyReel.findMany({
        where: {
          ownerId: profileId
        },
        orderBy: [
          {
            leadsCount: "desc"
          },
          {
            viewsCount: "desc"
          }
        ],
        take: recentTake
      }),
      db.profileFollow.count({
        where: {
          targetId: profileId,
          createdAt: {
            gte: recentSince()
          }
        }
      }),
      db.auditLog.count({
        where: {
          action: "user_report",
          entityType: "reel",
          metadata: {
            path: ["ownerId"],
            equals: profileId
          }
        }
      }),
      db.propertyReel.aggregate({
        where: {
          ownerId: profileId
        },
        _sum: {
          leadsCount: true,
          likesCount: true,
          savesCount: true,
          sharesCount: true,
          viewsCount: true
        }
      }),
      db.property.aggregate({
        where: {
          ownerId: profileId
        },
        _sum: {
          callClicks: true,
          inquirySubmissions: true,
          whatsappClicks: true
        }
      }),
      db.auditLog.count({
        where: {
          action: "PROPERTY_VIEWED",
          metadata: {
            path: ["ownerId"],
            equals: profileId
          }
        }
      })
    ]);

  return {
    analytics: {
      followerCount,
      followersGained,
      leadCount,
      pendingCount,
      propertyPerformance,
      propertyViews,
      propertyLeadCount,
      reelEngagement,
      publishedCount,
      reportedReels,
      reelLeadCount,
      savedLeadCount: 0,
      totalListings: listingCount
    },
    leads,
    leadsBySource,
    listings,
    payments,
    profile,
    reelPerformance,
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
    projectCount,
    payments,
    followerCount,
    leadsBySource,
    leadsByReel,
    leadsByProperty,
    reelPerformance,
    followersGained,
    reportedReels,
    reelEngagement,
    propertyPerformance,
    propertyViews
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
      }),
      db.payment.findMany({
        where: {
          payerId: profileId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: recentTake
      }),
      db.profileFollow.count({
        where: {
          targetId: profileId
        }
      }),
      db.lead.groupBy({
        by: ["source"],
        where: leadWhere,
        _count: {
          _all: true
        }
      }),
      db.lead.groupBy({
        by: ["reelId"],
        where: {
          ...leadWhere,
          reelId: {
            not: null
          }
        },
        _count: {
          _all: true
        },
        orderBy: {
          _count: {
            reelId: "desc"
          }
        },
        take: recentTake
      }),
      db.lead.groupBy({
        by: ["propertyId"],
        where: {
          ...leadWhere,
          propertyId: {
            not: null
          }
        },
        _count: {
          _all: true
        },
        orderBy: {
          _count: {
            propertyId: "desc"
          }
        },
        take: recentTake
      }),
      db.propertyReel.findMany({
        where: {
          ownerId: profileId
        },
        orderBy: [
          {
            leadsCount: "desc"
          },
          {
            viewsCount: "desc"
          }
        ],
        take: recentTake
      }),
      db.profileFollow.count({
        where: {
          targetId: profileId,
          createdAt: {
            gte: recentSince()
          }
        }
      }),
      db.auditLog.count({
        where: {
          action: "user_report",
          entityType: "reel",
          metadata: {
            path: ["ownerId"],
            equals: profileId
          }
        }
      }),
      db.propertyReel.aggregate({
        where: {
          ownerId: profileId
        },
        _sum: {
          leadsCount: true,
          likesCount: true,
          savesCount: true,
          sharesCount: true,
          viewsCount: true
        }
      }),
      db.property.aggregate({
        where: {
          ownerId: profileId
        },
        _sum: {
          callClicks: true,
          inquirySubmissions: true,
          whatsappClicks: true
        }
      }),
      db.auditLog.count({
        where: {
          action: "PROPERTY_VIEWED",
          metadata: {
            path: ["ownerId"],
            equals: profileId
          }
        }
      })
    ]);

  return {
    analytics: {
      followerCount,
      followersGained,
      inventoryCount,
      leadCount,
      mediaCount,
      projectCount,
      propertyPerformance,
      propertyViews,
      reelEngagement,
      reelCount: reels.length,
      reportedReels
    },
    inventory,
    leads,
    leadsByProperty,
    leadsByReel,
    leadsBySource,
    media: reels,
    payments,
    profile,
    projects,
    reelPerformance
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
    pendingVerificationProperties,
    pendingBrokerProfiles,
    pendingBuilderProfiles,
    verifiedProperties,
    verifiedBrokers,
    verifiedBuilders,
    publishedProperties,
    leadsCount,
    reelsCount,
    leadSources,
    topReels,
    topProperties,
    reportedReelsCount,
    aiSearches,
    aiRecommendations,
    aiComparisons,
    aiAreaQueries,
    aiLeadAssistant,
    aiFailures,
    launchReadiness
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
    db.property.findMany({
      where: {
        verificationStatus: "PENDING"
      },
      select: {
        city: true,
        id: true,
        locality: true,
        status: true,
        title: true,
        verificationStatus: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.profile.findMany({
      where: {
        role: "BROKER",
        verificationStatus: "PENDING"
      },
      select: {
        city: true,
        fullName: true,
        id: true,
        role: true,
        verificationStatus: true,
        whatsappVerified: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.profile.findMany({
      where: {
        role: "BUILDER",
        verificationStatus: "PENDING"
      },
      select: {
        city: true,
        fullName: true,
        id: true,
        role: true,
        verificationStatus: true,
        whatsappVerified: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    db.property.count({
      where: {
        verificationStatus: "VERIFIED"
      }
    }),
    db.profile.count({
      where: {
        role: "BROKER",
        verificationStatus: "VERIFIED"
      }
    }),
    db.profile.count({
      where: {
        role: "BUILDER",
        verificationStatus: "VERIFIED"
      }
    }),
    db.property.count({
      where: {
        status: "PUBLISHED"
      }
    }),
    db.lead.count(),
    db.propertyReel.count(),
    db.lead.groupBy({
      by: ["source"],
      _count: {
        _all: true
      }
    }),
    db.propertyReel.findMany({
      orderBy: [
        {
          leadsCount: "desc"
        },
        {
          viewsCount: "desc"
        }
      ],
      select: {
        id: true,
        leadsCount: true,
        likesCount: true,
        sharesCount: true,
        title: true,
        viewsCount: true
      },
      take: 5
    }),
    db.property.findMany({
      orderBy: [
        {
          inquirySubmissions: "desc"
        },
        {
          callClicks: "desc"
        },
        {
          whatsappClicks: "desc"
        }
      ],
      select: {
        callClicks: true,
        city: true,
        id: true,
        inquirySubmissions: true,
        title: true,
        whatsappClicks: true
      },
      take: 5
    }),
    db.auditLog.count({
      where: {
        action: "user_report",
        entityType: "reel"
      }
    }),
    db.aiReport.count({
      where: {
        reportType: "AI_SEARCH"
      }
    }),
    db.aiReport.count({
      where: {
        reportType: "AI_RECOMMENDATION"
      }
    }),
    db.aiReport.count({
      where: {
        reportType: "AI_COMPARISON"
      }
    }),
    db.aiReport.count({
      where: {
        reportType: "AI_AREA_QUERY"
      }
    }),
    db.aiReport.count({
      where: {
        reportType: "AI_LEAD_ASSISTANT"
      }
    }),
    db.auditLog.count({
      where: {
        action: "AI_USED",
        metadata: {
          path: ["status"],
          equals: "failed"
        }
      }
    }),
    getLaunchReadinessSummary()
  ]);

  return {
    analytics: {
      leads: leadsCount,
      leadSources,
      publishedProperties,
      reels: reelsCount,
      reportedReels: reportedReelsCount,
      topProperties,
      topReels,
      aiUsage: {
        areaQueries: aiAreaQueries,
        comparisons: aiComparisons,
        failures: aiFailures,
        leadAssistant: aiLeadAssistant,
        recommendations: aiRecommendations,
        searches: aiSearches
      },
      launchReadiness,
      verifiedBrokers,
      verifiedBuilders,
      verifiedProperties
    },
    counts: {
      brokers: brokersCount,
      builders: buildersCount,
      properties: propertiesCount,
      reports: reportsCount,
      users: usersCount,
      verificationQueue:
        pendingVerificationProperties.length +
        pendingBrokerProfiles.length +
        pendingBuilderProfiles.length
    },
    pendingBrokerProfiles,
    pendingBuilderProfiles,
    pendingProperties,
    pendingVerificationProperties,
    pendingReels,
    reports
  };
}
