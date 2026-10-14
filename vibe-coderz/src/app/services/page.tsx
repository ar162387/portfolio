import {
  PageIntro,
  ServicesSection,
  Process,
  CTA,
} from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "AI Receptionists & Custom Business Software",
  "AI voice receptionists for enquiries and appointment booking, plus custom CRM, booking and invoicing software for service businesses.",
  "/services",
);
export default function ServicesPage() {
  return (
    <>
      <PageIntro
        label="THE STUDIO / SERVICES"
        title="Take care of the call. Keep the work moving."
        description="AI receptionists are our focus. Custom CRM, booking and invoicing software helps with the work behind them. Start where your business needs a hand."
      />
      <ServicesSection />
      <Process />
      <CTA />
    </>
  );
}
