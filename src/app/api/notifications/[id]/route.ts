import { auth } from "@/auth";
import { handleApiError, notFound, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { markNotificationRead } from "@/lib/platform/notifications";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const result = await markNotificationRead(id, profile.id);

    if (!result.count) return notFound("Notification not found");

    return ok({ read: true });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/notifications/[id]"
    });
  }
}
