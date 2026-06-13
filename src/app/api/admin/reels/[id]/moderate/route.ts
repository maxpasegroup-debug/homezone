import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { moderationSchema } from "@/lib/api/validation";
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

  const profile = await getOrCreateProfile(session.user);

  if (profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const parsed = moderationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid moderation data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const reel = await db.propertyReel.update({
    where: { id },
    data: {
      status: parsed.data.status
    }
  });

  await db.auditLog.create({
    data: {
      actorId: profile.id,
      action: `reel_${parsed.data.status.toLowerCase()}`,
      entityType: "reel",
      entityId: id,
      metadata: {
        note: parsed.data.note
      }
    }
  });

  return NextResponse.json({ reel });
}
