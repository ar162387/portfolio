import Link from "next/link";
import { DiscoveryCallLink } from "./DiscoveryCallLink";
import { MethodJourney, MotionControl } from "./Experience";
import { ArrowUpRight, AudioLines, Database } from "lucide-react";
import { studio } from "@/data/studio";
import { PhoneContacts } from "./PhoneContacts";
import { ThemeControl } from "./ThemeControl";
export function Button({
  href,
  children,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  if (href.split("?")[0] === "/contact") {
    return <DiscoveryCallLink className={`button ${light ? "light-button" : "orange-button"}`}>{children}<ArrowUpRight size={18} /></DiscoveryCallLink>;
  }
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
          <Label>THE FRONT DESK. AND WHAT’S BEHIND IT.</Label>
          <h2>
            A good conversation.
            <br />
            A useful <em>follow-through.</em>
          </h2>
        </div>
        <p>
          Start with your calls. If the work behind them needs attention too,
          we can help with that. Each has its own scope.
        </p>
      </div>
      <div className="voice-offer-layout">
        <article className="voice-offer-primary"><AudioLines size={35} strokeWidth={1.2} /><span className="eyebrow">THE FRONT DESK</span><h3>Someone to<br /><em>take the call.</em></h3><p>An AI receptionist shaped around your business. Routine answers, enquiry details and booking flows, with a route to your team when it’s needed.</p><ul><li>Overflow and after-hours coverage, as agreed</li><li>Booking through supported calendars</li><li>A defined plan for testing and ongoing care</li></ul><Link className="text-link" href="/services/voice-agents">Explore AI receptionists <ArrowUpRight size={17} /></Link></article>
        <article className="voice-offer-secondary"><Database size={29} strokeWidth={1.3} /><span className="eyebrow">BEHIND THE DESK</span><h3>Less chasing.<br /><em>More doing.</em></h3><p>Custom CRM, booking and invoicing software for the work that follows. We start with the process that’s getting in your way.</p><p className="offer-aside">Your existing tools may already do the job. We’ll check before proposing a build.</p><Link className="text-link" href="/services/custom-software">Explore business software <ArrowUpRight size={17} /></Link></article>
      </div>
    </section>
  );
}
export function Process() {
  return <MethodJourney />;
}
export function CTA({ software = false }: { software?: boolean }) {
  return (
    <section className="cta-section">
      <div className="shell cta-inner">
        <div>
          <Label>{software ? "LET’S FOLLOW THE WORK" : "YOUR BUSINESS. YOUR CALLS."}</Label>
          <h2>
            {software ? "Where does" : "What happens when"}
            <br />
            {software ? <>the work <em>get stuck?</em></> : <>you can’t <em>pick up?</em></>}
          </h2>
        </div>
        <div>
          <p>
            {software ? "Show us the spreadsheet. Or the five tabs." : "Tell us what callers need from you."}
            <br />
            {software ? "We’ll find a useful first workflow to fix." : "We’ll work through a relevant demo together."}
          </p>
          <Button href={software ? "/contact?service=software" : "/contact"}>{software ? "Discuss your workflow" : "Request your demo"}</Button>
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
          AI receptionists.
          <br />
          Custom booking & invoicing software.
        </p>
        <div>
          <a href={`mailto:${studio.email}`}>{studio.email} ↗</a>
          <PhoneContacts placement="footer" />
          <span>Serving businesses in the USA, UK & Australia</span>
          <a href="https://www.instagram.com/vibecoderzai/" target="_blank" rel="noopener noreferrer">Follow the founder · @vibecoderzai ↗</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Vibecoderzz</span>
        <nav aria-label="Footer navigation">
          <Link href="/services">Services</Link>
          <Link href="/work">Work</Link>
          <Link href="/about">Studio</Link>
          <DiscoveryCallLink>Contact</DiscoveryCallLink>
          <Link href="/privacy">Privacy</Link>
          <a href="#cookie-settings">Cookie settings</a>
        </nav>
      </div>
      <div className="footer-preferences">
        <span>Appearance</span>
        <ThemeControl />
        <MotionControl />
      </div>
    </footer>
  );
}
