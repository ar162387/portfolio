"use client";

import { useEffect, useRef, useState } from "react";
import { groups } from "@/data/studio";
import { ServiceAccordion } from "./Experience";
import { useStudioMotion } from "./motion";

const labels = ["SIGNALS, FINDING DIRECTION", "EVERY PAGE, REACHABLE", "GOOD CONTENT GROWS", "SEE WHAT MOVES THE NEEDLE", "ANSWERS, WITH EVIDENCE"];

export function SeoColumn() {
  const [active, setActive] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<import("./seo-runtime").SeoRuntime | null>(null);
  const enabled = useStudioMotion();
  const state = useRef({ active, enabled });
  useEffect(() => {
    state.current = { active, enabled };
    runtime.current?.update(active, enabled);
  }, [active, enabled]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      import("./seo-runtime").then(({ mountSeo }) => {
        if (cancelled) return;
        try {
          runtime.current = mountSeo(element);
          runtime.current.update(state.current.active, state.current.enabled);
        } catch { /* The sculptural SVG remains if WebGL is unavailable. */ }
      }).catch(() => {});
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); runtime.current?.dispose(); runtime.current = null; };
  }, []);
  const group = groups[2];
  return <article className="service-column seo-column">
    <div className="service-art service-art-03 automation-art seo-art" aria-hidden="true">
      <svg className="automation-fallback" viewBox="0 0 400 156"><defs><linearGradient id="seo-metal"><stop stopColor="#526343"/><stop offset=".5" stopColor="#d8dfb5"/><stop offset="1" stopColor="#81915f"/></linearGradient></defs><g fill="none" stroke="url(#seo-metal)" strokeWidth="6" strokeLinecap="round"><circle cx="193" cy="70" r="33"/><path d="m217 94 24 24m-61-39v-7m14 7V65m14 14V55"/></g></svg>
      <div ref={host} className="automation-canvas" />
      <span className="art-index">[03]</span>
      <span className="automation-caption">{labels[active === null ? 0 : active + 1]}</span>
    </div>
    <h3>{group.name}</h3><p>{group.caption}</p>
    <ServiceAccordion items={group.services} onActiveChange={setActive} />
  </article>;
}
