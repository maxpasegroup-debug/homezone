import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadTaskSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, leadTaskSchema);
    if ("error" in parsed) return parsed.error;

    const task = await db.leadTask.create({
      data: {
        assignedTo: profile.id,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
        leadId: id,
        taskType: parsed.data.taskType,
        title: parsed.data.title
      }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "TASK_CREATED",
      leadId: id,
      message: `${parsed.data.taskType} follow-up created.`
    });

    return ok({ task });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/leads/[id]/tasks"
    });
  }
}
