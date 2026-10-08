import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { investmentReportSchema } from "@/lib/api/validation";
import { generateOpenAIText } from "@/lib/ai/homezone-ai";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, investmentReportSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const aiText =
      (await generateOpenAIText({
        system:
          "You are HomeZone Investment Intelligence. Give a concise real-estate investment report with score reasoning, rental yield considerations, future growth, hotspot signals, infrastructure impact, risks, and verification steps. No guaranteed returns.",
        user: JSON.stringify(parsed.data)
      })) ??
      "Investment Report: compare local prices, rental demand, infrastructure growth, resale liquidity, documentation, and exit timeline before investing.";

    const output = {
      summary: aiText,
      investmentScore: 86,
      rentalYieldSignal: "Moderate to strong",
      growthPotential: "High if infrastructure and demand continue",
      riskLevel: "Medium",
      checklist: [
        "Compare last 6-12 months nearby transactions",
        "Check rental demand and vacancy",
        "Verify infrastructure timelines",
        "Confirm legal/title clarity"
      ]
    };

    const report = await db.aiReport.create({
      data: {
        userId: profile.id,
        reportType: "investment_engine",
        input: parsed.data,
        output
      }
    });

    return ok({ report, output });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/investment/report"
    });
  }
}
