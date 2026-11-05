import { propertyContact } from "@/lib/engagement/contact";
import { engagementId, engagementResponse, EngagementError, withEngagement } from "@/lib/engagement/http";
type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
async function contact(request: Request, context: Context, unlock: boolean) {
  return withEngagement(request, unlock ? "contact-unlock" : "contact-state", async actor => {
    const parsed = engagementId.safeParse((await context.params).id);
    if (!parsed.success) throw new EngagementError(400, "Invalid property.");
    // The URL is the entire unlock contract. No client price, role or allowance is accepted.
    if (unlock && request.body !== null) throw new EngagementError(400, "Contact unlock does not accept request fields.");
    return engagementResponse(await propertyContact(actor, parsed.data, unlock));
  });
}
export async function GET(request: Request, context: Context) { return contact(request, context, false); }
export async function POST(request: Request, context: Context) { return contact(request, context, true); }
