import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/media/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "homezone/property-media");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
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
    return NextResponse.json(
      { error: data?.error?.message ?? "Cloudinary upload failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
    thumbnailUrl: data.thumbnail_url
  });
}
