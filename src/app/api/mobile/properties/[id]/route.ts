import { db } from "@/lib/db";
import { mobilePropertySelect } from "@/lib/properties/mobile-catalog";
import { handleApiError, notFound, ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const property = await db.property.findFirst({ where: { id, status: "PUBLISHED" }, select: mobilePropertySelect });
    if (!property) return notFound();
    return ok({ property, source: "database" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return handleApiError(new Error("Mobile listing unavailable"), { route: "GET /api/mobile/properties/[id]" }); }
}
