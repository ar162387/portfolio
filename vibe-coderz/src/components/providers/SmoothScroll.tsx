"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { registerGsap, gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/scroll";

/**
 * Initializes Lenis smooth scrolling and binds it to GSAP's ticker + ScrollTrigger
 * so the whole site shares a single scroll source. Skipped entirely when the user
 * prefers reduced motion (native scrolling is used instead).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        registerGsap();

        if (prefersReducedMotion()) {
            return;
        }

        const lenis = new Lenis({
            duration: 1.1,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            touchMultiplier: 1.5,
        });

        lenis.on("scroll", ScrollTrigger.update);

        const onTick = (time: number) => {
            // gsap ticker passes seconds; Lenis wants ms
            lenis.raf(time * 1000);
        };
        gsap.ticker.add(onTick);
        gsap.ticker.lagSmoothing(0);

        // Expose for components that want raw progress without a React subscription
        (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

        return () => {
            gsap.ticker.remove(onTick);
            lenis.destroy();
            delete (window as unknown as { __lenis?: Lenis }).__lenis;
        };
    }, []);

    return <>{children}</>;
}
