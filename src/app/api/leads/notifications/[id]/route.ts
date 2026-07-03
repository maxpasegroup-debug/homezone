import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

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
    const notification = await db.leadNotification.findUnique({
      where: {
        id
      }
    });

    if (!notification) return notFound("Notification not found");
    if (notification.recipientId !== profile.id) return forbidden();

    const updated = await db.leadNotification.update({
      data: {
        readAt: new Date()
      },
      where: {
        id
      }
    });

    return ok({ notification: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/leads/notifications/[id]"
    });
  }
}
