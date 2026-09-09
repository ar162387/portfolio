import { StudioExperience } from "@/components/studio/Experience";
import type { Metadata } from "next";
import Script from "next/script";
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
    <html lang="en">
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-F2ZSD4EL60"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-F2ZSD4EL60');`}
        </Script>
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
