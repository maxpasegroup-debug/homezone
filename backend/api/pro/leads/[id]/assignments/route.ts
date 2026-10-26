import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { brokerLeadAssignmentSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, requireLeadPermission } from "@/lib/leads/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if(!["BROKER","ADMIN","SUPER_ADMIN"].includes(profile.role))return forbidden();
    const { id } = await context.params;
    const access = await requireLeadPermission(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, brokerLeadAssignmentSchema);
    if ("error" in parsed) return parsed.error;

    let leadAssigneeProfileId: string | undefined;
    if (parsed.data.assigneeId) {
      const member = await db.brokerTeamMember.findUnique({
        where: {
          id: parsed.data.assigneeId
        }
      });
      if (!member || !member.active || !member.profileId || member.brokerId !== profile.id) return forbidden("Team member is not part of your brokerage");
      leadAssigneeProfileId = member.profileId ?? undefined;
    }

    const assignment = await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${id} FOR UPDATE`;
      const current=await tx.lead.findUnique({where:{id},include:{property:{select:{ownerId:true}}}});
      if(!current || (!["ADMIN","SUPER_ADMIN"].includes(profile.role) && current.assignedTo!==profile.id && current.property?.ownerId!==profile.id))throw new Error("Assignment unavailable");
      if(parsed.data.assigneeId){const member=await tx.brokerTeamMember.findFirst({where:{id:parsed.data.assigneeId,brokerId:profile.id,active:true,profileId:leadAssigneeProfileId}});if(!member||!member.profileId)throw new Error("Membership changed");}
    const assignment = await tx.brokerLeadAssignment.create({
      data: {
        assignedById: profile.id,
        assigneeId: parsed.data.assigneeId,
        brokerId: profile.id,
        leadId: id,
        notes: parsed.data.notes
      }
    });

    await tx.lead.update({
      data: {
        assignedTo: leadAssigneeProfileId ?? profile.id
      },
      where: {
        id
      }
    });

    return assignment;
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "BROKER_ASSIGNMENT",
      leadId: id,
      message: parsed.data.assigneeId ? "Lead reassigned to broker team member." : "Lead assigned to broker."
    });

    return ok({ assignment });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/pro/leads/[id]/assignments" });
  }
}
