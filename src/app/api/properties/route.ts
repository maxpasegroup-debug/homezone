import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { propertyCreateSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { generateOpenAIText } from "@/lib/ai/homezone-ai";
import { db } from "@/lib/db";

export async function GET() {
  const properties = await db.property.findMany({
    where: {
      status: "PUBLISHED"
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 24
  });

  return NextResponse.json({ properties });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = propertyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid property data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await getOrCreateProfile(session.user);
  const data = parsed.data;
  const aiSummary =
    (await generateOpenAIText({
      system:
        "You are HomeZone AI. Write a short buyer-friendly real estate listing summary. Keep it practical and premium. Under 55 words.",
      user: JSON.stringify(data)
    })) ??
    "This listing has been created and is waiting for HomeZone admin review.";

  const property = await db.property.create({
    data: {
      ownerId: profile.id,
      title: data.title,
      description: data.description,
      intent: data.intent,
      propertyType: data.propertyType,
      city: data.city,
      locality: data.locality,
      price: data.price,
      areaValue: data.areaValue,
      areaUnit: data.areaUnit,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      amenities: data.amenities,
      status: "PENDING_REVIEW",
      propertyScore: 70,
      aiSummary
    }
  });

  return NextResponse.json({ property });
}
