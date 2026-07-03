import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { studioApprovalSchema, studioStatusSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { addStudioTimeline, createStudioNotification, requireStudioOrderAccess } from "@/lib/studio/workflow";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireStudioOrderAccess(id, profile);
    if ("error" in access) return access.error;

    return ok({ order: access.order });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/studio-requests/[id]" });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireStudioOrderAccess(id, profile);
    if ("error" in access) return access.error;

    const parsedStatus = await request.clone().json().catch(() => null);
    const action = parsedStatus?.action as string | undefined;

    if (action === "approve") {
      const parsed = await parseJson(request, studioApprovalSchema);
      if ("error" in parsed) return parsed.error;

      const order = await db.studioRequest.update({
        data: {
          approvedAt: new Date(),
          completedAt: new Date(),
          customerFeedback: parsed.data.customerFeedback,
          customerRating: parsed.data.customerRating,
          status: "COMPLETED"
        },
        where: { id }
      });
      await addStudioTimeline({
        actorId: profile.id,
        eventType: "ORDER_COMPLETED",
        message: "Customer approved delivery and order was completed.",
        studioRequestId: id
      });
      return ok({ order });
    }

    if (action === "cancel") {
      if (["IN_PRODUCTION", "QUALITY_CHECK", "DELIVERED", "COMPLETED"].includes(access.order.status)) {
        return forbidden("Order cannot be cancelled after production starts");
      }
      const order = await db.studioRequest.update({
        data: {
          cancelledAt: new Date(),
          status: "CANCELLED"
        },
        where: { id }
      });
      await addStudioTimeline({
        actorId: profile.id,
        eventType: "ORDER_CANCELLED",
        message: "Studio order cancelled before production.",
        studioRequestId: id
      });
      return ok({ order });
    }

    if (!isAdminRole(profile.role)) {
      return forbidden("Only admins can update studio production status");
    }

    const parsed = await parseJson(request, studioStatusSchema);
    if ("error" in parsed) return parsed.error;

    const order = await db.studioRequest.update({
      data: {
        completedAt: parsed.data.status === "COMPLETED" ? new Date() : undefined,
        deliveredAt: parsed.data.status === "DELIVERED" ? new Date() : undefined,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        status: parsed.data.status
      },
      where: { id }
    });

    await addStudioTimeline({
      actorId: profile.id,
      eventType: parsed.data.status,
      message: parsed.data.message ?? `Studio order moved to ${parsed.data.status}.`,
      studioRequestId: id
    });
    await createStudioNotification({
      message: parsed.data.message ?? `Studio order status changed to ${parsed.data.status}.`,
      recipientId: access.order.requesterId,
      studioRequestId: id,
      title: "Studio order updated",
      type: parsed.data.status
    });

    return ok({ order });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/studio-requests/[id]" });
  }
}
