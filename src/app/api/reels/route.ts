import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { reelCreateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function GET() {
  const reels = await db.propertyReel.findMany({
    where: {
      status: "PUBLISHED"
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });

  return NextResponse.json({ reels });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reelCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid reel data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await getOrCreateProfile(session.user);

  if (parsed.data.propertyId) {
    const property = await db.property.findUnique({
      where: {
        id: parsed.data.propertyId
      }
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== profile.id && profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const reel = await db.propertyReel.create({
    data: {
      propertyId: parsed.data.propertyId,
      ownerId: profile.id,
      title: parsed.data.title,
      videoUrl: parsed.data.videoUrl,
      thumbnailUrl: parsed.data.thumbnailUrl,
      status: "PENDING_REVIEW"
    }
  });

  return NextResponse.json({ reel });
}
