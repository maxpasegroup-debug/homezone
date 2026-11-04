import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, forbidden, handleApiError, ok, rateLimited, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { env } from "@/lib/env";
import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/media/cloudinary";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

const allowedMimeTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "video/quicktime",
  "video/webm"
]);

const allowedFolders = new Set([
  "homezone/property-media",
  "homezone/property-documents",
  "homezone/property-reels"
]);

function uploadUnavailable(
  code: "PROPERTY_PHOTO_STORAGE_UNAVAILABLE" | "PROPERTY_PHOTO_UPLOAD_FAILED" | "PROPERTY_PHOTO_CONFIRMATION_UNAVAILABLE",
  stage: "configuration" | "provider-request" | "provider-response" | "provider-confirmation"
) {
  // Fixed categories only. Never record provider responses, URLs or credentials.
  logger.warn("Media upload unavailable", { stage, category: code });
  return ok({
    code,
    error: code === "PROPERTY_PHOTO_STORAGE_UNAVAILABLE"
      ? "Property photo storage is not configured. Please try again later."
      : code === "PROPERTY_PHOTO_UPLOAD_FAILED"
        ? "Property photo upload could not be completed. Refresh the listing before retrying."
        : "Property photo upload confirmation is unavailable. Refresh the listing before retrying.",
    success: false
  }, { status: code === "PROPERTY_PHOTO_STORAGE_UNAVAILABLE" ? 503 : 502 });
}

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

    const profile = await getOrCreateProfile(session.user);
    if(profile.verificationStatus==="SUSPENDED")return forbidden();
    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "homezone/property-media");

    if (!(file instanceof File)) {
      return apiError("File is required", 400);
    }

    if (folder === "homezone/property-documents" || ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) return apiError("Use authenticated private document storage, not public media upload.",400);

    if (!allowedFolders.has(folder)) {
      return apiError("Upload folder is not allowed", 400);
    }

    if (!allowedMimeTypes.has(file.type)) {
      return apiError("File type is not allowed", 400);
    }

    if (file.size > env.UPLOAD_MAX_BYTES) {
      return apiError("File is too large", 400);
    }

    let config: ReturnType<typeof getCloudinaryConfig>;
    try {
      config = getCloudinaryConfig();
    } catch {
      return uploadUnavailable("PROPERTY_PHOTO_STORAGE_UNAVAILABLE", "configuration");
    }
    const { cloudName, apiKey, apiSecret } = config;
    const timestamp = Math.round(Date.now() / 1000);
    const signature = signCloudinaryParams({ folder, timestamp }, apiSecret);

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("folder", folder);
    uploadForm.append("signature", signature);

    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: "POST",
          body: uploadForm
        }
      );
    } catch {
      return uploadUnavailable("PROPERTY_PHOTO_UPLOAD_FAILED", "provider-request");
    }

    if (!response.ok) {
      return uploadUnavailable("PROPERTY_PHOTO_UPLOAD_FAILED", "provider-response");
    }

    let data;
    try {
      data = await response.json();
      if (!data || typeof data !== "object" || typeof data.secure_url !== "string") {
        throw new Error("Invalid upload acknowledgment");
      }
      const uploaded = new URL(data.secure_url);
      if (uploaded.protocol !== "https:" || uploaded.username || uploaded.password ||
          uploaded.hash || (uploaded.port && uploaded.port !== "443")) {
        throw new Error("Invalid upload acknowledgment");
      }
    } catch {
      return uploadUnavailable("PROPERTY_PHOTO_CONFIRMATION_UNAVAILABLE", "provider-confirmation");
    }

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
