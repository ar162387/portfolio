"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

interface ProjectCardProps {
    project: any;
    onClick: () => void;
    index: number;
}

export function ProjectCard({ project, onClick, index }: ProjectCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            onClick={onClick}
            className="group glass relative overflow-hidden cursor-pointer h-full flex flex-col hover:-translate-y-1.5 transition-transform duration-400"
        >
            {/* Media */}
            <div className="relative h-60 w-full overflow-hidden">
                <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Cinematic scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                {/* Category chip */}
                <span className="absolute top-4 left-4 z-20 text-[11px] font-medium uppercase tracking-wider px-3 py-1 rounded-full glass text-text-1">
                    {project.category}
                </span>

                {/* Open affordance */}
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <div className="w-9 h-9 rounded-full glass-strong flex items-center justify-center">
                        <ArrowUpRight size={16} className="text-white" />
                    </div>
                </div>

                {/* Title sits over the media */}
                <h3 className="absolute bottom-4 left-5 right-5 z-20 text-2xl font-bold font-space text-white">
                    {project.title}
                </h3>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 flex flex-col">
                <p className="text-text-2 text-sm line-clamp-2 mb-4 flex-1">
                    {project.brief || project.description}
                </p>

                {/* Role/tech revealed on hover */}
                <div className="overflow-hidden">
                    <p className="text-xs text-text-3 mb-3 max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 transition-all duration-400">
                        <span className="text-accent">{project.role}</span> · {project.tech}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-auto">
                    {project.tags?.slice(0, 3).map((tag: string) => (
                        <span
                            key={tag}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-text-3 border border-white/10"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
