"use client";

import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";
import { Smartphone, Database, Book, Bot, Layout, Terminal } from "lucide-react";

const iconMap: Record<string, any> = {
    smartphone: Smartphone,
    database: Database,
    book: Book,
    bot: Bot,
    layout: Layout,
    default: Terminal
};

export function Services() {
    return (
        <SectionWrapper id="services">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold font-space mb-6">Services</h2>
                <p className="text-white/60 max-w-2xl mx-auto">
                    I provide comprehensive digital solutions tailored to your needs.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.services.map((service, index) => {
                    const Icon = iconMap[service.icon] || iconMap.default;

                    return (
                        <div
                            key={index}
                            className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Icon size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                            <p className="text-white/60 leading-relaxed">
                                {service.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </SectionWrapper>
    );
}
