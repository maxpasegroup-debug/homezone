import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadNoteUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = {
  params: Promise<{
    id: string;
    noteId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id, noteId } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const note = await db.leadNote.findUnique({ where: { id: noteId } });
    if (!note || note.leadId !== id) return notFound("Note not found");
    if (note.authorId && note.authorId !== profile.id) return forbidden();

    const parsed = await parseJson(request, leadNoteUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const updated = await db.leadNote.update({
      data: parsed.data,
      where: { id: noteId }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "NOTE_EDITED",
      leadId: id,
      message: "Lead note edited."
    });

    return ok({ note: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/leads/[id]/notes/[noteId]"
    });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id, noteId } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const note = await db.leadNote.findUnique({ where: { id: noteId } });
    if (!note || note.leadId !== id) return notFound("Note not found");
    if (note.authorId && note.authorId !== profile.id) return forbidden();

    await db.leadNote.delete({ where: { id: noteId } });
    await addLeadTimeline({
      actorId: profile.id,
      eventType: "NOTE_DELETED",
      leadId: id,
      message: "Lead note deleted."
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, {
      route: "DELETE /api/leads/[id]/notes/[noteId]"
    });
  }
}
