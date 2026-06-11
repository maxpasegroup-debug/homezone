import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serviceRequestSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = serviceRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid service request",
        details: parsedBody.error.flatten()
      },
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

  await db.serviceRequest.create({
    data: {
      requesterId: profile.id,
      category: parsedBody.data.category,
      city: parsedBody.data.city,
      budget: parsedBody.data.budget,
      message: parsedBody.data.message
    }
  });

  return NextResponse.json({ ok: true });
}
