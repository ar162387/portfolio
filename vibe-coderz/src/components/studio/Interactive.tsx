"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DiscoveryCallLink } from "./DiscoveryCallLink";
import Image from "next/image";
import {
  ArrowUpRight,
  AudioLines,
  Bot,
  ChartNoAxesCombined,
  Database,
  FileText,
  Menu,
  MessageCircleMore,
  PanelsTopLeft,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { groups, projects } from "@/data/studio";
import { usePathname } from "next/navigation";
import { PhoneContacts } from "./PhoneContacts";

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
        <div className="nav-actions">
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
        </div>
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
          <DiscoveryCallLink
            className="nav-cta"
            onClick={close}
            onPointerEnter={(event) =>
              closeServicesOnPointer(event.pointerType)
            }
          >
            Request a demo <ArrowUpRight size={17} />
          </DiscoveryCallLink>
        </nav>
        <PhoneContacts placement="header" />
      </div>
      {servicesOpen && (
        <div id="services-menu" className="mega-menu">
          <div className="mega-grid">
            {groups.map((g) => {
              return (
                <section className="mega-column" key={g.code}>
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
                Calls and bookings. <em>The software that follows.</em>
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
    ? projects.filter((p) => ["blackstone-crm", "bms-system"].includes(p.id))
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
