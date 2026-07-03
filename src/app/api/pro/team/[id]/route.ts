import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { brokerTeamMemberUpdateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const member = await db.brokerTeamMember.findUnique({ where: { id } });
    if (!member) return notFound("Team member not found");
    if (member.brokerId !== profile.id) return forbidden();

    const parsed = await parseJson(request, brokerTeamMemberUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const updated = await db.brokerTeamMember.update({
      data: parsed.data,
      where: {
        id
      }
    });

    return ok({ member: updated });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/pro/team/[id]" });
  }
}
