import { HeroSculpture } from "@/components/studio/ModelVisual";
import { WorkGrid } from "@/components/studio/Interactive";
import {
  Button,
  Label,
  ServicesSection,
  Process,
  InsightsSection,
  CTA,
} from "@/components/studio/Shared";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
export const metadata = { alternates: { canonical: "/" } };

const clients = [
  { name: "RAR Studio", logo: "/client-logos/rar-studio.png", width: 1002, height: 547 },
  { name: "DoorStep", logo: "/client-logos/doorstep.svg", width: 1080, height: 1080 },
  { name: "TGIF Dabba", logo: "/client-logos/tgif-dabba.jpg", width: 1261, height: 192 },
  { name: "KIIR", logo: "/client-logos/kiir.png", width: 117, height: 44 },
  { name: "Heal Pakistan", logo: "/client-logos/heal-pakistan.jpg", width: 113, height: 123 },
  { name: "Velnox", logo: "/client-logos/velnox.webp", width: 705, height: 625 },
  { name: "Black Stone", logo: "/client-logos/black-stone.png", width: 1681, height: 2123 },
  { name: "NIMBESS", logo: "/client-logos/nimbess.png", width: 8000, height: 1577 },
];

function ClientLogoSet({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="client-logo-set" aria-hidden={duplicate || undefined}>
      {clients.map((client) => (
        <span
          className={`client-logo client-logo-${client.name.toLowerCase().replaceAll(" ", "-")}`}
          key={client.name}
        >
          <Image
            src={client.logo}
            alt={duplicate ? "" : `${client.name} logo`}
            width={client.width}
            height={client.height}
            sizes="180px"
          />
        </span>
      ))}
    </div>
  );
}

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
          <HeroSculpture />
        </div>
        <div className="hero-bottom">
          <span>STRATEGY MEETS ENGINEERING. POSSIBILITIES FOLLOW.</span>
          <a href="#services">
            SCROLL TO EXPLORE <ArrowDown size={14} />
          </a>
        </div>
      </section>
      <div className="capability-strip" aria-label="Selected clients">
        <div className="client-marquee">
          <div className="client-marquee-track">
            <ClientLogoSet />
            <ClientLogoSet duplicate />
          </div>
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
