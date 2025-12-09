import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export if needed, but standard build is fine.
  // Allow images from standard domains or just local is fine for now.
  images: {
    unoptimized: true // For static export compatibility typically, but good for local dev
  }
};

export default nextConfig;
