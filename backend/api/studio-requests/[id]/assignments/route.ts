import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { studioAssignmentSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { addStudioTimeline, createStudioNotification, requireStudioOrderAccess } from "@/lib/studio/workflow";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const admin = await getOrCreateProfile(session.user);
    if (!isAdminRole(admin.role)) return forbidden();

    const { id } = await context.params;
    const access = await requireStudioOrderAccess(id, admin);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, studioAssignmentSchema);
    if ("error" in parsed) return parsed.error;

    const assignment = await db.studioAssignment.create({
      data: {
        assignedBy: admin.id,
        assigneeId: parsed.data.assigneeId,
        notes: parsed.data.notes,
        role: parsed.data.role,
        studioRequestId: id
      }
    });

    await db.studioRequest.update({ data: { status: "ASSIGNED" }, where: { id } });
    await addStudioTimeline({
      actorId: admin.id,
      eventType: "ASSIGNMENT_CREATED",
      message: `${parsed.data.role} assigned to Studio order.`,
      studioRequestId: id
    });
    await createStudioNotification({
      message: `${parsed.data.role} assigned for your Studio order.`,
      recipientId: access.order.requesterId,
      studioRequestId: id,
      title: "Studio team assigned",
      type: "ASSIGNMENT"
    });

    return ok({ assignment });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/studio-requests/[id]/assignments" });
  }
}
