import { blockSchema, reportConversation, reportSchema, setConversationBlocked } from "@/lib/engagement/conversations";
import { engagementBody, engagementId, engagementResponse, EngagementError, withEngagement } from "@/lib/engagement/http";
type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, context: Context) {
  return withEngagement(request, "conversation-block", async actor => {
    const id = engagementId.safeParse((await context.params).id);
    if (!id.success) throw new EngagementError(400, "Invalid conversation.");
    const input = await engagementBody(request, blockSchema);
    return engagementResponse(await setConversationBlocked(actor, id.data, input.blocked));
  });
}
export async function POST(request: Request, context: Context) {
  return withEngagement(request, "conversation-report", async actor => {
    const id = engagementId.safeParse((await context.params).id);
    if (!id.success) throw new EngagementError(400, "Invalid conversation.");
    const input = await engagementBody(request, reportSchema);
    return engagementResponse(await reportConversation(actor, id.data, input.reason));
  });
}
