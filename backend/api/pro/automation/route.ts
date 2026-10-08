import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { brokerAutomationRuleSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { getBrokerPlan } from "@/lib/pro/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const rules = await db.brokerAutomationRule.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        brokerId: profile.id
      }
    });

    return ok({ rules });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/pro/automation" });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const plan = await getBrokerPlan(profile.id);
    const ruleCount = await db.brokerAutomationRule.count({
      where: {
        brokerId: profile.id
      }
    });
    if (ruleCount >= plan.limits.automations) {
      return forbidden(`Your ${plan.plan} plan supports ${plan.limits.automations} automation rules.`);
    }

    const parsed = await parseJson(request, brokerAutomationRuleSchema);
    if ("error" in parsed) return parsed.error;

    const rule = await db.brokerAutomationRule.create({
      data: {
        brokerId: profile.id,
        channel: parsed.data.channel,
        enabled: parsed.data.enabled,
        provider: parsed.data.provider,
        template: parsed.data.template,
        trigger: parsed.data.trigger
      }
    });

    return ok({ rule });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/pro/automation" });
  }
}
