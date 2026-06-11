import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { leadSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = leadSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid lead request", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Verified account required" },
      { status: 401 }
    );
  }

  const profile = await getOrCreateProfile(session.user);

  await db.lead.create({
    data: {
      propertyId: parsedBody.data.propertyId,
      userId: profile.id,
      name: parsedBody.data.name,
      phone: parsedBody.data.phone,
      message: parsedBody.data.message,
      source: parsedBody.data.source,
      aiScore: 60
    }
  });

  return NextResponse.json({ ok: true });
}
