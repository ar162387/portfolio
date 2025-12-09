"use client";

import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";
import { Download, GraduationCap, Briefcase } from "lucide-react";

export function Resume() {
    return (
        <SectionWrapper id="resume">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-bold font-space mb-4">Experience & Education</h2>
                    <p className="text-white/60">My professional journey.</p>
                </div>
                <a
                    href="/resume"
                    target="_blank"
                    className="px-6 py-3 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:bg-white/90 transition-colors"
                >
                    <Download size={20} />
                    Download Resume (PDF)
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Experience */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3 text-xl font-bold border-b border-white/10 pb-4">
                        <Briefcase className="text-white/80" />
                        <h3>Professional Experience</h3>
                    </div>

                    <div className="relative border-l border-white/10 pl-8 ml-3 space-y-12">
                        {content.resume.experience.map((job, index) => (
                            <div key={index} className="relative">
                                <span className="absolute -left-[39px] top-1 w-5 h-5 rounded-full bg-black border-2 border-white/50" />
                                <span className="text-sm text-white/50 mb-1 block">{job.period}</span>
                                <h4 className="text-lg font-bold">{job.role}</h4>
                                <p className="text-white/80 text-sm mb-2">{job.company}</p>
                                <p className="text-white/60 text-sm leading-relaxed">{job.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Education */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3 text-xl font-bold border-b border-white/10 pb-4">
                        <GraduationCap className="text-white/80" />
                        <h3>Education</h3>
                    </div>

                    <div className="relative border-l border-white/10 pl-8 ml-3 space-y-12">
                        {content.resume.education.map((edu, index) => (
                            <div key={index} className="relative">
                                <span className="absolute -left-[39px] top-1 w-5 h-5 rounded-full bg-black border-2 border-white/50" />
                                <h4 className="text-lg font-bold">{edu.degree}</h4>
                                <p className="text-white/80 text-sm mb-2">{edu.institution}</p>
                                <p className="text-white/60 text-sm leading-relaxed">{edu.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SectionWrapper>
    );
}
