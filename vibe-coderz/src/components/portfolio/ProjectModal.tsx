import { motion, AnimatePresence } from "framer-motion";
import { X, Github, ExternalLink, Code2, Layers, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

interface ProjectModalProps {
    project: any;
    isOpen: boolean;
    onClose: () => void;
}

export function ProjectModal({ project, isOpen, onClose }: ProjectModalProps) {
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Prevent body scroll when modal is open and reset states
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setActiveImage(null);
            setIsFullScreen(false);
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Handle keyboard navigation for full screen
    useEffect(() => {
        if (!isFullScreen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "Escape") setIsFullScreen(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullScreen, activeImage, project]);

    if (!project) return null;

    const images = project.screenshots && project.screenshots.length > 0
        ? project.screenshots
        : [project.image];

    const currentImage = activeImage || project.image;
    const currentIndex = images.indexOf(currentImage) !== -1 ? images.indexOf(currentImage) : 0;

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const nextIndex = (currentIndex + 1) % images.length;
        setActiveImage(images[nextIndex]);
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        setActiveImage(images[prevIndex]);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
                    >
                        <div className="min-h-screen px-4 text-center">
                            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>

                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-[#1e1e1e] border border-white/10 shadow-2xl rounded-2xl relative"
                            >
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors z-10"
                                >
                                    <X size={20} />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Image Section */}
                                    <div className="space-y-4">
                                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 group bg-black/50">
                                            <Image
                                                src={currentImage}
                                                alt={project.title}
                                                fill
                                                className="object-contain"
                                            />
                                            {/* Expand Button */}
                                            <button
                                                onClick={() => setIsFullScreen(true)}
                                                className="absolute bottom-4 right-4 p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                                title="View Fullscreen"
                                            >
                                                <Maximize2 size={20} />
                                            </button>
                                        </div>
                                        {/* Screenshot Gallery */}
                                        {images.length > 0 && (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {images.map((shot: string, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActiveImage(shot)}
                                                        className={`relative aspect-video rounded-lg overflow-hidden border transition-all ${currentImage === shot ? 'border-blue-500 ring-1 ring-blue-500' : 'border-white/5 hover:border-white/30'}`}
                                                    >
                                                        <Image src={shot} alt={`Screenshot ${idx + 1}`} fill className="object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Links for Mobile */}
                                        <div className="flex gap-3 md:hidden">
                                            {project.links?.github && (
                                                <a
                                                    href={project.links.github}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors font-medium text-sm"
                                                >
                                                    <Github size={18} /> Code
                                                </a>
                                            )}
                                            {project.links?.live && (
                                                <a
                                                    href={project.links.live}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium text-sm text-white"
                                                >
                                                    <ExternalLink size={18} /> Live Demo
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
                                                {project.title}
                                            </h2>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {project.tags?.map((tag: string) => (
                                                    <span key={tag} className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-gray-300 leading-relaxed text-base">
                                                {project.description}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wider">
                                                    <Code2 size={16} className="text-purple-400" /> Tech Stack
                                                </h3>
                                                <p className="text-gray-400 text-sm">
                                                    {project.tech}
                                                </p>
                                            </div>

                                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wider">
                                                    <Layers size={16} className="text-green-400" /> My Role
                                                </h3>
                                                <p className="text-gray-400 text-sm">
                                                    {project.role}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Links for Desktop */}
                                        <div className="hidden md:flex gap-4 pt-2">
                                            {project.links?.github && (
                                                <a
                                                    href={project.links.github}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all hover:scale-105 font-medium"
                                                >
                                                    <Github size={20} /> View Code
                                                </a>
                                            )}
                                            {project.links?.live && (
                                                <a
                                                    href={project.links.live}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all hover:scale-105 font-medium shadow-lg shadow-blue-500/20"
                                                >
                                                    <ExternalLink size={20} /> Live Demo
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Full Screen Gallery Overlay */}
                    <AnimatePresence>
                        {isFullScreen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
                                onClick={() => setIsFullScreen(false)}
                            >
                                <button
                                    onClick={() => setIsFullScreen(false)}
                                    className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50"
                                >
                                    <X size={24} />
                                </button>

                                {/* Navigation Arrows */}
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50 md:left-8"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50 md:right-8"
                                >
                                    <ChevronRight size={32} />
                                </button>

                                {/* Main Full Screen Image */}
                                <div
                                    className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Image
                                        src={currentImage}
                                        alt={project.title}
                                        fill
                                        className="object-contain"
                                        quality={100}
                                        priority
                                    />

                                    {/* Image Counter */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white rounded-full text-sm backdrop-blur-sm">
                                        {currentIndex + 1} / {images.length}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
