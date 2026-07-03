import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { studioStatusSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { addStudioTimeline, createStudioNotification } from "@/lib/studio/workflow";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);

    if (!isAdminRole(profile.role)) {
      return forbidden();
    }

    const parsed = await parseJson(request, studioStatusSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const { id } = await context.params;
    const studioRequest = await db.studioRequest.update({
      where: {
        id
      },
      data: {
        completedAt: parsed.data.status === "COMPLETED" ? new Date() : undefined,
        deliveredAt: parsed.data.status === "DELIVERED" ? new Date() : undefined,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        status: parsed.data.status
      }
    });

    await addStudioTimeline({
      actorId: profile.id,
      eventType: "ADMIN_STATUS_UPDATED",
      message: parsed.data.message ?? `Studio order moved to ${parsed.data.status}.`,
      metadata: {
        status: parsed.data.status
      },
      studioRequestId: id
    });
    await createStudioNotification({
      message: parsed.data.message ?? `Your Studio order is now ${parsed.data.status.replaceAll("_", " ").toLowerCase()}.`,
      recipientId: studioRequest.requesterId,
      studioRequestId: id,
      title: "Studio order updated",
      type: "STATUS"
    });

    await db.auditLog.create({
      data: {
        actorId: profile.id,
        action: "studio_status_update",
        entityType: "studio_request",
        entityId: id,
        metadata: {
          message: parsed.data.message,
          status: parsed.data.status
        }
      }
    });

    return ok({ studioRequest });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/studio-requests/[id]/status"
    });
  }
}
