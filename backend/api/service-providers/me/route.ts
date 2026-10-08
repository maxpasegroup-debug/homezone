import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceProviderSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { getProviderDashboardData } from "@/lib/services/marketplace";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const data = await getProviderDashboardData(profile.id);
    return ok({ data });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/service-providers/me" });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const parsed = await parseJson(request, serviceProviderSchema.partial());
    if ("error" in parsed) return parsed.error;
    const provider = await db.serviceProvider.updateMany({
      data: {
        ...parsed.data,
        businessHours: parsed.data.businessHours as Prisma.InputJsonValue | undefined
      },
      where: { profileId: profile.id }
    });
    return ok({ provider });
  } catch (error) {
    return handleApiError(error, { route: "PATCH /api/service-providers/me" });
  }
}
