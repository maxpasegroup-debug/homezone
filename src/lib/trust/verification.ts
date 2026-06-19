export const propertyVerificationStatuses = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
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
    REJECTED: "PROPERTY_REJECTED",
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
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
