"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { content } from "@/data/content";
import { registerGsap, gsap, prefersReducedMotion } from "@/lib/scroll";

export function Hero() {
    const sectionRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (prefersReducedMotion()) return;
        registerGsap();
        const ctx = gsap.context(() => {
            // Parallax the hero content out as the user scrolls past it
            gsap.to(contentRef.current, {
                y: -120,
                opacity: 0,
                filter: "blur(6px)",
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: true,
                },
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
        >
            {/* Soft aura behind the content */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[820px] h-[420px] bg-violet-700/20 blur-[140px] rounded-full" />
                <div className="absolute bottom-10 right-0 w-[600px] h-[600px] bg-sky-700/10 blur-[120px] rounded-full" />
            </div>

            <div ref={contentRef} className="container relative z-10 px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full glass text-sm font-medium text-text-2"
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]" />
                    {content.brand.tagline}
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.85, delay: 0.15, ease: "easeOut" }}
                    className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold font-space leading-[0.98] mb-6"
                >
                    <span className="block text-text-1">{content.hero.titleLine1}</span>
                    <span className="block text-gradient">{content.hero.titleLine2}</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.85, delay: 0.3, ease: "easeOut" }}
                    className="text-lg md:text-xl text-text-2 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    {content.hero.description}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.85, delay: 0.45, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <a
                        href="#portfolio"
                        className="group px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-[1.03] hover:shadow-[0_0_40px_-8px_rgba(255,255,255,0.6)] transition-all flex items-center gap-2"
                    >
                        {content.hero.ctaPrimary}
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a
                        href="#contact"
                        className="px-8 py-4 rounded-full glass glow-border text-lg font-medium text-text-1"
                    >
                        {content.hero.ctaSecondary}
                    </a>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-4"
            >
                <span className="text-xs uppercase tracking-[0.3em]">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent" />
            </motion.div>
        </section>
    );
}
