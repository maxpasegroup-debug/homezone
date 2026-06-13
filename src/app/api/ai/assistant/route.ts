import { NextResponse } from "next/server";
import { z } from "zod";
import { answerPropertyQuestion } from "@/lib/ai/homezone-ai";

const assistantSchema = z.object({
  message: z.string().min(2).max(2000)
});

export async function POST(request: Request) {
  const parsed = assistantSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid assistant message", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await answerPropertyQuestion(parsed.data.message);

  return NextResponse.json(result);
}
