import { NextResponse } from "next/server";
import { explainSearch, getPropertyMatches, parsePropertySearch } from "@/lib/ai-search";
import { aiSearchSchema } from "@/lib/api/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = aiSearchSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid search request", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const structured = parsePropertySearch(parsedBody.data.query);
  const matches = getPropertyMatches(structured);

  return NextResponse.json({
    structured,
    explanation: explainSearch(structured),
    matches
  });
}
