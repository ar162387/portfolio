import { StudioPrinciples } from "@/components/studio/Experience";
import { PageIntro, Label, Process, CTA } from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
import { FounderNote } from "@/components/studio/VoiceSections";
export const metadata = pageMetadata(
  "The Studio",
  "Meet Shah Abdur Rehman, the founder of Vibecoderzz, building AI receptionists and custom CRM, booking and invoicing software for service businesses.",
  "/about",
);
export default function About() {
  return (
    <>
      <PageIntro
        label="THE STUDIO / OUR POINT OF VIEW"
        title="There’s a person behind the agent."
        description="I’m Shah Abdur Rehman. I build AI receptionists and business software, and I care about what happens when someone asks the question we didn’t rehearse."
      />
      <section className="about-statement">
        <div className="shell">
          <Label>BUILT FROM THE WORK</Label>
          <h2>
            The calendar is full.
            <br />
            The phone is ringing.
            <br />
            <em>Something has to give.</em>
          </h2>
          <p>
            Service businesses have real work to do. We focus on the moments
            around it: the enquiry that needs an answer, the booking that needs
            a place, and the details someone has to carry into the next step.
            Voice agents are our focus. Custom software helps where the
            workflow needs more than an integration.
          </p>
        </div>
      </section>
      <section className="detail-layout shell" style={{ paddingTop: 70 }}>
        <div className="detail-body">
          <h2>From the person behind the code</h2>
          <p>
            The studio grew out of Shah Abdur Rehman’s work across full-stack
            development, mobile products, and business systems. The portfolio
            includes CRM software, building management tools, restaurant
            operations, and location-aware commerce.
          </p>
          <p>
            That hands-on foundation shapes how we work: understand the process,
            make the decisions clear, and build something people can actually
            use.
          </p>
          <a className="text-link" href="https://www.instagram.com/vibecoderzai/" target="_blank" rel="noopener noreferrer">
            Follow the builds · @vibecoderzai ↗
          </a>
        </div>
        <aside className="detail-aside">
          <Label>OUR WORKING PRINCIPLES</Label>
          <h3>Clarity is part of the craft.</h3>
          <p>
            Direct communication. Useful documentation. Thoughtful technology
            choices. An honest conversation about scope and trade-offs.
          </p>
        </aside>
      </section>
      <FounderNote />
      <StudioPrinciples />
      <Process />
      <CTA />
    </>
  );
}
