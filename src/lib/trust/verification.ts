export const propertyVerificationStatuses = [
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "NEEDS_CHANGES",
  "EXPIRED"
] as const;

export const profileVerificationStatuses = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED"
] as const;

export type PropertyVerificationStatus =
  (typeof propertyVerificationStatuses)[number];
export type ProfileVerificationStatus =
  (typeof profileVerificationStatuses)[number];

export function propertyVerificationEvent(
  status: Exclude<PropertyVerificationStatus, "PENDING">
) {
  return {
    EXPIRED: "PROPERTY_EXPIRED",
    NEEDS_CHANGES: "PROPERTY_NEEDS_CHANGES",
    REJECTED: "PROPERTY_REJECTED",
    UNDER_REVIEW: "PROPERTY_UNDER_REVIEW",
    VERIFIED: "PROPERTY_APPROVED"
  }[status];
}

export function profileVerificationEvent({
  role,
  status
}: {
  role: "BROKER" | "BUILDER";
  status: Exclude<ProfileVerificationStatus, "PENDING">;
}) {
  const prefix = role === "BROKER" ? "BROKER" : "BUILDER";
  return {
    REJECTED: `${prefix}_REJECTED`,
    SUSPENDED: `${prefix}_SUSPENDED`,
    VERIFIED: `${prefix}_VERIFIED`
  }[status];
}

export function verificationLabel(status?: string | null) {
  if (!status) return "Pending";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
