"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
    children: React.ReactNode;
    id?: string;
    className?: string;
    delay?: number;
}

export function SectionWrapper({ children, id, className, delay = 0 }: SectionWrapperProps) {
    return (
        <motion.section
            id={id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay, ease: "easeOut" }}
            className={cn("py-20 md:py-32 container mx-auto px-4", className)}
        >
            {children}
        </motion.section>
    );
}
