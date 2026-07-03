import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { studioRevisionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addStudioTimeline, createStudioNotification, requireStudioOrderAccess } from "@/lib/studio/workflow";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireStudioOrderAccess(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, studioRevisionSchema);
    if ("error" in parsed) return parsed.error;

    const latestRevision = await db.studioRevision.findFirst({
      orderBy: {
        version: "desc"
      },
      where: {
        studioRequestId: id
      }
    });

    const revision = await db.studioRevision.create({
      data: {
        comments: parsed.data.comments,
        requestedById: profile.id,
        status: "REQUESTED",
        studioRequestId: id,
        version: (latestRevision?.version ?? 0) + 1
      }
    });

    const order = await db.studioRequest.update({
      data: {
        status: "REVISION_REQUESTED"
      },
      where: {
        id
      }
    });

    await addStudioTimeline({
      actorId: profile.id,
      eventType: "REVISION_REQUESTED",
      message: parsed.data.comments,
      metadata: {
        revisionId: revision.id,
        version: revision.version
      },
      studioRequestId: id
    });
    await createStudioNotification({
      message: "A revision has been requested. The Studio team will upload the next version after review.",
      recipientId: access.order.requesterId,
      studioRequestId: id,
      title: "Revision requested",
      type: "REVISION"
    });

    return ok({ order, revision });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/studio-requests/[id]/revisions" });
  }
}
