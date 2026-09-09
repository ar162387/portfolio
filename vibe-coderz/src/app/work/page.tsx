import { WorkGrid } from "@/components/studio/Interactive";
import { PageIntro, CTA } from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Selected Work & Case Studies",
  "Explore custom CRM systems, mobile apps, restaurant platforms, and building management software by Vibe Coderzz.",
  "/work",
);
export default function WorkPage() {
  return (
    <>
      <PageIntro
        label="THE STUDIO / SELECTED WORK"
        title="Built to do something useful."
        description="Sales operations, local commerce, creative tools, and everyday management. A selection of the products we’ve worked on."
      />
      <section className="shell page-content">
        <WorkGrid />
      </section>
      <CTA />
    </>
  );
}
