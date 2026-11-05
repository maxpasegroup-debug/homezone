import { contactPreferences, preferenceSchema, updateContactPreferences } from "@/lib/engagement/contact";
import { engagementBody, engagementResponse, withEngagement } from "@/lib/engagement/http";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withEngagement(request, "contact-preferences-read", async actor => engagementResponse(await contactPreferences(actor)));
}
export async function PATCH(request: Request) {
  return withEngagement(request, "contact-preferences-update", async actor => {
    const input = await engagementBody(request, preferenceSchema);
    return engagementResponse(await updateContactPreferences(actor, input));
  });
}
