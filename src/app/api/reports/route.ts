import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { reportSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reportSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await getOrCreateProfile(session.user);
  const report = await db.auditLog.create({
    data: {
      actorId: profile.id,
      action: "user_report",
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      metadata: {
        reason: parsed.data.reason,
        status: "open"
      }
    }
  });

  return NextResponse.json({ report });
}
