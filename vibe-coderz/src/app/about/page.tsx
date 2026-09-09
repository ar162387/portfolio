import { StudioPrinciples } from "@/components/studio/Experience";
import { PageIntro, Label, Process, CTA } from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "The Studio",
  "An independent software studio in Central London, bringing product thinking and hands-on engineering to custom software, AI, and digital experiences.",
  "/about",
);
export default function About() {
  return (
    <>
      <PageIntro
        label="THE STUDIO / OUR POINT OF VIEW"
        title="Independent minds. Shared ambition."
        description="Vibecoderzz began with a developer’s portfolio and grew into a studio with a broader purpose: building the systems that help businesses work better."
      />
      <section className="about-statement">
        <div className="shell">
          <Label>BUILT FROM THE WORK</Label>
          <h2>
            Stay curious about the problem.
            <br />
            Be precise about the solution.
            <br />
            <em>Care about the details.</em>
          </h2>
          <p>
            Based in Central London and working with clients worldwide, our practice
            connects software development, AI automation, and search visibility.
            We bring those disciplines together because your business needs them
            to work together.
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
      <StudioPrinciples />
      <Process />
      <CTA />
    </>
  );
}
