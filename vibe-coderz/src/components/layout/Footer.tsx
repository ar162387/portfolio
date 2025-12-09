import { content } from "@/data/content";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-black border-t border-white/5 py-12">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-bold font-space text-white">
                        {content.brand.name}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">
                        {content.brand.tagline}
                    </p>
                </div>

                <div className="flex items-center gap-6 text-sm text-white/50">
                    {content.contact.social?.github && (
                        <a href={content.contact.social.github} target="_blank" className="hover:text-white transition-colors">GitHub</a>
                    )}
                    {content.contact.social?.linkedin && (
                        <a href={content.contact.social.linkedin} target="_blank" className="hover:text-white transition-colors">LinkedIn</a>
                    )}
                </div>

                <div className="text-sm text-white/40">
                    &copy; {currentYear} {content.about.details.city}. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
