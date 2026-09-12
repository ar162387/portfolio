"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  AudioLines,
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  Code2,
  Database,
  FileText,
  Menu,
  MessageCircleMore,
  PanelsTopLeft,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingUp,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { groups, projects, studio } from "@/data/studio";
import { usePathname } from "next/navigation";
import { trackEvent } from "./Analytics";

const serviceIcons: Record<string, LucideIcon> = {
  "ai-automation": Workflow,
  "ai-agents": Bot,
  "voice-agents": AudioLines,
  chatbots: MessageCircleMore,
  "web-development": PanelsTopLeft,
  "custom-software": Database,
  ecommerce: ShoppingBag,
  "web-mobile-apps": Smartphone,
  "technical-seo": Search,
  "organic-growth": FileText,
  "analytics-insights": ChartNoAxesCombined,
  "answer-engine-optimisation": Sparkles,
};

const groupIcons = [BrainCircuit, Code2, TrendingUp];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const path = usePathname();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    function close(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setServicesOpen(false);
        const trigger = root.current?.querySelector<HTMLButtonElement>(
          window.innerWidth <= 760 ? ".mobile-toggle" : ".nav-service",
        );
        trigger?.focus();
      }
    }
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setServicesOpen(false);
      }
    }
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  const close = () => {
    setOpen(false);
    setServicesOpen(false);
  };
  const closeServicesOnPointer = (pointerType: string) => {
    if (pointerType === "mouse") setServicesOpen(false);
  };
  return (
    <header
      className="header"
      ref={root}
      onPointerLeave={(event) => closeServicesOnPointer(event.pointerType)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setServicesOpen(false);
        }
      }}
    >
      <div className="nav-wrap">
        <Link
          href="/"
          className="wordmark"
          onClick={close}
          onPointerEnter={(event) =>
            closeServicesOnPointer(event.pointerType)
          }
          aria-label="Vibecoderzz home"
        >
          <span className="brand-symbol">
            v<span>c</span>
          </span>
          vibecoderzz<span className="brand-dot">✳</span>
        </Link>
        <button
          className="mobile-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            setServicesOpen(false);
          }}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          className={open ? "nav-links is-open" : "nav-links"}
          aria-label="Main navigation"
        >
          <button
            className={servicesOpen ? "nav-service active" : "nav-service"}
            aria-expanded={servicesOpen}
            aria-controls="services-menu"
            aria-haspopup="true"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setServicesOpen(true);
            }}
            onFocus={() => setServicesOpen(true)}
            onClick={(event) => {
              const tapNavigation =
                window.innerWidth <= 760 ||
                window.matchMedia("(hover: none)").matches;
              if (tapNavigation || event.detail === 0) {
                setServicesOpen(!servicesOpen);
              }
            }}
          >
            Services
          </button>
          {[
            ["/work", "Work"],
            ["/about", "Studio"],
            ["/insights", "Insights"],
          ].map(([url, name]) => (
            <Link
              key={url}
              href={url}
              aria-current={path.startsWith(url) ? "page" : undefined}
              onClick={close}
              onPointerEnter={(event) =>
                closeServicesOnPointer(event.pointerType)
              }
            >
              {name}
            </Link>
          ))}
          <Link
            className="nav-cta"
            href="/contact"
            onClick={close}
            onPointerEnter={(event) =>
              closeServicesOnPointer(event.pointerType)
            }
          >
            Let’s talk <ArrowUpRight size={17} />
          </Link>
        </nav>
      </div>
      {servicesOpen && (
        <div id="services-menu" className="mega-menu">
          <div className="mega-grid">
            {groups.map((g, groupIndex) => {
              const GroupIcon = groupIcons[groupIndex];
              return (
                <section className="mega-column" key={g.code}>
                  <div className="mega-column-heading">
                    <span className="mega-category-icon">
                      <GroupIcon size={20} strokeWidth={1.6} />
                    </span>
                    <span>
                      <small>DISCIPLINE {g.code}</small>
                      <strong>{g.name}</strong>
                    </span>
                  </div>
                  <div className="mega-services">
                    {g.services.map((s) => {
                      const ServiceIcon = serviceIcons[s.slug];
                      return (
                        <Link
                          className="mega-service-link"
                          key={s.slug}
                          href={`/services/${s.slug}`}
                          onClick={close}
                        >
                          <span className="mega-service-icon">
                            <ServiceIcon size={17} strokeWidth={1.7} />
                          </span>
                          <span className="mega-service-copy">
                            <strong>{s.name}</strong>
                            <small>{s.summary}</small>
                          </span>
                          <span className="mega-service-arrow">
                            <ArrowUpRight size={15} />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <Link className="mega-bottom" href="/services" onClick={close}>
            <span className="mega-bottom-copy">
              <small>THE FULL PICTURE</small>
              <strong>
                Three disciplines. <em>One connected studio.</em>
              </strong>
            </span>
            <span className="mega-bottom-action">
              Explore all services
              <i>
                <ArrowUpRight size={18} />
              </i>
            </span>
          </Link>
        </div>
      )}
    </header>
  );
}
export function WorkGrid({ featured = false }: { featured?: boolean }) {
  const [filter, setFilter] = useState("All");
  const list = featured
    ? projects.filter((p) => ["blackstone-crm", "around-you"].includes(p.id))
    : projects.filter((p) => filter === "All" || p.type === filter);
  return (
    <>
      {!featured && (
        <div className="filters" aria-label="Filter projects">
          {["All", "Web", "Mobile"].map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}{" "}
              <span>
                {f === "All"
                  ? projects.length
                  : projects.filter((p) => p.type === f).length}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="work-grid">
        {list.map((p, i) => (
          <Link
            className={`project-card project-${p.id}`}
            href={`/work/${p.id}`}
            key={p.id}
          >
            <div className="project-visual">
              <div className="project-overline">
                <span>
                  {p.type === "Mobile"
                    ? "MOBILE EXPERIENCE"
                    : "BUSINESS SOFTWARE"}
                </span>
                <ArrowUpRight size={20} />
              </div>
              <span className="project-brand">
                {p.id === "blackstone-crm"
                  ? "BlackStone"
                  : p.id === "around-you"
                    ? "AroundYou"
                    : p.title}
                <span>↗</span>
              </span>
              <div
                className={
                  p.type === "Mobile"
                    ? "project-screen mobile-screen"
                    : "project-screen"
                }
              >
                <Image
                  src={p.image}
                  alt={`${p.title} application interface`}
                  fill
                  sizes="(max-width: 700px) 90vw, 45vw"
                />
              </div>
              <span className="visual-number">0{i + 1} / SELECTED WORK</span>
            </div>
            <div className="project-info">
              <div>
                <h3>{p.title}</h3>
                <p>{p.category}</p>
              </div>
              <span className="circle-arrow">
                <ArrowUpRight size={19} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
export function ContactForm() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    service: groups[0].name,
    budget: "Not sure yet",
    message: "",
    name: "",
    email: "",
  });
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const update = (field: keyof typeof values, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setReady(false);
    setCopied(false);
  };
  const body = `Name: ${values.name}\nEmail: ${values.email}\nService: ${values.service}\nBudget: ${values.budget}\n\n${values.message}`;
  const draft = `mailto:${studio.email}?subject=${encodeURIComponent("Project enquiry — " + values.name)}&body=${encodeURIComponent(body)}`;
  const advance = (next: number) => {
    setStep(next);
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  };
  const prepareEnquiry = () => {
    trackEvent("contact_enquiry_prepared", { service: values.service, budget: values.budget });
    setReady(true);
  };
  return (
    <form
      className="contact-form guided-brief"
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 2) advance(step + 1);
        else prepareEnquiry();
      }}
    >
      <div className="brief-tracker">
        <div className="brief-segments" aria-label={`Step ${step + 1} of 3`}>
          {["Direction", "The idea", "Say hello"].map((name, i) => (
            <button
              key={name}
              type="button"
              disabled={i > step}
              aria-current={step === i ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${name}`}
              onClick={() => advance(i)}
            >
              <span />
              {name}
            </button>
          ))}
        </div>
        <span>0{step + 1} / 03</span>
      </div>
      <div
        className="brief-signal"
        aria-hidden="true"
        data-step={ready ? 3 : step}
      >
        <div className="signal-line" />
        <span className="signal-node node-a">01</span>
        <span className="signal-node node-b">02</span>
        <span className="signal-node node-c">03</span>
        <i className="signal-packet" />
        <span className="signal-caption">
          {ready
            ? "READY FOR A CONVERSATION"
            : [
                "FIND THE DIRECTION",
                "GIVE THE IDEA SOME SHAPE",
                "CONNECT THE DOTS",
              ][step]}
        </span>
      </div>
      <div className="brief-stage" key={step}>
        <h2 ref={heading} tabIndex={-1}>
          {
            [
              "What’s your next move?",
              "Tell us what’s on your mind.",
              "Let’s put a name to the idea.",
            ][step]
          }
        </h2>
        <p className="brief-stage-intro">
          {
            [
              "Start with a direction. We can work out the details together.",
              "A few useful details beat a perfect pitch. What would you like to change?",
              "Your brief is taking shape. Add your details, then review it in your email app.",
            ][step]
          }
        </p>
        {step === 0 && (
          <>
            <fieldset className="brief-options">
              <legend>What do you need?</legend>
              {[
                ...groups.map((g) => g.name),
                "Let’s figure it out together",
              ].map((name, i) => (
                <label
                  key={name}
                  className={values.service === name ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="service"
                    value={name}
                    checked={values.service === name}
                    onChange={() => update("service", name)}
                  />
                  <span className="option-index">0{i + 1}</span>
                  <span>{name}</span>
                  <span className="option-mark">
                    {values.service === name ? "↗" : "+"}
                  </span>
                </label>
              ))}
            </fieldset>
            <label>
              Budget range (USD)
              <select
                name="budget"
                value={values.budget}
                onChange={(e) => update("budget", e.target.value)}
              >
                {[
                  "Not sure yet",
                  "Under $5,000",
                  "$5,000–$15,000",
                  "$15,000–$30,000",
                  "$30,000+",
                ].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {step === 1 && (
          <label>
            A little about your project
            <textarea
              name="message"
              value={values.message}
              onChange={(e) => update("message", e.target.value)}
              required
              minLength={20}
              maxLength={4000}
              rows={6}
              placeholder="What are you building, changing, or trying to solve?"
            />
            <span className="brief-character-count">
              {values.message.length} / 4000 · at least 20 characters
            </span>
          </label>
        )}
        {step === 2 && (
          <>
            <div className="brief-summary">
              <span className="eyebrow">YOUR STARTING POINT</span>
              <p>
                {values.service} <span> / {values.budget}</span>
              </p>
              <p className="brief-excerpt">{values.message}</p>
              <button type="button" onClick={() => advance(1)}>
                Edit your idea ↗
              </button>
            </div>
            <div className="form-row">
              <label>
                Your name
                <input
                  name="name"
                  value={values.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoComplete="name"
                  required
                  placeholder="Alex Morgan"
                  maxLength={100}
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  value={values.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="alex@company.com"
                />
              </label>
            </div>
          </>
        )}
      </div>
      <div className="brief-actions">
        {step > 0 ? (
          <button
            className="brief-back"
            type="button"
            onClick={() => advance(step - 1)}
          >
            ← Back
          </button>
        ) : (
          <span className="brief-small-note">
            A clear starting point.
            <br />
            No commitment required.
          </span>
        )}
        <button className="button orange-button" type="submit">
          {step < 2 ? "Continue" : "Prepare project enquiry"}
          <ArrowUpRight size={18} />
        </button>
      </div>
      <p className="form-note">
        This prepares an email in your own email app. Nothing is sent until you
        send it.
      </p>
      {ready && (
        <div className="form-result" role="status">
          <p>Your brief is ready. Open your email app to review and send it.</p>
          <a className="text-link" href={draft} onClick={() => trackEvent("contact_email_draft_opened", { service: values.service })}>
            Open email draft <ArrowUpRight size={16} />
          </a>
          <button
            className="copy-brief"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(body);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Brief copied ✓" : "Copy your brief"}
          </button>
          <p>
            Or email <a href={`mailto:${studio.email}`}>{studio.email}</a>{" "}
            directly.
          </p>
        </div>
      )}
    </form>
  );
}
