import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { shortlistSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

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

    const parsed = await parseJson(request, shortlistSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const shortlist = await db.propertyShortlist.findUnique({
      where: {
        id
      }
    });

    if (!shortlist) {
      return notFound("Shortlist not found");
    }

    if (shortlist.userId !== profile.id) {
      return forbidden();
    }

    const updated = await db.propertyShortlist.update({
      where: {
        id
      },
      data: {
        name: parsed.data.name
      }
    });

    return ok({ shortlist: updated });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/shortlists/[id]"
    });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const shortlist = await db.propertyShortlist.findUnique({
      where: {
        id
      }
    });

    if (!shortlist) {
      return notFound("Shortlist not found");
    }

    if (shortlist.userId !== profile.id) {
      return forbidden();
    }

    await db.propertyShortlist.delete({
      where: {
        id
      }
    });

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      route: "DELETE /api/shortlists/[id]"
    });
  }
}
