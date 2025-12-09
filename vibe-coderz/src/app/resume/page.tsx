"use client";

import { useEffect } from "react";
import { content } from "@/data/content";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

export default function ResumePage() {
    useEffect(() => {
        // Auto-print when opened
        setTimeout(() => {
            window.print();
        }, 1000);
    }, []);

    return (
        <div className="min-h-screen bg-white text-black p-[50px] max-w-[210mm] mx-auto print:max-w-none print:p-0">
            {/* Header */}
            <header className="border-b-2 border-black pb-8 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold uppercase tracking-tight mb-2">{content.hero.title.replace("We Build", "Shah Abdur")}</h1>
                    <p className="text-lg text-gray-600 font-medium">Full Stack Developer & Automation Engineer</p>
                </div>
                <div className="text-right text-sm space-y-1">
                    <div className="flex items-center justify-end gap-2">
                        <span>{content.contact.email}</span>
                        <Mail size={14} />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <span>{content.contact.phone}</span>
                        <Phone size={14} />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <span>{content.contact.address}</span>
                        <MapPin size={14} />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-3 gap-8">
                {/* Left Column (Skills, Contact, etc) */}
                <div className="col-span-1 space-y-8">
                    <section>
                        <h3 className="text-lg font-bold uppercase border-b border-gray-300 pb-2 mb-4">Skills</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-sm mb-2">Languages</h4>
                                <p className="text-sm leading-relaxed text-gray-700">{content.skills.languages.join(", ")}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm mb-2">Frameworks</h4>
                                <p className="text-sm leading-relaxed text-gray-700">{content.skills.frameworks.join(", ")}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm mb-2">Tools</h4>
                                <p className="text-sm leading-relaxed text-gray-700">{content.skills.tools.join(", ")}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold uppercase border-b border-gray-300 pb-2 mb-4">Education</h3>
                        <div className="space-y-4">
                            {content.resume.education.map((edu, i) => (
                                <div key={i}>
                                    <h4 className="font-bold text-sm">{edu.degree}</h4>
                                    <p className="text-xs text-gray-600 mb-1">{edu.institution}</p>
                                    <p className="text-xs text-gray-500 italic">{edu.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column (Experience, Projects) */}
                <div className="col-span-2 space-y-8">
                    <section>
                        <h3 className="text-lg font-bold uppercase border-b border-gray-300 pb-2 mb-4">Profile</h3>
                        <p className="text-sm leading-relaxed text-gray-800">
                            {content.resume.summary}
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold uppercase border-b border-gray-300 pb-2 mb-4">Experience</h3>
                        <div className="space-y-6">
                            {content.resume.experience.map((job, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="font-bold text-md">{job.role}</h4>
                                        <span className="text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded">{job.period}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">{job.company}</p>
                                    <p className="text-sm text-gray-600 leading-relaxed">{job.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold uppercase border-b border-gray-300 pb-2 mb-4">Key Projects</h3>
                        <div className="space-y-4">
                            {content.portfolio.slice(0, 3).map((proj, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="font-bold text-sm">{proj.title}</h4>
                                        <span className="text-xs text-gray-500">{proj.category}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">Tech: {proj.tech}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* Print Instructions Only Visible on Screen */}
            <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg print:hidden text-sm">
                Press Ctrl+P / Cmd+P to save as PDF
            </div>
        </div>
    );
}
