import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const profile = await getOrCreateProfile(session.user);
  const property = await db.property.findUnique({
    where: {
      id
    }
  });

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  await db.savedProperty.upsert({
    where: {
      userId_propertyId: {
        userId: profile.id,
        propertyId: id
      }
    },
    update: {},
    create: {
      userId: profile.id,
      propertyId: id
    }
  });

  return NextResponse.json({ ok: true });
}
