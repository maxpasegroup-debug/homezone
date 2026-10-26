import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { brokerTeamMemberSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { getBrokerPlan } from "@/lib/pro/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const team = await db.brokerTeamMember.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        brokerId: profile.id
      }
    });

    return ok({ team });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/pro/team" });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    if(!["BROKER","ADMIN","SUPER_ADMIN"].includes(profile.role))return forbidden();
    const plan = await getBrokerPlan(profile.id);
    const teamCount = await db.brokerTeamMember.count({
      where: {
        brokerId: profile.id
      }
    });

    if (teamCount >= plan.limits.teamMembers) {
      return forbidden(`Your ${plan.plan} plan supports ${plan.limits.teamMembers} team members.`);
    }

    const parsed = await parseJson(request, brokerTeamMemberSchema);
    if ("error" in parsed) return parsed.error;

    if(parsed.data.profileId) return forbidden("Account binding requires the approved team invitation workflow.");
    const member = await db.brokerTeamMember.create({
      data: {
        active: parsed.data.active ?? true,
        brokerId: profile.id,
        email: parsed.data.email,
        name: parsed.data.name,
        permissions: parsed.data.permissions,
        phone: parsed.data.phone,
        profileId: parsed.data.profileId,
        role: parsed.data.role
      }
    });

    return ok({ member });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/pro/team" });
  }
}
