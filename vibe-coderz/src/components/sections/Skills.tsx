"use client";

import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { content } from "@/data/content";

export function Skills() {
    return (
        <SectionWrapper id="skills" className="bg-white/5">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold font-space mb-6">Technical Arsenal</h2>
                <p className="text-white/60 max-w-2xl mx-auto">
                    Continuously evolving with the latest technologies.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {Object.entries(content.skills).map(([category, skills]) => (
                    <div key={category} className="space-y-4">
                        <h3 className="text-xl font-bold capitalize text-white/90 border-b border-white/10 pb-2">
                            {category}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill) => (
                                <span
                                    key={skill.name}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    {skill.icon && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={`https://skillicons.dev/icons?i=${skill.icon}`}
                                            alt={`${skill.name} icon`}
                                            className="w-5 h-5"
                                        />
                                    )}
                                    {skill.name}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}
