import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

const profileUpdateSchema = z.object({
  role: z.enum(["BUYER", "OWNER", "BROKER", "BUILDER", "SERVICE_PROVIDER"]),
  city: z.string().min(2).max(120).optional(),
  phone: z.string().max(32).optional()
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateProfile(session.user);

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await getOrCreateProfile(session.user);
  const updated = await db.profile.update({
    where: {
      id: profile.id
    },
    data: {
      role: parsed.data.role,
      city: parsed.data.city,
      phone: parsed.data.phone || undefined,
      whatsappVerified: Boolean(parsed.data.phone)
    }
  });

  return NextResponse.json({ profile: updated });
}
