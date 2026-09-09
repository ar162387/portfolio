import Link from "next/link";
import { ServiceAccordion, MethodJourney, MotionControl } from "./Experience";
import { ArrowUpRight } from "lucide-react";
import { groups, articles, studio } from "@/data/studio";
export function Button({
  href,
  children,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Link
      className={`button ${light ? "light-button" : "orange-button"}`}
      href={href}
    >
      {children}
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      <span className="orange-dot" />
      {children}
    </p>
  );
}
export function PageIntro({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro shell">
      <Label>{label}</Label>
      <h1>{title}</h1>
      <p className="intro-description">{description}</p>
    </section>
  );
}
export function ServicesSection() {
  return (
    <section className="services-section shell" id="services">
      <div className="section-heading">
        <div>
          <Label>01 / WHAT WE DO</Label>
          <h2>
            Built for the way
            <br />
            you want to <em>work.</em>
          </h2>
        </div>
        <p>
          One studio for the software you need,
          <br className="desktop-break" /> the work you can automate, and
          <br className="desktop-break" /> the growth you can understand.
        </p>
      </div>
      <div className="service-columns">
        {groups.map((g) => (
          <article className="service-column" key={g.code}>
            <div
              className={`service-art service-art-${g.code}`}
              aria-hidden="true"
            >
              {g.code === "01" ? (
                <div className="node-network">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              ) : g.code === "02" ? (
                <div className="code-art">
                  <span>⌘</span>
                  <i />
                  <i />
                  <i />
                </div>
              ) : (
                <div className="chart-art">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <span>↗</span>
                </div>
              )}
              <span className="art-index">[{g.code}]</span>
            </div>
            <h3>{g.name}</h3>
            <p>{g.caption}</p>
            <ServiceAccordion items={g.services} />
          </article>
        ))}
      </div>
    </section>
  );
}
export function Process() {
  return <MethodJourney />;
}
export function InsightsSection() {
  return (
    <section className="insights-section shell">
      <div className="section-heading">
        <div>
          <Label>04 / STUDIO NOTES</Label>
          <h2>A little perspective.</h2>
        </div>
        <Link className="text-link" href="/insights">
          All insights <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="article-grid">
        {articles.map((a, i) => (
          <Link
            href={`/insights/${a.slug}`}
            className="article-card"
            key={a.slug}
          >
            <div className={`article-art article-art-${i}`} aria-hidden="true">
              <span>
                {["{ → }", "human + machine", "find. understand. act."][i]}
              </span>
              <span className="note-no">NOTE / 00{i + 1}</span>
            </div>
            <p className="eyebrow">{a.category} · 3 MIN READ</p>
            <h3>{a.title}</h3>
            <span className="text-link">
              Read the note <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
export function CTA() {
  return (
    <section className="cta-section">
      <div className="shell cta-inner">
        <div>
          <Label>GOOD THINGS START WITH A CONVERSATION</Label>
          <h2>
            Big idea?
            <br />
            Let’s give it <em>gravity.</em>
          </h2>
        </div>
        <div>
          <p>
            Tell us what you’re thinking.
            <br />
            We’ll help you find the next move.
          </p>
          <Button href="/contact">Start a conversation</Button>
        </div>
        <span className="cta-orbit" aria-hidden="true" />
      </div>
    </section>
  );
}
export function Footer() {
  return (
    <footer className="footer shell">
      <div className="footer-top">
        <Link href="/" className="wordmark">
          vibecoderzz<span className="brand-dot">✳</span>
        </Link>
        <p>
          Independent minds.
          <br />
          Connected possibilities.
        </p>
        <div>
          <a href={`mailto:${studio.email}`}>{studio.email} ↗</a>
          <span>Central London, United Kingdom · Working worldwide</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Vibecoderzz</span>
        <nav aria-label="Footer navigation">
          <Link href="/services">Services</Link>
          <Link href="/work">Work</Link>
          <Link href="/about">Studio</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <MotionControl />
      </div>
    </footer>
  );
}
