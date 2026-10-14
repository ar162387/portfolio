import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    const retiredServices = [
      "ai-automation", "ai-agents", "chatbots", "web-development",
      "ecommerce", "web-mobile-apps", "technical-seo", "organic-growth",
      "analytics-insights", "answer-engine-optimisation",
    ];
    return [
      ...retiredServices.map((slug) => ({
        source: `/services/${slug}`,
        destination: "/services",
        permanent: true,
      })),
      {
        source: "/insights/:path*",
        destination: "/",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
