import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { builderCampaignSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addBuilderActivity, requireBuilderProjectAccess } from "@/lib/builder/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireBuilderProjectAccess(id, profile);
    if ("error" in access) return access.error;
    const parsed = await parseJson(request, builderCampaignSchema);
    if ("error" in parsed) return parsed.error;
    const campaign = await db.builderCampaign.create({
      data: {
        brochureDownloads: parsed.data.brochureDownloads,
        budget: parsed.data.budget,
        channel: parsed.data.channel,
        landingPageUrl: parsed.data.landingPageUrl,
        leadsCount: parsed.data.leadsCount,
        name: parsed.data.name,
        projectId: id,
        qrCodeUrl: parsed.data.qrCodeUrl,
        status: parsed.data.status
      }
    });
    await addBuilderActivity({
      action: "CAMPAIGN_CREATED",
      builderId: profile.id,
      message: `Campaign created: ${campaign.name}.`,
      projectId: id
    });
    return ok({ campaign });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/builder/projects/[id]/campaigns" });
  }
}
