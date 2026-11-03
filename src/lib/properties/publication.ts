import type { ListingStatus, PropertyVerificationStatus } from "@prisma/client";
import { isAdminRole } from "@/lib/auth/roles";

type CreateStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";
type UpdateStatus = CreateStatus | "ARCHIVED";
type PublicationState = {
  status: ListingStatus;
  verificationStatus: PropertyVerificationStatus;
  publishedAt: Date | null;
};

/** Publication controls visibility. It never grants a verification badge. */
export function createPublication(role: string, status: CreateStatus, now: Date) {
  if (status === "PUBLISHED" && role !== "OWNER" && !isAdminRole(role)) {
    return { error: "Only an Owner can publish a new listing directly." } as const;
  }

  return {
    data: {
      status,
      verificationStatus: status === "PENDING_REVIEW" ? "UNDER_REVIEW" as const : "PENDING" as const,
      verified: false,
      publishedAt: status === "PUBLISHED" ? now : undefined
    }
  } as const;
}

export function updatePublication(
  role: string,
  property: PublicationState,
  nextStatus: UpdateStatus | undefined,
  now: Date
) {
  if (!nextStatus) return { data: {} } as const;

  const admin = isAdminRole(role);
  const restricted = property.status === "REJECTED" || property.status === "ARCHIVED" ||
    ["REJECTED", "NEEDS_CHANGES", "EXPIRED"].includes(property.verificationStatus);

  // Keep administrative takedowns effective. A draft/review reset must not erase
  // moderation state and allow a subsequent Owner publication to bypass it.
  // The schema does not distinguish an Owner archive from an admin archive.
  if (role === "OWNER" && restricted && nextStatus !== "ARCHIVED") {
    return { error: "This listing has a moderation restriction. Contact HomeZone support before republishing." } as const;
  }

  if (nextStatus === "PUBLISHED" && !admin && role !== "OWNER" &&
      property.verificationStatus !== "VERIFIED") {
    return { error: "Listing must be verified before publishing." } as const;
  }

  return {
    data: {
      publishedAt: nextStatus === "PUBLISHED" ? property.publishedAt ?? now : undefined,
      // Direct publication preserves the actual verification outcome. Existing
      // UNDER_REVIEW/VERIFIED metadata is not replaced or fabricated here.
      verificationStatus: nextStatus === "PENDING_REVIEW"
        ? "UNDER_REVIEW" as const
        : nextStatus === "DRAFT"
          ? "PENDING" as const
          : undefined
    }
  } as const;
}
