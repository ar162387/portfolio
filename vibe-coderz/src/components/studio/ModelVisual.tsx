"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useStudioMotion } from "./motion";
import type { mountModel } from "./model-runtime";

export type StudioModel = "gravity" | "principles";

export function ModelVisual({ model, className = "", paused = false, priority = false, stage = 0 }: {
  model: StudioModel;
  className?: string;
  paused?: boolean;
  priority?: boolean;
  stage?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<ReturnType<typeof mountModel> | null>(null);
  const enabled = useStudioMotion();
  const moving = enabled && !paused;
  const motion = useRef(moving);
  const currentStage = useRef(stage);
  const [loadedModel, setLoadedModel] = useState<StudioModel | null>(null);

  useEffect(() => {
    motion.current = moving;
    runtime.current?.setMotion(moving);
  }, [moving]);

  useEffect(() => {
    currentStage.current = stage;
    runtime.current?.setStage(stage);
  }, [stage]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    // Save-data users receive the Blender-rendered poster without the 3D bundle.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    let cancelled = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      import("./model-runtime").then(({ mountModel }) => {
        if (cancelled) return;
        try {
          runtime.current = mountModel(element, model, motion.current,
            () => { if (!cancelled) setLoadedModel(model); },
            () => { if (!cancelled) setLoadedModel(null); }, currentStage.current);
        } catch {
          // WebGL unavailable: leave the real rendered sculpture visible.
          element.replaceChildren();
        }
      }).catch(() => { /* The poster also covers a failed chunk download. */ });
    }, { rootMargin: "180px" });
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, [model]);

  return (
    <div className={`model-visual ${className}`} data-model={model} data-stage={stage} data-ready={loadedModel === model} aria-hidden="true">
      <Image className="model-poster" src={`/models/studio/${model === "principles" ? `principles-${stage}` : model}.webp`} alt="" fill sizes={priority ? "(max-width: 760px) 95vw, 50vw" : "(max-width: 760px) 90vw, 40vw"} preload={priority} />
      <div className="model-canvas" ref={host} />
    </div>
  );
}

export function HeroSculpture() {
  const [paused, setPaused] = useState(false);
  const enabled = useStudioMotion();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => element.classList.toggle("offscreen", !entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className={`orbit-art ${paused ? "paused" : ""}`} ref={root}>
      <div className="field-stars" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: `${(i * 43 + 7) % 96}%`, top: `${(i * 29 + 13) % 91}%`, "--star-delay": `${(i % 7) * -.9}s`, "--star-duration": `${5 + i % 4}s` } as CSSProperties} />)}
      </div>
      <div className="orbital-grid" aria-hidden="true" />
      <div className="orbit-axis axis-one" aria-hidden="true" />
      <div className="orbit-axis axis-two" aria-hidden="true" />
      <ModelVisual model="gravity" className="hero-orbit-model" priority paused={paused} />
      <span className="orbit-coordinate coordinate-top">VC / FIELD EXPERIMENT 001</span>
      <span className="orbit-coordinate coordinate-bottom">IDEAS HAVE GRAVITY.</span>
      <span className="orbit-cross cross-one" aria-hidden="true">+</span>
      <span className="orbit-cross cross-two" aria-hidden="true">+</span>
      <div className="orbit-caption"><span className="orange-dot" /> A little cosmic energy. A lot of engineering.</div>
      <button type="button" className="motion-toggle" disabled={!enabled} aria-label={paused ? "Play orbital animation" : "Pause orbital animation"} aria-pressed={paused} onClick={() => setPaused(!paused)}>
        {paused || !enabled ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
  );
}
