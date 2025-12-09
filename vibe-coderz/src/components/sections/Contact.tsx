"use client";

import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";
import { Mail, MapPin, Phone, Send } from "lucide-react";

export function Contact() {
    return (
        <SectionWrapper id="contact" className="pb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                <div>
                    <h2 className="text-4xl md:text-6xl font-bold font-space mb-6">Let&apos;s Work Together</h2>
                    <p className="text-white/60 text-lg mb-12">
                        Looking for something specific or want to collaborate? Feel free to reach out and let&apos;s build something amazing together!
                    </p>

                    <div className="space-y-8">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                <MapPin className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Address</h3>
                                <p className="text-white/60">{content.contact.address}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                <Phone className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Phone</h3>
                                <p className="text-white/60">{content.contact.phone}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                <Mail className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Email</h3>
                                <p className="text-white/60">{content.contact.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
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
                                placeholder="Tell me about your project..."
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
