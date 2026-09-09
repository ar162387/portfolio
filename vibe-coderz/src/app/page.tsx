import { Orbit, WorkGrid } from "@/components/studio/Interactive";
import {
  Button,
  Label,
  ServicesSection,
  Process,
  InsightsSection,
  CTA,
} from "@/components/studio/Shared";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-topline">
          <Label>INDEPENDENT SOFTWARE & AI STUDIO</Label>
          <span className="availability">
            <i /> Open for ambitious projects
          </span>
        </div>
        <div className="hero-body">
          <div className="hero-copy">
            <h1>
              Good ideas.
              <br />
              Serious <em>pull.</em>
            </h1>
            <p>
              We build the software, AI systems, and digital
              <br className="desktop-break" /> experiences that move your
              business forward.
            </p>
            <div className="hero-actions">
              <Button href="/contact">Let’s build something</Button>
              <Link href="/work" className="text-link">
                Explore our work <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="hero-footnote">
              <span className="tiny-cross">✳</span>
              <span>
                Built with intention.
                <br />
                Made for the real world.
              </span>
            </div>
          </div>
          <Orbit />
        </div>
        <div className="hero-bottom">
          <span>STRATEGY MEETS ENGINEERING. POSSIBILITIES FOLLOW.</span>
          <a href="#services">
            SCROLL TO EXPLORE <ArrowDown size={14} />
          </a>
        </div>
      </section>
      <div className="capability-strip">
        <div className="shell">
          <span>AI & AUTOMATION</span>
          <i>✳</i>
          <span>WEB & MOBILE PRODUCTS</span>
          <i>✳</i>
          <span>CUSTOM SOFTWARE</span>
          <i>✳</i>
          <span>SEO & GROWTH</span>
        </div>
      </div>
      <ServicesSection />
      <section className="work-section" id="work">
        <div className="shell">
          <div className="section-heading">
            <div>
              <Label>02 / SELECTED WORK</Label>
              <h2>
                Ideas, out in
                <br />
                the <em>real world.</em>
              </h2>
            </div>
            <div>
              <p>
                A closer look at the products we build
                <br />
                and the problems they’re made to solve.
              </p>
              <Link className="text-link" href="/work">
                Explore all projects <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <WorkGrid featured />
        </div>
      </section>
      <section className="manifesto shell">
        <Label>SMALL STUDIO. FULL PICTURE.</Label>
        <div>
          <h2>
            Your business isn’t a template.
            <br />
            Your software <span>shouldn’t be either.</span>
          </h2>
          <div className="manifesto-bottom">
            <p>
              We bring product thinking and hands-on engineering to the same
              table. From the first question to the final detail, we care about
              how the whole thing works.
            </p>
            <Link className="text-link" href="/about">
              Meet the studio <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <Process />
      <InsightsSection />
      <section className="faq-section shell">
        <Label>A FEW GOOD QUESTIONS</Label>
        <div>
          {[
            [
              "What kind of businesses do you work with?",
              "We work with founders, service businesses, and teams that need better digital products or internal tools. The strongest starting point is a clear problem, even if the solution is still taking shape.",
            ],
            [
              "Can you improve an existing product?",
              "Yes. We can begin with a focused review of the current product, its code, and its workflows, then agree on the changes worth making first.",
            ],
            [
              "How do you scope and price a project?",
              "We start with your goals, constraints, and existing systems. After discovery, we agree on deliverables, milestones, and pricing before the build begins.",
            ],
            [
              "Do you help after launch?",
              "We discuss support, maintenance, and further development during scoping so responsibilities and the next steps are clear before launch.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
