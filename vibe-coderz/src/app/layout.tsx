import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { CursorEffect } from "@/components/ui/CursorEffect";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Vibe Coderzz | AI Agents, CRMs & Automation Studio",
  description:
    "Vibe Coderzz is a software studio building CRMs, management systems, autonomous AI agents, and workflow automation that drive measurable business growth.",
  keywords: [
    "AI agents",
    "automation",
    "CRM development",
    "ERP systems",
    "RAG systems",
    "custom software studio",
  ],
  openGraph: {
    title: "Vibe Coderzz | AI Agents, CRMs & Automation Studio",
    description:
      "We design and build CRMs, management systems, autonomous AI agents, and automation for modern businesses.",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/favicon.ico" },
    ],
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Note: We can't use useState/Hooks here in a Server Component layout.
  // We need to wrap the body content or insert the Background3D component.
  // Since Background3D relies on useScroll which needs a scroll container context possibly, 
  // but framer-motion useScroll works with window by default.

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-transparent text-foreground cursor-none`}>
        <CursorEffect />

        {/* Film grain overlay — sits above the 3D background, below content */}
        <div className="grain-overlay" aria-hidden="true" />

        {children}
      </body>
    </html>
  );
}
