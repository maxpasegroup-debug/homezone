import type { UserRole } from "@prisma/client";

export const appRoles = [
  "USER",
  "OWNER",
  "BROKER",
  "BUILDER",
  "SERVICE_PROVIDER",
  "ADMIN",
  "SUPER_ADMIN"
] as const;

export type AppRole = (typeof appRoles)[number];

const legacyRoleMap: Record<string, AppRole> = {
  BUYER: "USER"
};

export function normalizeRole(role?: string | null): AppRole {
  if (!role) {
    return "USER";
  }

  const mapped = legacyRoleMap[role] ?? role;

  return appRoles.includes(mapped as AppRole) ? (mapped as AppRole) : "USER";
}

export function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "ADMIN" || normalized === "SUPER_ADMIN";
}

export function canManageProperty(role?: string | null) {
  return isAdminRole(role);
}

export function toPrismaRole(role?: string | null): UserRole {
  return normalizeRole(role) as UserRole;
}
