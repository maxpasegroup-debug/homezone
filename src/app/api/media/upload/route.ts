import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, handleApiError, ok, rateLimited, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { env } from "@/lib/env";
import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/media/cloudinary";

export const runtime = "nodejs";

const allowedMimeTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm"
]);

const allowedFolders = new Set([
  "homezone/property-media",
  "homezone/property-reels"
]);

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "media:upload", session.user.id),
      limit: 20,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "homezone/property-media");

    if (!(file instanceof File)) {
      return apiError("File is required", 400);
    }

    if (!allowedFolders.has(folder)) {
      return apiError("Upload folder is not allowed", 400);
    }

    if (!allowedMimeTypes.has(file.type)) {
      return apiError("File type is not allowed", 400);
    }

    if (file.size > env.UPLOAD_MAX_BYTES) {
      return apiError("File is too large", 400);
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.round(Date.now() / 1000);
    const signature = signCloudinaryParams({ folder, timestamp }, apiSecret);

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("folder", folder);
    uploadForm.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: uploadForm
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return apiError("Media upload failed", 502);
    }

    const profile = await getOrCreateProfile(session.user);

    await auditLog({
      action: "media_uploaded",
      actorId: profile.id,
      entityType: "media",
      entityId: data.public_id,
      metadata: {
        bytes: file.size,
        folder,
        mimeType: file.type,
        resourceType: data.resource_type
      }
    });

    return ok({
      publicId: data.public_id,
      resourceType: data.resource_type,
      thumbnailUrl: data.thumbnail_url,
      url: data.secure_url
    });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/media/upload"
    });
  }
}
