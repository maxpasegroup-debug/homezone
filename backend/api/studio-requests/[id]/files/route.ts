import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { studioFileSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { addStudioTimeline, createStudioNotification, requireStudioOrderAccess } from "@/lib/studio/workflow";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const admin = await getOrCreateProfile(session.user);
    if (!isAdminRole(admin.role)) return forbidden();

    const { id } = await context.params;
    const access = await requireStudioOrderAccess(id, admin);
    if ("error" in access) return access.error;

    const parsed = await parseJson(request, studioFileSchema);
    if ("error" in parsed) return parsed.error;

    const file = await db.studioDeliveryFile.create({
      data: {
        fileName: parsed.data.fileName,
        fileType: parsed.data.fileType,
        fileUrl: parsed.data.fileUrl,
        notes: parsed.data.notes,
        studioRequestId: id,
        version: parsed.data.version ?? 1
      }
    });

    const order = await db.studioRequest.update({
      data: {
        deliveredAt: new Date(),
        status: "DELIVERED"
      },
      include: {
        files: true
      },
      where: {
        id
      }
    });

    await addStudioTimeline({
      actorId: admin.id,
      eventType: "DELIVERY_FILE_ADDED",
      message: `${parsed.data.fileType.toLowerCase()} delivery uploaded: ${parsed.data.fileName}.`,
      metadata: {
        fileId: file.id,
        fileType: file.fileType,
        version: file.version
      },
      studioRequestId: id
    });
    await createStudioNotification({
      message: "Your HomeZone Studio files are ready to preview, download, approve, or send back for revision.",
      recipientId: access.order.requesterId,
      studioRequestId: id,
      title: "Studio delivery ready",
      type: "DELIVERY_READY"
    });

    return ok({ file, order });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/studio-requests/[id]/files" });
  }
}
