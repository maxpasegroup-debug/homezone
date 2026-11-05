import { conversationCreateSchema, conversationInbox, startConversation } from "@/lib/engagement/conversations";
import { engagementBody, engagementResponse, withEngagement } from "@/lib/engagement/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withEngagement(request, "conversation-inbox", async actor => engagementResponse(await conversationInbox(actor)));
}
export async function POST(request: Request) {
  return withEngagement(request, "conversation-start", async actor => {
    const input = await engagementBody(request, conversationCreateSchema);
    return engagementResponse(await startConversation(actor, input.propertyId));
  });
}
