import { auth } from "@/auth";
import { forbidden, handleApiError, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const notification = await db.studioNotification.findUnique({
      where: {
        id
      }
    });

    if (!notification) return forbidden();
    if (notification.recipientId !== profile.id && !isAdminRole(profile.role)) {
      return forbidden();
    }

    const updated = await db.studioNotification.update({
      data: {
        readAt: new Date()
      },
      where: {
        id
      }
    });

    return ok({ notification: updated });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/studio-notifications/[id]" });
  }
}
