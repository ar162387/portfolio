import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
// import { Background3D } from "@/components/3d/Background3D"; // Client component needed

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "VIbe COderz | Experience the Vibe of Code",
  description: "Portfolio of Shah Abdur Rehman - Full Stack Developer",
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
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-transparent text-foreground`}>
        {/* 
            Background 3D Canvas
            It is fixed and sits behind everything.
            We render it here so it persists across pages if we had multiple.
            We need a wrapper for it since it is a client component.
        */}
        <div className="fixed inset-0 z-[-1] pointer-events-none">
          {/* We will load this lazily or in page.tsx to avoid SSR issues if complex */}
        </div>

        {children}
      </body>
    </html>
  );
}
