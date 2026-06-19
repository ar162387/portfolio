"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register GSAP plugins exactly once (safe to call from any client component). */
export function registerGsap() {
    if (registered || typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
}

/** True when the user has asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True for narrow viewports where we degrade heavy effects. */
export function isMobileViewport(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
}

interface RevealOptions {
    /** translateY start in px */
    y?: number;
    /** stagger between direct children with [data-reveal-child] */
    stagger?: number;
    /** start position for ScrollTrigger */
    start?: string;
    /** delay before animating */
    delay?: number;
    duration?: number;
}

/**
 * Scroll-linked reveal for a section. Returns a ref to attach to the container.
 * Children marked with `data-reveal-child` are staggered; otherwise the whole
 * element fades/translates in. Falls back to an instant show when reduced motion.
 */
export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(
    options: RevealOptions = {}
) {
    const ref = useRef<T>(null);
    const { y = 48, stagger = 0.12, start = "top 80%", delay = 0, duration = 0.9 } = options;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        registerGsap();

        if (prefersReducedMotion()) {
            gsap.set(el, { opacity: 1, y: 0 });
            const kids = el.querySelectorAll<HTMLElement>("[data-reveal-child]");
            gsap.set(kids, { opacity: 1, y: 0 });
            return;
        }

        const ctx = gsap.context(() => {
            const kids = el.querySelectorAll<HTMLElement>("[data-reveal-child]");
            const targets = kids.length > 0 ? kids : [el];

            gsap.set(targets, { opacity: 0, y });

            gsap.to(targets, {
                opacity: 1,
                y: 0,
                duration,
                delay,
                ease: "power3.out",
                stagger: kids.length > 0 ? stagger : 0,
                scrollTrigger: {
                    trigger: el,
                    start,
                    toggleActions: "play none none none",
                },
            });
        }, el);

        return () => ctx.revert();
    }, [y, stagger, start, delay, duration]);

    return ref;
}

export { gsap, ScrollTrigger };
