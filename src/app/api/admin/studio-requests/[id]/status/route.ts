import { z } from "zod";
import { auth } from "@/auth";
import { forbidden, handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

const statusSchema = z.object({
  status: z.enum(["requested", "confirmed", "in_progress", "delivered", "cancelled"])
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);

    if (!isAdminRole(profile.role)) {
      return forbidden();
    }

    const parsed = await parseJson(request, statusSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const { id } = await context.params;
    const studioRequest = await db.studioRequest.update({
      where: {
        id
      },
      data: {
        status: parsed.data.status
      }
    });

    await db.auditLog.create({
      data: {
        actorId: profile.id,
        action: "studio_status_update",
        entityType: "studio_request",
        entityId: id,
        metadata: {
          status: parsed.data.status
        }
      }
    });

    return ok({ studioRequest });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/admin/studio-requests/[id]/status"
    });
  }
}
