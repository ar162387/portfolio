import { content } from "@/data/content";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-transparent border-t border-white/5 py-12">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-bold font-space text-white">
                        {content.brand.name}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">
                        {content.brand.tagline}
                    </p>
                </div>

                <div className="text-sm text-white/40">
                    &copy; {currentYear} {content.about.details.city}. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
