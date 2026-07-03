import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { brokerClientDocumentSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { addLeadTimeline, requireLeadAccess } from "@/lib/leads/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const access = await requireLeadAccess(id, profile);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, brokerClientDocumentSchema);
    if ("error" in parsed) return parsed.error;

    const document = await db.brokerClientDocument.create({
      data: {
        brokerId: profile.id,
        documentType: parsed.data.documentType,
        fileUrl: parsed.data.fileUrl,
        leadId: id,
        title: parsed.data.title
      }
    });

    await addLeadTimeline({
      actorId: profile.id,
      eventType: "CLIENT_DOCUMENT_ADDED",
      leadId: id,
      message: `Client document added: ${parsed.data.title}.`
    });

    return ok({ document });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/pro/leads/[id]/documents" });
  }
}
