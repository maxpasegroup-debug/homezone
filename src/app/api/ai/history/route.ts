import { auth } from "@/auth";
import { handleApiError, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);
    const history = await db.aiReport.findMany({
      where: {
        userId: profile.id
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    });

    return ok({ history });
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/ai/history"
    });
  }
}
