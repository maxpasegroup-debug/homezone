import { auth } from "@/auth";
import { forbidden, handleApiError, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { getAIAnalytics } from "@/lib/ai/core";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if (!isAdminRole(profile.role)) return forbidden();

    const analytics = await getAIAnalytics();
    return ok({ analytics });
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/admin/ai/analytics"
    });
  }
}
