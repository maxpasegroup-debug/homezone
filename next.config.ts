import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
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

export default nextConfig;
