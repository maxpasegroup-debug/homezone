import { auth } from "@/auth";
import { handleApiError, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { getPagination, paginatedResponse } from "@/lib/platform/pagination";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const profile = await getOrCreateProfile(session.user);
    const { searchParams } = new URL(request.url);
    const pagination = getPagination({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize")
    });

    const where = {
      recipientId: profile.id
    };
    const [items, total] = await Promise.all([
      db.notification.findMany({
        orderBy: {
          createdAt: "desc"
        },
        skip: pagination.skip,
        take: pagination.take,
        where
      }),
      db.notification.count({ where })
    ]);

    return ok(paginatedResponse({
      items,
      page: pagination.page,
      pageSize: pagination.take,
      total
    }));
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/notifications"
    });
  }
}
