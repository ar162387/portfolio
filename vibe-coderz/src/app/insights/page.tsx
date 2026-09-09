import { PageIntro, InsightsSection, CTA } from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Studio Insights",
  "Practical notes on software decisions, responsible automation, and search-ready website foundations from Vibecoderzz.",
  "/insights",
);
export default function Insights() {
  return (
    <>
      <PageIntro
        label="THE STUDIO / FIELD NOTES"
        title="Thinking behind the building."
        description="Practical perspectives on better software, useful automation, and the decisions that shape a digital business."
      />
      <InsightsSection />
      <CTA />
    </>
  );
}
