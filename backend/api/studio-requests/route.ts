import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { studioRequestSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { getStudioService } from "@/lib/studio-data";
import { addStudioTimeline, createStudioNotification, studioOrderInclude } from "@/lib/studio/workflow";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const profile = await getOrCreateProfile(session.user);
  const requests = await db.studioRequest.findMany({
    include: studioOrderInclude,
    orderBy: {
      createdAt: "desc"
    },
    where: {
      requesterId: profile.id
    }
  });

  return ok({ requests });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, studioRequestSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const service = getStudioService(parsed.data.serviceType);
    const status = parsed.data.status ?? "SUBMITTED";
    const studioRequest = await db.studioRequest.create({
      data: {
        budget: parsed.data.budget,
        city: parsed.data.city,
        notes: parsed.data.notes,
        orderValue: parsed.data.orderValue ?? service?.priceAmount ?? 0,
        paymentStatus: status === "DRAFT" ? "CREATED" : "PENDING",
        propertyId: parsed.data.propertyId,
        requesterId: profile.id,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        serviceType: parsed.data.serviceType,
        status
      }
    });

    await addStudioTimeline({
      actorId: profile.id,
      eventType: status === "DRAFT" ? "ORDER_DRAFTED" : "ORDER_CREATED",
      message: status === "DRAFT" ? "Studio draft request created." : "Studio order submitted.",
      studioRequestId: studioRequest.id
    });

    await createStudioNotification({
      message: `Studio order for ${parsed.data.serviceType} was created.`,
      recipientId: profile.id,
      studioRequestId: studioRequest.id,
      title: "Studio order created",
      type: "ORDER_CREATED"
    });

    await auditLog({
      action: "STUDIO_ORDER_CREATED",
      actorId: profile.id,
      entityId: studioRequest.id,
      entityType: "studio_request",
      metadata: {
        serviceType: parsed.data.serviceType,
        status
      }
    });

    return ok({ studioRequest });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/studio-requests"
    });
  }
}
