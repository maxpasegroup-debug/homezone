import type { UserRole } from "@prisma/client";
import { forbidden } from "@/lib/api/response";
import { normalizeRole } from "@/lib/auth/roles";

export type PermissionAction =
  | "admin.manage"
  | "property.create"
  | "property.manage"
  | "lead.manage"
  | "studio.manage"
  | "broker.manage"
  | "builder.manage"
  | "service.manage"
  | "payment.manage"
  | "ai.use";

export type PermissionContext = {
  ownerId?: string | null;
  requesterId?: string | null;
  assigneeId?: string | null;
  providerProfileId?: string | null;
  actorId: string;
  role: UserRole | string;
};

const rolePermissions: Record<string, PermissionAction[]> = {
  ADMIN: ["admin.manage", "property.manage", "lead.manage", "studio.manage", "broker.manage", "builder.manage", "service.manage", "payment.manage", "ai.use"],
  BROKER: ["property.create", "property.manage", "lead.manage", "broker.manage", "payment.manage", "ai.use"],
  BUILDER: ["property.create", "property.manage", "lead.manage", "builder.manage", "payment.manage", "ai.use"],
  OWNER: ["property.create", "property.manage", "lead.manage", "studio.manage", "payment.manage", "ai.use"],
  SERVICE_PROVIDER: ["service.manage", "payment.manage", "ai.use"],
  SUPER_ADMIN: ["admin.manage", "property.create", "property.manage", "lead.manage", "studio.manage", "broker.manage", "builder.manage", "service.manage", "payment.manage", "ai.use"],
  USER: ["property.create", "lead.manage", "studio.manage", "payment.manage", "ai.use"]
};

export function hasPermission(context: PermissionContext, action: PermissionAction) {
  const role = normalizeRole(context.role);
  if (role === "SUPER_ADMIN") return true;
  return rolePermissions[role]?.includes(action) ?? false;
}

export function ownsResource(context: PermissionContext) {
  return Boolean(
    context.ownerId === context.actorId ||
      context.requesterId === context.actorId ||
      context.assigneeId === context.actorId ||
      context.providerProfileId === context.actorId
  );
}

export function canAccessResource(context: PermissionContext, action: PermissionAction) {
  if (hasPermission(context, "admin.manage")) return true;
  if (!hasPermission(context, action)) return false;
  return ownsResource(context);
}

export function permissionError(message = "You do not have permission to perform this action") {
  return forbidden(message);
}
