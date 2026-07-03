import { auth } from "@/auth";
import { handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { leadNoteSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await context.params;
    const profile = await getOrCreateProfile(session.user);
    const lead = await db.lead.findFirst({
      where: {
        id,
        property: {
          ownerId: profile.id
        }
      }
    });

    if (!lead) {
      return notFound("Lead not found");
    }

    const parsed = await parseJson(request, leadNoteSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const note = await db.leadNote.create({
      data: {
        authorId: profile.id,
        leadId: id,
        note: parsed.data.note
      }
    });

    return ok({ note });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/owner/leads/[id]/notes"
    });
  }
}
