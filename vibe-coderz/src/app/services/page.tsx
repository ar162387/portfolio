import {
  PageIntro,
  ServicesSection,
  Process,
  CTA,
} from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Software, AI & SEO Services",
  "Explore AI automation, custom software, web and mobile development, technical SEO, and growth analytics services.",
  "/services",
);
export default function ServicesPage() {
  return (
    <>
      <PageIntro
        label="THE STUDIO / SERVICES"
        title="A connected way to build what’s next."
        description="From the tools your team uses to the way customers find you. Three complementary disciplines, built around your business."
      />
      <ServicesSection />
      <Process />
      <CTA />
    </>
  );
}
