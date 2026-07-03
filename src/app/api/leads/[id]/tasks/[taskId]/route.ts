import { auth } from "@/auth";
import { handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadTaskUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id, taskId } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const task = await db.leadTask.findUnique({ where: { id: taskId } });
    if (!task || task.leadId !== id) return notFound("Task not found");

    const parsed = await parseJson(request, leadTaskUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const updated = await db.leadTask.update({
      data: {
        completedAt:
          parsed.data.completed === undefined
            ? undefined
            : parsed.data.completed
              ? new Date()
              : null,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
        taskType: parsed.data.taskType,
        title: parsed.data.title
      },
      where: { id: taskId }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: parsed.data.completed ? "TASK_COMPLETED" : "TASK_UPDATED",
      leadId: id,
      message: parsed.data.completed ? "Follow-up task completed." : "Follow-up task updated."
    });

    return ok({ task: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/leads/[id]/tasks/[taskId]"
    });
  }
}
