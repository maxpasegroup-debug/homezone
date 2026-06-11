import { NextResponse } from "next/server";
import { serviceRequestSchema } from "@/lib/api/validation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("service_requests").insert({
    requester_id: user.id,
    category: parsedBody.data.category,
    city: parsedBody.data.city,
    budget: parsedBody.data.budget,
    message: parsedBody.data.message
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
