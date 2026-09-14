"use client";

import { useEffect, useRef, useState } from "react";
import { groups } from "@/data/studio";
import { ServiceAccordion } from "./Experience";
import { useStudioMotion } from "./motion";

const labels = ["IDEAS, TAKING SHAPE", "BUILT FOR THE BROWSER", "EVERY PART, CONNECTED", "FROM BROWSE TO BAG", "ONE PRODUCT. EVERY SCREEN."];

export function DevelopmentColumn() {
  const [active, setActive] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<import("./development-runtime").DevelopmentRuntime | null>(null);
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
      import("./development-runtime").then(({ mountDevelopment }) => {
        if (cancelled) return;
        try {
          runtime.current = mountDevelopment(element);
          runtime.current.update(state.current.active, state.current.enabled);
        } catch { /* The sculptural SVG remains if WebGL is unavailable. */ }
      }).catch(() => {});
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); runtime.current?.dispose(); runtime.current = null; };
  }, []);
  const group = groups[1];
  return <article className="service-column development-column">
    <div className="service-art service-art-02 automation-art development-art" aria-hidden="true">
      <svg className="automation-fallback" viewBox="0 0 400 156"><defs><linearGradient id="development-metal"><stop stopColor="#6c6050"/><stop offset=".5" stopColor="#e2d8c5"/><stop offset="1" stopColor="#a2957f"/></linearGradient></defs><g transform="translate(200 78) rotate(-12)" fill="none" stroke="url(#development-metal)" strokeWidth="6" strokeLinejoin="round"><rect x="-40" y="-40" width="80" height="80" rx="10"/><path d="m-13-17-14 17 14 17m26-34 14 17-14 17"/></g></svg>
      <div ref={host} className="automation-canvas" />
      <span className="art-index">[02]</span>
      <span className="automation-caption">{labels[active === null ? 0 : active + 1]}</span>
    </div>
    <h3>{group.name}</h3><p>{group.caption}</p>
    <ServiceAccordion items={group.services} onActiveChange={setActive} />
  </article>;
}
