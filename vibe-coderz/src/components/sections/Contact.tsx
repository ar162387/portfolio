"use client";

import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";
import { Mail, MapPin, Phone, Send } from "lucide-react";

export function Contact() {
    return (
        <SectionWrapper id="contact" className="pb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                <div data-reveal-child>
                    <span className="text-sm uppercase tracking-[0.3em] text-accent font-medium">
                        Start a project
                    </span>
                    <h2 className="text-4xl md:text-6xl font-bold font-space mt-4 mb-6 text-text-1">Let&apos;s build it together</h2>
                    <p className="text-text-2 text-lg mb-12">
                        Tell us what you&apos;re trying to automate, streamline, or scale. We&apos;ll get back to you with a clear path forward.
                    </p>

                    <div className="space-y-8">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full glass flex items-center justify-center shrink-0">
                                <MapPin className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-text-1">Based in</h3>
                                <p className="text-text-2">{content.contact.location}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full glass flex items-center justify-center shrink-0">
                                <Phone className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-text-1">Phone</h3>
                                <p className="text-text-2">{content.contact.phone}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full glass flex items-center justify-center shrink-0">
                                <Mail className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1 text-text-1">Email</h3>
                                <p className="text-text-2">{content.contact.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-strong glass p-8" data-reveal-child>
                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="Your name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Subject</label>
                            <input
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                                placeholder="Project inquiry"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Message</label>
                            <textarea
                                rows={4}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors resize-none"
                                placeholder="Tell us about your project..."
                            />
                        </div>

                        <button className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                            Send Message
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </SectionWrapper>
    );
}
