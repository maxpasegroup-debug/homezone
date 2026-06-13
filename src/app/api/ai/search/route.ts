import { NextResponse } from "next/server";
import { aiSearchSchema } from "@/lib/api/validation";
import { runAISearch } from "@/lib/ai/homezone-ai";

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = aiSearchSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid search request", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const result = await runAISearch(parsedBody.data.query);

  return NextResponse.json(result);
}
