"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ChevronDown, Menu, X, Pause, Play } from "lucide-react";
import { groups, projects, studio } from "@/data/studio";
import { useStudioMotion } from "./Experience";
import { usePathname } from "next/navigation";
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
  return (
    <header className="header" ref={root}>
      <div className="nav-wrap">
        <Link
          href="/"
          className="wordmark"
          onClick={close}
          aria-label="Vibe Coderzz home"
        >
          <span className="brand-symbol">
            v<span>c</span>
          </span>
          vibe coderzz<span className="brand-dot">✳</span>
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
            onClick={() => setServicesOpen(!servicesOpen)}
          >
            Services <ChevronDown size={13} />
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
            >
              {name}
            </Link>
          ))}
          <Link className="nav-cta" href="/contact" onClick={close}>
            Let’s talk <ArrowUpRight size={17} />
          </Link>
        </nav>
      </div>
      {servicesOpen && (
        <div id="services-menu" className="mega-menu">
          <div className="mega-grid">
            {groups.map((g) => (
              <div key={g.code}>
                <p className="eyebrow">
                  <span className="orange-dot" />
                  {g.name}
                </p>
                {g.services.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/services/${s.slug}`}
                    onClick={close}
                  >
                    <strong>{s.name}</strong>
                    <span>{s.summary}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <Link className="mega-bottom" href="/services" onClick={close}>
            Three disciplines. One connected studio.{" "}
            <span>Explore all services ↗</span>
          </Link>
        </div>
      )}
    </header>
  );
}
export function Orbit() {
  const enabled = useStudioMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      el.classList.toggle("offscreen", !entry.isIntersecting),
    );
    observer.observe(el);
    const visibility = () => el.classList.toggle("hidden-tab", document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const el = ref.current;
    const hero = el?.closest<HTMLElement>(".hero");
    if (!el || !hero) return;
    if (!enabled || paused) {
      el.style.setProperty("--field-x", "0");
      el.style.setProperty("--field-y", "0");
      el.style.setProperty("--hero-travel", "0");
      return;
    }
    let frame = 0;
    let x = 0,
      y = 0;
    const render = () => {
      frame = 0;
      el.style.setProperty("--field-x", String(x));
      el.style.setProperty("--field-y", String(y));
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom > 0)
        el.style.setProperty(
          "--hero-travel",
          String(Math.min(1, Math.max(0, -bounds.top / bounds.height))),
        );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const bounds = hero.getBoundingClientRect();
      x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
      schedule();
    };
    const reset = () => {
      x = 0;
      y = 0;
      schedule();
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", reset);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", reset);
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [enabled, paused]);
  return (
    <div className={`orbit-art ${paused ? "paused" : ""}`} ref={ref}>
      <div className="field-stars" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <i
            key={i}
            style={
              {
                left: `${(i * 43 + 7) % 96}%`,
                top: `${(i * 29 + 13) % 91}%`,
                "--star-delay": `${(i % 7) * -0.9}s`,
                "--star-duration": `${5 + (i % 4)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="orbital-grid" />
      <div className="orbit-axis axis-one" />
      <div className="orbit-axis axis-two" />
      {["one", "two", "three"].map((track, ring) => (
        <div key={track} className={`orbit-track track-${track}`} aria-hidden="true">
          {Array.from({ length: 4 }, (_, dot) => (
            <span
              key={dot}
              className="orbit-particle"
              style={
                {
                  "--particle-start": `${dot * 25 + ring * 7}%`,
                  "--particle-end": `${dot * 25 + ring * 7 + 100}%`,
                  "--blink-duration": `${3.2 + dot * 0.7 + ring * 0.4}s`,
                  "--blink-delay": `${-dot * 1.3 - ring * 0.8}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
      <div className="blackhole">
        <div className="accretion" />
        <div className="event-horizon" />
      </div>
      <span className="orbit-coordinate coordinate-top">
        VC / FIELD EXPERIMENT 001
      </span>
      <span className="orbit-coordinate coordinate-bottom">
        IDEAS HAVE GRAVITY.
      </span>
      <span className="orbit-cross cross-one">+</span>
      <span className="orbit-cross cross-two">+</span>
      <div className="orbit-caption">
        <span className="orange-dot" /> A little cosmic energy. A lot of
        engineering.
      </div>
      <button
        className="motion-toggle"
        onClick={() => setPaused(!paused)}
        aria-label={
          paused ? "Play orbital animation" : "Pause orbital animation"
        }
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
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
  return (
    <form
      className="contact-form guided-brief"
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 2) advance(step + 1);
        else setReady(true);
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
          <a className="text-link" href={draft}>
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
