"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";
import { cn } from "@/lib/utils";
import { ExternalLink, Github } from "lucide-react";

const categories = ["All", "Web", "Mobile", "Game"];

export function Portfolio() {
    const [filter, setFilter] = useState("All");

    const filteredProjects = content.portfolio.filter(
        (project) => filter === "All" || project.category === filter
    );

    return (
        <SectionWrapper id="portfolio">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold font-space mb-6">Selected Works</h2>

                {/* Filter */}
                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                                filter === cat
                                    ? "bg-white text-black"
                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {filteredProjects.map((project) => (
                        <motion.div
                            key={project.title}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-white/5 border border-white/10"
                        >
                            <Image
                                src={project.image}
                                alt={project.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-6 text-center">
                                <h3 className="text-2xl font-bold font-space mb-2">{project.title}</h3>
                                <span className="text-sm font-medium text-white/70 mb-4 px-3 py-1 rounded-full bg-white/10">
                                    {project.category}
                                </span>
                                <p className="text-sm text-white/60 mb-6">{project.tech}</p>
                                <div className="flex gap-4">
                                    <button className="p-3 rounded-full bg-white text-black hover:scale-110 transition-transform">
                                        <ExternalLink size={20} />
                                    </button>
                                    <button className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 hover:scale-110 transition-transform">
                                        <Github size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </SectionWrapper>
    );
}
