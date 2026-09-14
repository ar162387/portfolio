"use client";

import { useEffect, useRef, useState } from "react";
import { groups } from "@/data/studio";
import { ServiceAccordion } from "./Experience";
import { useStudioMotion } from "./motion";

const labels = ["INTELLIGENCE, IN MOTION", "REPEAT. REFINE. REPEAT.", "KNOWLEDGE, CONNECTED", "A SIGNAL WITH INTENT", "ALWAYS IN CONVERSATION"];

export function AutomationColumn() {
  const [active, setActive] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<import("./automation-runtime").AutomationRuntime | null>(null);
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
      import("./automation-runtime").then(({ mountAutomation }) => {
        if (cancelled) return;
        try {
          runtime.current = mountAutomation(element);
          runtime.current.update(state.current.active, state.current.enabled);
        } catch { /* The sculptural SVG remains if WebGL is unavailable. */ }
      }).catch(() => {});
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); runtime.current?.dispose(); runtime.current = null; };
  }, []);
  const group = groups[0];
  return <article className="service-column automation-column">
    <div className="service-art service-art-01 automation-art" aria-hidden="true">
      <svg className="automation-fallback" viewBox="0 0 400 156"><defs><linearGradient id="ribbon-metal"><stop stopColor="#39442e"/><stop offset=".4" stopColor="#b5bd9b"/><stop offset=".55" stopColor="#f4f4df"/><stop offset="1" stopColor="#66744c"/></linearGradient></defs><path d="M200 78C110-10 65 138 141 120S253 8 283 51S244 161 200 78Z" fill="none" stroke="url(#ribbon-metal)" strokeWidth="15"/></svg>
      <div ref={host} className="automation-canvas" />
      <span className="art-index">[01]</span>
      <span className="automation-caption">{labels[active === null ? 0 : active + 1]}</span>
    </div>
    <h3>{group.name}</h3><p>{group.caption}</p>
    <ServiceAccordion items={group.services} onActiveChange={setActive} />
  </article>;
}
