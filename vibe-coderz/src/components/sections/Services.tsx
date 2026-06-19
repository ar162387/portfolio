"use client";

import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";
import {
    ShoppingBag,
    Users,
    Server,
    Cpu,
    Database,
    Bot,
    Terminal,
} from "lucide-react";

const iconMap: Record<string, any> = {
    "shopping-bag": ShoppingBag,
    users: Users,
    server: Server,
    cpu: Cpu,
    database: Database,
    bot: Bot,
    default: Terminal,
};

function ServiceCard({ service }: { service: any }) {
    const Icon = iconMap[service.icon] || iconMap.default;

    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    return (
        <div
            data-reveal-child
            onMouseMove={onMove}
            className="glass glow-border spotlight group relative p-8 overflow-hidden transition-transform duration-300 hover:-translate-y-1"
        >
            <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-sky-500/20 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon size={26} className="text-white" />
                </div>
                <h3 className="text-xl font-bold font-space mb-3 text-text-1">{service.title}</h3>
                <p className="text-text-2 leading-relaxed">{service.description}</p>
            </div>
        </div>
    );
}

export function Services() {
    return (
        <SectionWrapper id="services">
            <div className="max-w-2xl mb-16" data-reveal-child>
                <span className="text-sm uppercase tracking-[0.3em] text-accent font-medium">
                    What we build
                </span>
                <h2 className="text-4xl md:text-6xl font-bold font-space mt-4 mb-6 text-text-1">
                    Systems that run your business
                </h2>
                <p className="text-text-2 text-lg">
                    From customer pipelines to autonomous agents, we design and ship the software
                    that moves the numbers that matter.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.services.map((service, index) => (
                    <ServiceCard key={index} service={service} />
                ))}
            </div>
        </SectionWrapper>
    );
}
