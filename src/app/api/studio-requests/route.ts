import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { studioRequestSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const profile = await getOrCreateProfile(session.user);
  const requests = await db.studioRequest.findMany({
    where: {
      requesterId: profile.id
    },
    include: {
      property: true
    },
    orderBy: {
      createdAt: "desc"
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
    const studioRequest = await db.studioRequest.create({
      data: {
        requesterId: profile.id,
        propertyId: parsed.data.propertyId,
        serviceType: parsed.data.serviceType,
        city: parsed.data.city,
        budget: parsed.data.budget,
        notes: parsed.data.notes
      }
    });

    return ok({ studioRequest });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/studio-requests"
    });
  }
}
