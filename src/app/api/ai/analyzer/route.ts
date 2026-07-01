import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { analyzerReportSchema } from "@/lib/api/validation";
import { generateOpenAIText } from "@/lib/ai/homezone-ai";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, analyzerReportSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const aiText =
      (await generateOpenAIText({
        system:
          "You are HomeZone AI Property Analyzer. Create a concise property health report with estimated value notes, risk notes, rental potential, investment potential, legal checklist, and score reasoning. Do not provide legal or valuation guarantees.",
        user: JSON.stringify(parsed.data)
      })) ??
      "Property Health Report: verify title chain, approvals, location access, market pricing, rental demand, and physical condition before payment.";

    const output = {
      summary: aiText,
      estimatedValue: "AI estimate requires local comparable data",
      riskScore: 32,
      rentalPotential: "Medium-High",
      investmentPotential: 82,
      propertyScore: 84,
      legalNotes: [
        "Verify title chain and encumbrance certificate",
        "Confirm building permit and occupancy status",
        "Visit property and check road access, water, parking, and boundaries"
      ]
    };

    const report = await db.aiReport.create({
      data: {
        userId: profile.id,
        propertyId: parsed.data.propertyId,
        reportType: "property_analyzer",
        input: parsed.data,
        output
      }
    });

    return ok({ report, output });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/ai/analyzer"
    });
  }
}
