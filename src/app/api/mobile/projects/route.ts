import { mobileProjectCatalog, mobileProjectCatalogSchema } from "@/lib/builder/mobile-catalog";
import { handleApiError, ok, validationError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => params.getAll(key).length !== 1)) return validationError(null);
    const parsed = mobileProjectCatalogSchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await mobileProjectCatalog(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return handleApiError(new Error("Mobile projects unavailable"), { route: "GET /api/mobile/projects" });
  }
}
