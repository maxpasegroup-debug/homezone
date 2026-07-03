import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { shortlistSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);
    const shortlists = await db.propertyShortlist.findMany({
      where: {
        userId: profile.id
      },
      include: {
        items: {
          include: {
            property: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return ok({ shortlists });
  } catch (error) {
    return handleApiError(error, {
      route: "GET /api/shortlists"
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, shortlistSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const shortlist = await db.propertyShortlist.create({
      data: {
        userId: profile.id,
        name: parsed.data.name
      }
    });

    return ok({ shortlist });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/shortlists"
    });
  }
}
