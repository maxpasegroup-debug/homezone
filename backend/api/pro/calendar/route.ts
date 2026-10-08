import { auth } from "@/auth";
import { handleApiError, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { leadAccessWhere } from "@/lib/leads/access";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const where = leadAccessWhere(profile.id);
    const [tasks, visits] = await Promise.all([
      db.leadTask.findMany({
        include: {
          lead: true
        },
        orderBy: {
          dueAt: "asc"
        },
        where: {
          dueAt: {
            not: null
          },
          lead: where
        }
      }),
      db.leadSiteVisit.findMany({
        include: {
          lead: true,
          property: true
        },
        orderBy: {
          scheduledAt: "asc"
        },
        where: {
          lead: where
        }
      })
    ]);

    return ok({ tasks, visits });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/pro/calendar" });
  }
}
