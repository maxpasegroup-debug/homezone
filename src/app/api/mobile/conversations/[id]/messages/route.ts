import { messageSchema, readMessages, receiptIdsSchema, sendMessage } from "@/lib/engagement/conversations";
import { engagementBody, engagementId, engagementResponse, EngagementError, withEngagement } from "@/lib/engagement/http";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
const query = z.object({ after: engagementId.optional(),
  receiptIds: z.string().max(6449).transform(value => value.split(",")).pipe(receiptIdsSchema).optional()
}).strict();
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: Context) {
  return withEngagement(request, "messages-read", async actor => {
    const id = engagementId.safeParse((await context.params).id);
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => params.getAll(key).length !== 1)) throw new EngagementError(400, "Invalid message cursor.");
    const parsed = query.safeParse(Object.fromEntries(params));
    if (!id.success || !parsed.success) throw new EngagementError(400, "Invalid conversation or cursor.");
    return engagementResponse(await readMessages(actor, id.data, parsed.data.after, parsed.data.receiptIds));
  });
}
export async function POST(request: Request, context: Context) {
  return withEngagement(request, "messages-send", async actor => {
    const id = engagementId.safeParse((await context.params).id);
    if (!id.success) throw new EngagementError(400, "Invalid conversation.");
    const input = await engagementBody(request, messageSchema);
    return engagementResponse(await sendMessage(actor, id.data, input));
  });
}
