import { auth } from "@/auth";
import { handleApiError, ok, parseJson, unauthorized } from "@/lib/api/response";
import { propertyCompareSchema } from "@/lib/api/validation";
import { db } from "@/lib/db";
import { getMarketplacePropertiesByIds } from "@/lib/properties/queries";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const parsed = await parseJson(request, propertyCompareSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    await db.property.updateMany({
      data: {
        comparisonCount: {
          increment: 1
        }
      },
      where: {
        id: {
          in: parsed.data.propertyIds
        }
      }
    });

    const properties = await getMarketplacePropertiesByIds(parsed.data.propertyIds);

    return ok({ properties });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/properties/compare"
    });
  }
}
