import { auth } from "@/auth";
import { apiError, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
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

    const result=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "StudioRequest" WHERE id = ${id} FOR UPDATE`;
      const current=await tx.studioRequest.findUnique({where:{id}});
      if(!current || current.status!=="DELIVERED")return null;
      const latest=await tx.studioRevision.findFirst({where:{studioRequestId:id},orderBy:{version:"desc"}});
      const revision=await tx.studioRevision.create({data:{comments:parsed.data.comments,requestedById:profile.id,
        studioRequestId:id,status:"REQUESTED",version:(latest?.version??0)+1}});
      const order=await tx.studioRequest.update({where:{id},data:{status:"REVISION_REQUESTED"}});
      return {revision,order};
    });
    if(!result)return apiError("Only a delivered order can be revised. Refresh before continuing.",409);
    const {order,revision}=result;

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
