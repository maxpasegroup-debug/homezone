import { mobileProjectDetail, mobileProjectDetailSchema } from "@/lib/builder/mobile-catalog";
import { handleApiError, notFound, ok, validationError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) return notFound();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => params.getAll(key).length !== 1)) return validationError(null);
    const parsed = mobileProjectDetailSchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return validationError(parsed.error);
    const project = await mobileProjectDetail(id, parsed.data.unitsPage);
    if (!project) return notFound();
    return ok({ project, source: "database" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return handleApiError(new Error("Mobile project unavailable"), { route: "GET /api/mobile/projects/[id]" });
  }
}
