import { StudioExperience } from "@/components/studio/Experience";
import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import { Navigation } from "@/components/studio/Interactive";
import { Footer } from "@/components/studio/Shared";
import { studio } from "@/data/studio";
import { jsonLd } from "@/lib/seo";
export const metadata: Metadata = {
  metadataBase: new URL(studio.url),
  title: {
    default: "Vibecoderzz | Software, AI & Growth Studio",
    template: "%s | Vibecoderzz",
  },
  description:
    "Independent software studio in Lahore building custom software, AI automation, web and mobile apps, and search-ready digital experiences for businesses worldwide.",
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
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navigation />
        <StudioExperience />
        <main id="main">{children}</main>
        <Footer />
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
                addressLocality: "Lahore",
                addressCountry: "PK",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
