import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderTeamMemberSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addBuilderActivity, getBuilderPlan, requireBuilderProjectAccess } from "@/lib/builder/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireBuilderProjectAccess(id, profile);
    if ("error" in access) return access.error;
    const plan = await getBuilderPlan(profile.id);
    const teamCount = await db.builderTeamMember.count({ where: { builderId: profile.id } });
    if (teamCount >= plan.limits.teamMembers) return forbidden(`Your ${plan.plan} plan supports ${plan.limits.teamMembers} team members.`);
    const parsed = await parseJson(request, builderTeamMemberSchema);
    if ("error" in parsed) return parsed.error;
    const member = await db.builderTeamMember.create({
      data: {
        active: parsed.data.active ?? true,
        builderId: profile.id,
        email: parsed.data.email,
        name: parsed.data.name,
        permissions: parsed.data.permissions,
        phone: parsed.data.phone,
        profileId: parsed.data.profileId,
        projectId: id,
        role: parsed.data.role
      }
    });
    await addBuilderActivity({
      action: "TEAM_MEMBER_INVITED",
      builderId: profile.id,
      message: `Team member added: ${member.name}.`,
      projectId: id,
      teamMemberId: member.id
    });
    return ok({ member });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/builder/projects/[id]/team" });
  }
}
