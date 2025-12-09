"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Github, Linkedin, Download } from "lucide-react";
import { content } from "@/data/content";
import { cn } from "@/lib/utils";

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Services", href: "#services" },
        { name: "Skills", href: "#skills" },
        { name: "Work", href: "#portfolio" },
        { name: "Contact", href: "#contact" },
    ];

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                isScrolled ? "bg-black/50 backdrop-blur-xl border-b border-white/5 py-4" : "py-6 bg-transparent"
            )}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-2xl font-bold font-space tracking-tight">
                    VIbe <span className="text-white/60">COderz</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}

                    <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                        {content.contact.social?.github && (
                            <Link
                                href={content.contact.social.github}
                                target="_blank"
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <Github size={20} />
                            </Link>
                        )}
                        {content.contact.social?.linkedin && (
                            <Link
                                href={content.contact.social.linkedin}
                                target="_blank"
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <Linkedin size={20} />
                            </Link>
                        )}
                        <a
                            href="/resume.pdf"
                            download
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-white/90 transition-colors"
                        >
                            <span>Resume</span>
                            <Download size={16} />
                        </a>
                    </div>
                </nav>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
                    >
                        <nav className="flex flex-col p-6 gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-lg font-medium text-white/80 hover:text-white"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}

                            <div className="flex items-center gap-4 py-4 border-t border-white/10 mt-2">
                                {content.contact.social?.github && (
                                    <Link
                                        href={content.contact.social.github}
                                        target="_blank"
                                        className="text-white/70 hover:text-white"
                                    >
                                        <Github size={24} />
                                    </Link>
                                )}
                                {content.contact.social?.linkedin && (
                                    <Link
                                        href={content.contact.social.linkedin}
                                        target="_blank"
                                        className="text-white/70 hover:text-white"
                                    >
                                        <Linkedin size={24} />
                                    </Link>
                                )}
                            </div>

                            <a
                                href="/resume.pdf"
                                download
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-medium bg-white text-black rounded-full"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span>Download Resume</span>
                                <Download size={18} />
                            </a>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
