import { acknowledgeMessages, receiptSchema } from "@/lib/engagement/conversations";
import { engagementBody, engagementId, engagementResponse, EngagementError, withEngagement } from "@/lib/engagement/http";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: Context) {
  return withEngagement(request, "messages-receipts", async actor => {
    const id = engagementId.safeParse((await context.params).id);
    if (!id.success) throw new EngagementError(400, "Invalid conversation.");
    const input = await engagementBody(request, receiptSchema);
    return engagementResponse(await acknowledgeMessages(actor, id.data, {
      deliveredIds: input.deliveredIds ?? [], readIds: input.readIds ?? []
    }));
  });
}
