import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { propertyMediaSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = propertyMediaSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid media data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await getOrCreateProfile(session.user);
  const property = await db.property.findUnique({
    where: {
      id
    }
  });

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  if (property.ownerId !== profile.id && profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.property.update({
    where: {
      id
    },
    data:
      parsed.data.mediaType === "video"
        ? {
            videoUrl: parsed.data.mediaUrl
          }
        : {
            mediaUrls: {
              push: parsed.data.mediaUrl
            }
          }
  });

  return NextResponse.json({ property: updated });
}
