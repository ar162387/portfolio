"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";
import { cn } from "@/lib/utils";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { ProjectModal } from "@/components/portfolio/ProjectModal";

const categories = ["All", "Web", "Mobile", "Game", "AI"];

export function Portfolio() {
    const [filter, setFilter] = useState("All");
    const [selectedProject, setSelectedProject] = useState<any>(null);

    const filteredProjects = content.portfolio.filter((project) => {
        if (filter === "All") return true;
        // Check if tags array includes the filter
        return project.tags?.includes(filter);
    });

    return (
        <SectionWrapper id="portfolio">
            <div className="text-center mb-12">
                <span className="text-sm uppercase tracking-[0.3em] text-accent font-medium">
                    Selected work
                </span>
                <h2 className="text-4xl md:text-6xl font-bold font-space mt-4 mb-4 text-text-1">
                    Shipped, in production
                </h2>
                <p className="text-text-2 max-w-xl mx-auto mb-10">
                    Real platforms we&apos;ve designed and built — from CRMs to location-aware mobile ecosystems.
                </p>

                {/* Filter */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                filter === cat
                                    ? "bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                                    : "glass text-text-2 hover:text-white"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            >
                <AnimatePresence mode="popLayout">
                    {filteredProjects.map((project, index) => (
                        <ProjectCard
                            key={project.title}
                            project={project}
                            onClick={() => setSelectedProject(project)}
                            index={index}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            <ProjectModal
                project={selectedProject}
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
            />
        </SectionWrapper>
    );
}
