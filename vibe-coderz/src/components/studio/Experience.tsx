"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ServiceStory, serviceStories } from "./ServiceStory";
import {
  ArrowUpRight,
  Check,
  Maximize2,
  Pause,
  Play,
  X,
} from "lucide-react";

const motionEvent = "studio-motion-change";
function motionSnapshot() {
  try {
    return (
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      localStorage.getItem("studio-motion") !== "off"
    );
  } catch {
    return !matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
}
function subscribeMotion(callback: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  window.addEventListener(motionEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    query.removeEventListener("change", callback);
    window.removeEventListener(motionEvent, callback);
    window.removeEventListener("storage", callback);
  };
}
export function useStudioMotion() {
  return useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
}

/** Enhancement only: the server HTML remains visible without JavaScript. */
export function StudioExperience() {
  const enabled = useStudioMotion();
  const path = usePathname();
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.current?.style.setProperty(
        "--page-progress",
        String(max > 0 ? scrollY / max : 0),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [path]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) =>
      entries.forEach((entry) =>
        entry.target.classList.toggle("offscreen", !entry.isIntersecting),
      ),
    );
    document
      .querySelectorAll(".delivery-blueprint,.cta-section,.brief-signal")
      .forEach((el) => observer.observe(el));
    const visibility = () =>
      document.documentElement.classList.toggle(
        "tab-inactive",
        document.hidden,
      );
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [path]);
  useEffect(() => {
    if (!enabled) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const animation = entry.target.animate(
            [
              { opacity: 0.35, transform: "translateY(20px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
          );
          animations.push(animation);
        }),
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(
        ".section-heading,.page-intro h1,.intro-description,.service-column,.project-card,.article-card,.detail-body h2,.about-statement h2,.cta-inner>div,.project-facts",
      )
      .forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
    };
  }, [path, enabled]);
  return <div className="page-travel" ref={progress} aria-hidden="true" />;
}

export function MotionControl() {
  const enabled = useStudioMotion();
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return (
    <button
      className="studio-motion-control"
      type="button"
      disabled={reduced}
      aria-label={
        reduced
          ? "Reduced motion enabled by your system"
          : enabled
            ? "Turn off site motion"
            : "Turn on site motion"
      }
      aria-pressed={enabled}
      onClick={() => {
        try {
          localStorage.setItem("studio-motion", enabled ? "off" : "on");
        } catch {}
        window.dispatchEvent(new Event(motionEvent));
      }}
    >
      {enabled ? <Pause size={12} /> : <Play size={12} />}
      <span>
        {reduced ? "Reduced motion" : `Motion ${enabled ? "on" : "off"}`}
      </span>
    </button>
  );
}

type ServiceItem = { slug: string; name: string; summary: string };
export function ServiceAccordion({ items }: { items: ServiceItem[] }) {
  const [active, setActive] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );
  return (
    <div className="service-accordion">
      {items.map((s, i) => (
        <div
          className="service-disclosure"
          key={s.slug}
          data-open={active === i ? "true" : undefined}
          onPointerLeave={(e) => {
            cancelHover();
            if (e.pointerType === "mouse") setActive(null);
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setActive(null);
          }}
          onPointerEnter={(e) => {
            if (
              e.pointerType === "mouse" &&
              matchMedia("(hover:hover)").matches
            ) {
              cancelHover();
              hoverTimer.current = setTimeout(() => {
                setActive(i);
              }, 110);
            }
          }}
        >
          <button
            type="button"
            className="service-disclosure-trigger"
            aria-expanded={active === i}
            aria-controls={`service-panel-${s.slug}`}
            onClick={(e) => {
              cancelHover();
              const nativeEvent = e.nativeEvent as PointerEvent;
              if (nativeEvent.pointerType !== "mouse")
                setActive((current) => (current === i ? null : i));
            }}
            onFocus={() => setActive(i)}
          >
            <span className="disclosure-index">0{i + 1}</span>
            <span>{s.name}</span>
            <span className="disclosure-plus">+</span>
          </button>
          <div
            className="service-disclosure-panel"
            id={`service-panel-${s.slug}`}
            aria-hidden={active !== i}
          >
            <div>
              <p>{s.summary}</p>
              <Link href={`/services/${s.slug}`}>
                Explore service <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const methodSteps = [
  {
    name: "Find the real problem",
    label: "DISCOVER",
    text: "We ask questions, map your workflows, and agree on what a useful outcome looks like.",
    output: "A shared brief. A clear definition of useful.",
  },
  {
    name: "Make it tangible",
    label: "DEFINE",
    text: "We turn the scope into a clear direction and a working foundation you can respond to.",
    output: "A working direction, with the important decisions made visible.",
  },
  {
    name: "Build, test, refine",
    label: "DEVELOP",
    text: "You see progress through regular demos. We test the details and work through the edge cases.",
    output:
      "Working software, tested against the way it will actually be used.",
  },
  {
    name: "Launch with a plan",
    label: "DELIVER",
    text: "Documentation, handover, and an agreed next step. Your product has a life beyond launch.",
    output: "A supported handover and a plan for what comes next.",
  },
];
export function MethodJourney() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      if (!visible) return;
      const rows = Array.from(
        root.querySelectorAll<HTMLElement>(".method-step"),
      );
      const first = rows[0].getBoundingClientRect().top;
      const last = rows[rows.length - 1].getBoundingClientRect().top;
      const progress = Math.min(
        1,
        Math.max(0, (innerHeight * 0.5 - first) / (last - first)),
      );
      root.style.setProperty("--journey-progress", String(progress));
      const next = rows.reduce(
        (n, row, i) =>
          row.getBoundingClientRect().top < innerHeight * 0.56 ? i : n,
        0,
      );
      setActive((previous) => (previous === next ? previous : next));
    };
    const scroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) scroll();
    });
    observer.observe(root);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <section className="method-journey shell" ref={ref}>
      <div className="method-sticky">
        <p className="eyebrow">
          <span className="orange-dot" />
          03 / HOW WE WORK
        </p>
        <h2>
          Less mystery.
          <br />
          More <em>momentum.</em>
        </h2>
        <p>
          You work directly with the people building. A clear route from the
          first question to the next chapter.
        </p>
        <div className="method-instrument">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="dial-base" cx="60" cy="60" r="51" />
            <circle className="dial-fill" cx="60" cy="60" r="51" />
            <path d="M60 3v10M117 60h-10M60 117v-10M3 60h10" />
            <circle cx="60" cy="60" r="37" className="dial-inner" />
          </svg>
          <div>
            <span className="method-digit" key={active}>
              0{active + 1}
            </span>
            <span>/ 04</span>
          </div>
        </div>
        <div className="method-stops" aria-label="Jump to a process stage">
          {methodSteps.map((s, i) => (
            <button
              key={s.label}
              type="button"
              aria-label={`Go to ${s.label.toLowerCase()} stage`}
              aria-current={active === i ? "step" : undefined}
              onClick={() =>
                ref.current
                  ?.querySelectorAll(".method-step")
                  [i].scrollIntoView({
                    behavior: motionSnapshot() ? "smooth" : "instant",
                    block: "center",
                  })
              }
            >
              <span /> {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="method-track">
        <div className="method-line" aria-hidden="true" />
        {methodSteps.map((s, i) => (
          <article
            key={s.label}
            className={`method-step ${active === i ? "is-current" : ""} ${active > i ? "is-complete" : ""}`}
          >
            <span className="method-marker" aria-hidden="true">
              {active > i ? (
                <Check size={13} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <p className="eyebrow">{s.label}</p>
            <h3>{s.name}</h3>
            <p>{s.text}</p>
            <div className="method-output">
              <ArrowUpRight size={15} />
              <span>{s.output}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DeliveryBlueprint({
  items,
  group,
  service,
}: {
  items: string[];
  group: string;
  service: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const enabled = useStudioMotion();
  const container = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const story = serviceStories[service];
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!enabled || paused || !visible || items.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % items.length),
      1500,
    );
    return () => window.clearInterval(timer);
  }, [active, enabled, items.length, paused, visible]);
  return (
    <section
      className="delivery-blueprint"
      ref={container}
      data-playing={enabled && !paused && visible}
    >
      <div className="blueprint-heading">
        <p className="eyebrow">
          <span className="orange-dot" />
          THE ENGAGEMENT, UNPACKED
        </p>
        <button className="story-play" type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Play delivery story" : "Pause delivery story"} disabled={!enabled}>
          {paused ? <Play size={12} /> : <Pause size={12} />} {paused ? "Play" : "Pause"}
        </button>
      </div>
      <div className="blueprint-layout">
        <div className="blueprint-switches" aria-label="Explore deliverables">
          {items.map((item, i) => (
            <button
              key={item}
              type="button"
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              <span>0{i + 1}</span>
              <span className="story-choice"><strong>{story.stages[i]}</strong><small>{item}</small></span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <div
          className="blueprint-preview"
          aria-hidden="true"
          data-stage={active}
        >
          <span className="story-category">{group}</span>
          <h3 className="story-title">{story.title}</h3>
          <ServiceStory service={service} active={active} />
          <div className="story-timeline" key={`${active}-${paused}-${visible}`}>
            {items.map((item, i) => <i key={item} className={i < active ? "complete" : i === active ? "current" : ""} />)}
          </div>
          <div className="story-caption" key={active}><span>0{active + 1} / {story.stages[active]}</span><p>{story.captions[active]}</p></div>
        </div>
      </div>
      <p className="blueprint-note">
        Each part connects to the next. We agree the scope and priorities with
        you before work begins.
      </p>
    </section>
  );
}


export function ProjectGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const section = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const expandTrigger = useRef<HTMLButtonElement>(null);
  const closeViewer = () => {
    dialog.current?.close();
    setOpen(false);
    expandTrigger.current?.focus({ preventScroll: true });
  };
  const enabled = useStudioMotion();
  useEffect(() => {
    if (!open) return;
    const el = dialog.current;
    if (!el) return;
    el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      el.close();
    };
  }, [open]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const host = section.current;
      const stage = sticky.current;
      const track = rail.current;
      if (!host || !stage || !track) return;
      const stickyTop = innerWidth <= 760 ? 82 : 110;
      const travel = Math.max(host.offsetHeight - stage.offsetHeight, 1);
      const progress = Math.min(
        1,
        Math.max(0, (stickyTop - host.getBoundingClientRect().top) / travel),
      );
      track.scrollLeft = progress * (track.scrollWidth - track.clientWidth);
      const next = Math.round(progress * Math.max(images.length - 1, 0));
      setSelected((current) => (current === next ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [images.length]);
  return (
    <section
      className="project-explorer"
      ref={section}
      style={{ minHeight: `${100 + Math.max(images.length - 1, 0) * 92}vh` }}
    >
      <div className="project-explorer-sticky" ref={sticky}>
        <div className="explorer-heading">
        <div>
          <p className="eyebrow">
            <span className="orange-dot" />
            INSIDE THE PRODUCT
          </p>
          <h2>A closer look.</h2>
        </div>
        <span className="image-count" aria-live="polite">
          {String(selected + 1).padStart(2, "0")}{" "}
          <span>/ {String(images.length).padStart(2, "0")}</span>
        </span>
        </div>
        <div
        className="explorer-rail"
        ref={rail}
        aria-label={`${title} screenshots. Page scroll moves through the frames.`}
      >
        {images.map((src, i) => (
          <figure className="explorer-screen" key={src}>
            <Image
              className={enabled ? "image-arrive" : ""}
              src={src}
              alt={`${title} interface, view ${i + 1}`}
              fill
              sizes="(max-width:760px) 94vw, 85vw"
            />
            <figcaption>{String(i + 1).padStart(2, "0")}</figcaption>
            <button
              className="expand-image"
              ref={i === selected ? expandTrigger : undefined}
              tabIndex={i === selected ? 0 : -1}
              onClick={() => {
                setSelected(i);
                setOpen(true);
              }}
              aria-label={`Expand project image ${i + 1}`}
            >
              <Maximize2 size={16} /> Expand
            </button>
          </figure>
        ))}
        </div>
        <p className="explorer-hint">
        {images.length > 1
          ? "Keep scrolling — the page carries you through every frame."
          : "Open the frame for the full picture."}
        </p>
      </div>
      {open && (
        <dialog
          className="image-dialog"
          ref={dialog}
          onCancel={(e) => {
            e.preventDefault();
            closeViewer();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeViewer();
          }}
          aria-label={`${title} image viewer`}
        >
          <div className="dialog-toolbar">
            <span>
              {title} / {selected + 1} of {images.length}
            </span>
            <button
              autoFocus
              aria-label="Close image viewer"
              onClick={closeViewer}
            >
              <X />
            </button>
          </div>
          <div className="dialog-picture">
            <Image
              src={images[selected]}
              alt={`${title} full interface, view ${selected + 1}`}
              fill
              sizes="95vw"
            />
          </div>
        </dialog>
      )}
    </section>
  );
}

export function ReadingGuide({ sections }: { sections: string[] }) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>(".article-body section[id]"),
      );
      let next = 0;
      rows.forEach((r, i) => {
        if (r.getBoundingClientRect().top <= innerHeight * 0.4) next = i;
      });
      setActive((n) => (n === next ? n : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <nav className="reading-guide" ref={ref} aria-label="In this article">
      <span className="eyebrow">IN THIS NOTE</span>
      {sections.map((s, i) => (
        <a
          key={s}
          href={`#note-section-${i}`}
          aria-current={active === i ? "location" : undefined}
        >
          <span>{String(i + 1).padStart(2, "0")}</span>
          {s}
        </a>
      ))}
    </nav>
  );
}

export function StudioPrinciples() {
  const principles = [
    {
      word: "Curiosity",
      line: "Ask the useful question.",
      text: "What is the real friction? Who feels it? What would a better day look like? We begin by listening, mapping the work, and questioning assumptions.",
    },
    {
      word: "Clarity",
      line: "Make the thinking visible.",
      text: "We turn conversations into decisions you can respond to: a shared scope, a working prototype, a clear trade-off. No black box between the idea and the build.",
    },
    {
      word: "Craft",
      line: "Care past the first impression.",
      text: "A good interface is only the beginning. The edge cases, the handover, the way data moves, and the next person maintaining it all deserve attention.",
    },
  ];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const enabled = useStudioMotion();
  useEffect(() => {
    if (!enabled || paused) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % principles.length),
      1500,
    );
    return () => window.clearInterval(timer);
  }, [active, enabled, paused, principles.length]);
  return (
    <section
      className="principle-lab shell"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div>
        <p className="eyebrow">
          <span className="orange-dot" />
          THE WAY WE THINK
        </p>
        <h2>
          Three instincts.
          <br />
          <em>One practice.</em>
        </h2>
        <div className="principle-choices">
          {principles.map((p, i) => (
            <button
              type="button"
              key={p.word}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              <span>0{i + 1}</span>
              {p.word}
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
      </div>
      <div
        className="principle-display"
        data-principle={active}
        aria-live="polite"
      >
        <div className="principle-sculpture" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>✳</span>
        </div>
        <div key={active} className="principle-copy">
          <span className="eyebrow">
            0{active + 1} / {principles[active].word.toUpperCase()}
          </span>
          <h3>{principles[active].line}</h3>
          <p>{principles[active].text}</p>
        </div>
      </div>
    </section>
  );
}
