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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-300 cursor-pointer h-full flex flex-col"
            onClick={onClick}
        >
            {/* Image Container */}
            <div className="relative h-48 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <ArrowUpRight size={16} className="text-white" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
                <div className="mb-2">
                    <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                        {project.category}
                    </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {project.title}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                    {project.brief || project.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                    {project.tags?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
