import { db } from "@/lib/db";

function hasBrokenMediaReference(url?: string | null) {
  if (!url) return false;
  const trimmed = url.trim();
  return !(
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:")
  );
}

export async function getLaunchReadinessSummary() {
  const now = new Date();
  const [missingImages, incompleteListings, expiredFeatured, expiredPremium, mediaCandidates] = await Promise.all([
    db.property.count({
      where: {
        status: "PUBLISHED",
        mediaUrls: {
          isEmpty: true
        },
        videoUrl: null
      }
    }),
    db.property.count({
      where: {
        status: {
          in: ["PENDING_REVIEW", "PUBLISHED"]
        },
        OR: [
          {
            description: null
          },
          {
            price: null
          },
          {
            areaValue: null
          }
        ]
      }
    }),
    db.property.count({
      where: {
        featured: true,
        featuredUntil: {
          lt: now
        }
      }
    }),
    db.property.count({
      where: {
        premium: true,
        premiumUntil: {
          lt: now
        }
      }
    }),
    db.property.findMany({
      select: {
        id: true,
        mediaUrls: true,
        videoUrl: true
      },
      take: 500
    })
  ]);

  const brokenMedia = mediaCandidates.filter((property) =>
    [...property.mediaUrls, property.videoUrl].some(hasBrokenMediaReference)
  ).length;
  const totalIssues = missingImages + incompleteListings + expiredFeatured + expiredPremium + brokenMedia;

  return {
    brokenMedia,
    expiredFeatured,
    expiredPremium,
    incompleteListings,
    missingImages,
    ready: totalIssues === 0,
    totalIssues
  };
}
