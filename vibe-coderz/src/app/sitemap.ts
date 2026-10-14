import type { MetadataRoute } from "next";
import { services, projects } from "@/data/studio";
import { absolute } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/services",
    "/work",
    "/about",
    "/contact",
    "/privacy",
    ...services.map((s) => `/services/${s.slug}`),
    ...projects.map((p) => `/work/${p.id}`),
  ].map((path) => ({
    url: absolute(path),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path.split("/").length === 2 ? 0.8 : 0.6,
  }));
}
