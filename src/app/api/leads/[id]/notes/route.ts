import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadNoteSchema } from "@/lib/api/validation";
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

    const parsed = await parseJson(request, leadNoteSchema);

    if ("error" in parsed) return parsed.error;

    const note = await db.leadNote.create({
      data: {
        authorId: profile.id,
        leadId: id,
        note: parsed.data.note
      }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "NOTE_ADDED",
      leadId: id,
      message: "Lead note added."
    });

    return ok({ note });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/leads/[id]/notes"
    });
  }
}
