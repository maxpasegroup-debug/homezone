import { readVolumePropertyPhoto } from "@/lib/media/property-photo-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ filename: string }> };

async function respond(context: Context, head: boolean) {
  try {
    const photo = await readVolumePropertyPhoto((await context.params).filename);
    if (!photo) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    return new Response(head ? null : Uint8Array.from(photo.bytes), {
      headers: {
        "Content-Type": photo.contentType,
        "Content-Length": String(photo.bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline"
      }
    });
  } catch {
    // Filesystem paths and provider configuration must never reach a client.
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
}

export function GET(_request: Request, context: Context) { return respond(context, false); }
export function HEAD(_request: Request, context: Context) { return respond(context, true); }
