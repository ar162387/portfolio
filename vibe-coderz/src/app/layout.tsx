import { StudioExperience } from "@/components/studio/Experience";
import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import { Navigation } from "@/components/studio/Interactive";
import { Footer } from "@/components/studio/Shared";
import { studio } from "@/data/studio";
import { jsonLd } from "@/lib/seo";
import { Analytics } from "@/components/studio/Analytics";
import { VoiceAssistant } from "@/components/studio/VoiceAssistant";
export const metadata: Metadata = {
  metadataBase: new URL(studio.url),
  title: {
    default: "Vibecoderzz | Software, AI & Growth Studio",
    template: "%s | Vibecoderzz",
  },
  description:
    "Independent software studio in Central London building custom software, AI automation, web and mobile apps, and search-ready digital experiences for businesses worldwide.",
  openGraph: {
    type: "website",
    siteName: "Vibecoderzz",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var root=document.documentElement;var media=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;var saved;try{saved=localStorage.getItem("vibecoderzz-theme")}catch(e){}var choice=saved==="light"||saved==="dark"?saved:"system";root.dataset.themeChoice=choice;function sync(){root.dataset.theme=choice==="system"?(media&&media.matches?"dark":"light"):choice}sync();if(media){var changed=function(){if(root.dataset.themeChoice==="system")sync()};if(media.addEventListener)media.addEventListener("change",changed);else if(media.addListener)media.addListener(changed)}})()`,
          }}
        />
      </head>
      <body>
        <Analytics />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navigation />
        <StudioExperience />
        <main id="main">{children}</main>
        <Footer />
        {process.env.VOICE_AGENT_URL && <VoiceAssistant email={studio.email} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@type": "Organization",
              name: studio.name,
              url: studio.url,
              email: studio.email,
              description:
                "Independent software, AI automation, and digital growth studio.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Central London",
                addressCountry: "GB",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
