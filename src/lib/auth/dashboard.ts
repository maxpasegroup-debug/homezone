import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole, normalizeRole, type AppRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";

export async function requireDashboardProfile(next = "/dashboard") {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/auth?next=${next}`);
  }

  return getOrCreateProfile(user);
}

export async function requireDashboardRole(
  allowedRoles: AppRole[],
  next: string
) {
  const profile = await requireDashboardProfile(next);
  const role = normalizeRole(profile.role);

  if (!allowedRoles.includes(role) && !isAdminRole(role)) {
    redirect("/dashboard");
  }

  return profile;
}
