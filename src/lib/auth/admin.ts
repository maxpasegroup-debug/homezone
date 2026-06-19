import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";

export async function requireAdminProfile() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth?next=/admin");
  }

  const profile = await getOrCreateProfile(user);

  if (!isAdminRole(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}
