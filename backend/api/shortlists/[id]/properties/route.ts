import { auth } from "@/auth";
import { forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { shortlistPropertySchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getOwnedShortlist(id: string, profileId: string) {
  const shortlist = await db.propertyShortlist.findUnique({
    where: {
      id
    }
  });

  if (!shortlist) {
    return { error: notFound("Shortlist not found") } as const;
  }

  if (shortlist.userId !== profileId) {
    return { error: forbidden() } as const;
  }

  return { shortlist } as const;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, shortlistPropertySchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const owned = await getOwnedShortlist(id, profile.id);

    if ("error" in owned) {
      return owned.error;
    }

    const property = await db.property.findUnique({
      where: {
        id: parsed.data.propertyId
      },
      select: {
        id: true
      }
    });

    if (!property) {
      return notFound("Property not found");
    }

    await db.shortlistProperty.upsert({
      where: {
        shortlistId_propertyId: {
          shortlistId: id,
          propertyId: parsed.data.propertyId
        }
      },
      update: {},
      create: {
        shortlistId: id,
        propertyId: parsed.data.propertyId
      }
    });

    return ok({ ok: true, added: true });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/shortlists/[id]/properties"
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, shortlistPropertySchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const { id } = await context.params;
    const owned = await getOwnedShortlist(id, profile.id);

    if ("error" in owned) {
      return owned.error;
    }

    await db.shortlistProperty.deleteMany({
      where: {
        shortlistId: id,
        propertyId: parsed.data.propertyId
      }
    });

    return ok({ ok: true, added: false });
  } catch (error) {
    return handleApiError(error, {
      route: "DELETE /api/shortlists/[id]/properties"
    });
  }
}
