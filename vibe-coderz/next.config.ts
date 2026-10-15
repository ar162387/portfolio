import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return [
      {
        source: "/contact",
        destination: "/#book-call",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
