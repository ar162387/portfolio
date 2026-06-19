"use client";

import { cn } from "@/lib/utils";
import { useGsapReveal } from "@/lib/scroll";

interface SectionWrapperProps {
    children: React.ReactNode;
    id?: string;
    className?: string;
    /** stagger children that carry `data-reveal-child` */
    stagger?: number;
}

/**
 * Scroll-linked section. Direct descendants marked with `data-reveal-child`
 * animate in with a stagger as the section enters; otherwise the whole block
 * reveals. Honors prefers-reduced-motion via useGsapReveal.
 */
export function SectionWrapper({ children, id, className, stagger }: SectionWrapperProps) {
    const ref = useGsapReveal<HTMLElement>({ stagger });

    return (
        <section
            id={id}
            ref={ref}
            className={cn("py-24 md:py-36 container mx-auto px-4 relative", className)}
        >
            {children}
        </section>
    );
}
