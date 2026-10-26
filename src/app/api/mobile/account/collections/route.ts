import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { apiError, forbidden, ok, unauthorized } from "@/lib/api/response";
import { mobilePropertySelect } from "@/lib/properties/mobile-catalog";
import { buyerEnquirySelect } from "@/lib/leads/access";
import { z } from "zod";

export const dynamic = "force-dynamic";
const id = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
const query = z.object({ collection: z.enum(["saved", "shortlists", "shortlistItems", "enquiries"]),
  parent: id.optional(), cursor: z.string().min(1).max(512).optional() }).strict();
const token = z.tuple([z.literal(1), query.shape.collection, z.string(), z.string().datetime(), id]);
const size = 25;
function cursor(collection: string, parent: string | undefined, row: { createdAt: Date }, key: string) {
  return Buffer.from(JSON.stringify([1, collection, parent ?? "", row.createdAt.toISOString(), key])).toString("base64url");
}
function itemPage(rows: { createdAt: Date; propertyId: string; property: unknown }[], parent: string) {
  const page = rows.slice(0, size), last = page.at(-1);
  return { items: page.map(row => ({ property: row.property })),
    nextCursor: rows.length > size && last ? cursor("shortlistItems", parent, last, last.propertyId) : null };
}

// Keyset tokens select position, never identity or permission. Every read repeats
// actor/parent ownership and published-property filters, including after deletion.
export async function GET(request: Request) {
  try {
    const session = await auth(); if (!session?.user?.id) return unauthorized();
    const actor = await getOrCreateProfile(session.user);
    if (actor.verificationStatus === "SUSPENDED") return forbidden();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(k => params.getAll(k).length !== 1)) return apiError("Invalid collection query", 400);
    const parsed = query.safeParse(Object.fromEntries(params));
    if (!parsed.success) return apiError("Invalid collection query", 400);
    const { collection, parent } = parsed.data;
    if ((collection === "shortlistItems") !== !!parent) return apiError("Invalid collection parent", 400);
    let position: z.infer<typeof token> | undefined;
    if (parsed.data.cursor) {
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(parsed.data.cursor)) throw Error();
        position = token.parse(JSON.parse(Buffer.from(parsed.data.cursor, "base64url").toString("utf8")));
        if (position[1] !== collection || position[2] !== (parent ?? "")) throw Error();
      } catch { return apiError("Invalid collection cursor. Refresh this collection.", 400); }
    }
    const date = position ? new Date(position[3]) : null;
    if (date && !Number.isFinite(date.getTime())) return apiError("Invalid collection cursor", 400);
    const key = position?.[4];
    const propertyPosition = date && key ? { OR: [{ createdAt: { lt: date } }, { createdAt: date, propertyId: { lt: key } }] } : {};
    const recordPosition = date && key ? { OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: key } }] } : {};
    let items: unknown[] = [], nextCursor: string | null = null;
    if (collection === "saved") {
      const rows = await db.savedProperty.findMany({ where: { userId: actor.id, property: { status: "PUBLISHED" }, ...propertyPosition },
        select: { propertyId: true, createdAt: true, property: { select: mobilePropertySelect } },
        orderBy: [{ createdAt: "desc" }, { propertyId: "desc" }], take: size + 1 });
      const page = rows.slice(0, size), last = page.at(-1); items = page.map(r => r.property);
      if (rows.length > size && last) nextCursor = cursor(collection, parent, last, last.propertyId);
    } else if (collection === "shortlistItems") {
      if (!await db.propertyShortlist.findFirst({ where: { id: parent, userId: actor.id }, select: { id: true } })) return forbidden();
      const rows = await db.shortlistProperty.findMany({ where: { shortlistId: parent, shortlist: { userId: actor.id }, property: { status: "PUBLISHED" }, ...propertyPosition },
        select: { propertyId: true, createdAt: true, property: { select: mobilePropertySelect } },
        orderBy: [{ createdAt: "desc" }, { propertyId: "desc" }], take: size + 1 });
      ({ items, nextCursor } = itemPage(rows, parent!));
    } else if (collection === "shortlists") {
      const rows = await db.propertyShortlist.findMany({ where: { userId: actor.id, ...recordPosition },
        select: { id: true, name: true, createdAt: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: size + 1 });
      const page = rows.slice(0, size), last = page.at(-1);
      items = page.map(r => ({ id: r.id, name: r.name, items: [], itemsLoaded: false, nextCursor: null }));
      if (rows.length > size && last) nextCursor = cursor(collection, parent, last, last.id);
    } else {
      const rows = await db.lead.findMany({ where: { userId: actor.id, ...recordPosition },
        select: buyerEnquirySelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: size + 1 });
      const page = rows.slice(0, size), last = page.at(-1); items = page;
      if (rows.length > size && last) nextCursor = cursor(collection, parent, last, last.id);
    }
    return ok({ collection, parent: parent ?? null, items, nextCursor }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return apiError("Collection unavailable. Retry or refresh before continuing.", 503); }
}
