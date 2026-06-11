import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/api/validation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = leadSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid lead request", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Verified account required" },
      { status: 401 }
    );
  }

  const { error } = await supabase.from("leads").insert({
    property_id: parsedBody.data.propertyId,
    user_id: user.id,
    name: parsedBody.data.name,
    phone: parsedBody.data.phone,
    message: parsedBody.data.message,
    source: parsedBody.data.source,
    ai_score: 60
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
