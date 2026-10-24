import { mobileCatalog, mobileCatalogSchema } from "@/lib/properties/mobile-catalog";
import { handleApiError, ok, validationError } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => params.getAll(key).length !== 1)) return validationError(null);
    const parsed = mobileCatalogSchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await mobileCatalog(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch { return handleApiError(new Error("Mobile catalog unavailable"), { route: "GET /api/mobile/properties" }); }
}
