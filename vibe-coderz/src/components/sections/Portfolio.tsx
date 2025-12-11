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
                <h2 className="text-3xl md:text-5xl font-bold font-space mb-6">Selected Works</h2>

                {/* Filter */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                filter === cat
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
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
