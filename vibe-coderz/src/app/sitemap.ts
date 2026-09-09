import type { MetadataRoute } from "next";
import { services, projects, articles } from "@/data/studio";
import { absolute } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/services",
    "/work",
    "/about",
    "/insights",
    "/contact",
    ...services.map((s) => `/services/${s.slug}`),
    ...projects.map((p) => `/work/${p.id}`),
    ...articles.map((a) => `/insights/${a.slug}`),
  ].map((path) => ({
    url: absolute(path),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path.split("/").length === 2 ? 0.8 : 0.6,
  }));
}
