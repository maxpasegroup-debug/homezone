import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const stagingPhotoOrigin = "https://homezone-staging.up.railway.app";
const stagingPhotosEnabled = process.env.AUTH_STAGING_ORIGIN?.replace(/\/$/, "") === stagingPhotoOrigin &&
  (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL)?.replace(/\/$/, "") === stagingPhotoOrigin;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(stagingPhotosEnabled ? [{
        hostname: "homezone-staging.up.railway.app",
        protocol: "https" as const,
        pathname: "/api/property-photos/**"
      }] : []),
      {
        hostname: "res.cloudinary.com",
        protocol: "https"
      },
      {
        hostname: "images.unsplash.com",
        protocol: "https"
      }
    ]
  },
  typedRoutes: true
};

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"
  };
}
